import * as acorn from 'acorn';
import * as typescript from 'typescript';
import * as util from './util';
import { type RawSourceMap, SourceMapConsumer } from 'source-map-js';
import PositionConverter from './PositionConverter';
import getUndefinedVariables from './undefined-variables';

const compilerOptions = {
  module: typescript.ModuleKind.ESNext,
  target: typescript.ScriptTarget.ESNext,
  jsx: typescript.JsxEmit.React,
  strict: true,
  //noUncheckedIndexedAccess: true,
  inlineSourceMap: true,
  //allowJs: true,
  //checkJs: true,
  //allowImportingTsExtensions: true,
  experimentalDecorators: true,
} as const;

const acornOptions = { ecmaVersion: 'latest', sourceType: 'module' } as const;

const globalVars = new Set(Object.getOwnPropertyNames(window));

function getSourceMap(jsCode: string) {
  const rawSourceMap = JSON.parse(
    atob(jsCode.slice(jsCode.lastIndexOf(',') + 1)),
  ) as RawSourceMap;
  return new SourceMapConsumer(rawSourceMap);
}

function createVarList(
  jsCode: string,
  tsCode: string,
  nodeMap: Map<string, acorn.Node[]>,
) {
  const smc = getSourceMap(jsCode);
  const jsPos = new PositionConverter(jsCode);
  const tsPos = new PositionConverter(tsCode);
  const jsPosToTsPos = (pos: number) =>
    tsPos.toIndex(smc.originalPositionFor(jsPos.toLineColumn(pos)));
  return [...nodeMap.values()]
    .flat()
    .map((item) => ({
      start: jsPosToTsPos(item.start),
      end: jsPosToTsPos(item.end),
    }))
    .sort((item1, item2) => item2.start - item1.start);
}

function addHighLightTags(
  tsCode: string,
  varList: { start: number; end: number }[],
) {
  const openTag = '\0_open_highlight_tag_\0';
  const closeTag = '\0_close_highlight_tag_\0';

  const replaceTag = (source: string, start: number, end: number) =>
    `${source.slice(0, start)}${openTag}${source.slice(start, end)}${closeTag}${source.slice(end)}`;

  let html = varList.reduce(
    (code, item) => replaceTag(code, item.start, item.end),
    tsCode,
  );

  html = util
    .escapeHTML(html)
    .replaceAll(openTag, '<span class="highlight">')
    .replaceAll(closeTag, '</span>');

  return html;
}

export function parse(tsCode: string) {
  const jsCode = typescript.transpile(tsCode, compilerOptions);
  const acornNode = acorn.parse(jsCode, acornOptions);

  const result = getUndefinedVariables(acornNode);

  const group: [global: string[], undefs: string[]] = [[], []];
  for (const [name, nodes] of result) {
    const index = globalVars.has(name) ? 0 : 1;
    group[index].push(
      `${name}${nodes.length > 1 ? `<span class="times"> x${nodes.length}</span>` : ''}`,
    );
  }
  const [global, undefs] = group;

  const varList = createVarList(jsCode, tsCode, result);
  const hightLightHtml = addHighLightTags(tsCode, varList);

  return [global.join(', '), undefs.join(', '), hightLightHtml] as const;
}

export default parse;
