import './style.css';
import * as cs from './cursor-selection';
import * as el from './assets/el';
import * as util from './util.ts';

const editor = el.text(
  '{\n  var a = 1;\n  let b: number = 2;\n}\nconsole.log(a, b);',
  'content-editable input-area',
);
editor.contentEditable = 'plaintext-only';
editor.spellcheck = false;

const globalOutputArea = el.container('content-editable');
const undefOutputArea = el.container('content-editable');

el.append(document.body, [
  el.container('app'),
  [
    el.text('入力:'),
    editor,
    el.text('グローバル変数リスト:'),
    globalOutputArea,
    el.text('未定義変数リスト:'),
    undefOutputArea,
  ],
]);
editor.focus();

const errorHandler = el.createSafeErrorHandler((error) => {
  console.error(error);
  const message = util.escapeHTML(
    error instanceof Error ? `${error.name}: ${error.message}` : String(error),
  );
  globalOutputArea.innerHTML = `<span class="error">${message}</span>`;
  undefOutputArea.textContent = null;
});

errorHandler(async () => {
  const parser = await import('./parser.ts');

  const parse = () => {
    const range = cs.saveSelection(editor);
    [globalOutputArea.innerHTML, undefOutputArea.innerHTML, editor.innerHTML] =
      parser.parse(editor.innerText);
    if (range) cs.restoreSelection(editor, range);
  };

  let timer: number | null = null;
  editor.oninput = errorHandler(() => {
    if (timer != null) clearTimeout(timer);
    timer = setTimeout(
      errorHandler(() => {
        timer = null;
        parse();
      }),
      500,
    );
  });

  parse();
})();
