import type * as acorn from 'acorn';

const DECLARATION_TARGET_NONE = 0;
const DECLARATION_TARGET_FUNCTION = 1;
const DECLARATION_TARGET_BLOCK = 2;

type DeclarationTarget =
  | typeof DECLARATION_TARGET_NONE
  | typeof DECLARATION_TARGET_FUNCTION
  | typeof DECLARATION_TARGET_BLOCK;

class Scope {
  private declarations: Set<string> = new Set<string>();
  private identifiers = new Map<string, acorn.Node[]>();

  addDec(name: string): void {
    this.declarations.add(name);
  }

  addId(name: string, nodes: acorn.Node[]): void {
    const ids = this.identifiers.get(name) ?? [];
    this.identifiers.set(name, [...ids, ...nodes]);
  }

  negate(): Map<string, acorn.Node[]> {
    for (const dec of this.declarations) {
      this.identifiers.delete(dec);
    }
    return this.identifiers;
  }

  merge(childScope: Scope): void {
    for (const [name, nodes] of childScope.negate()) {
      this.addId(name, nodes);
    }
  }
}

/* eslint-disable-next-line max-lines-per-function, max-statements, complexity */
function parseNode(
  _node: unknown,
  functionScope: Scope,
  blockScope: Scope,
  target: DeclarationTarget,
): void {
  if (typeof _node !== 'object' || _node == null) return;
  if (Array.isArray(_node)) {
    for (const node of _node as unknown[]) {
      parseNode(node, functionScope, blockScope, target);
    }
    return;
  }
  const node = _node as acorn.Node & Record<string, unknown>;
  const { type } = node;
  if (type === 'Identifier') {
    const name = node.name as string;
    if (target === DECLARATION_TARGET_FUNCTION) {
      functionScope.addDec(name);
    } else if (target === DECLARATION_TARGET_BLOCK) {
      blockScope.addDec(name);
    } else {
      blockScope.addId(name, [node]);
    }
  } else if (type === 'VariableDeclaration') {
    // var, let, const
    const newTarget =
      node.kind === 'var'
        ? DECLARATION_TARGET_FUNCTION
        : DECLARATION_TARGET_BLOCK;
    parseNode(node.declarations, functionScope, blockScope, newTarget);
  } else if (type === 'VariableDeclarator') {
    // var, let, const
    parseNode(node.id, functionScope, blockScope, target);
    parseNode(node.init, functionScope, blockScope, DECLARATION_TARGET_NONE);
  } else if (type === 'ArrayPattern') {
    // [a], var [a]
    parseNode(node.elements, functionScope, blockScope, target);
  } else if (type === 'ObjectPattern') {
    // { a }, var { a }
    parseNode(node.properties, functionScope, blockScope, target);
  } else if (
    type === 'FunctionDeclaration' ||
    type === 'FunctionExpression' ||
    type === 'ArrowFunctionExpression'
  ) {
    const newScope = new Scope();
    if (type !== 'ArrowFunctionExpression') {
      newScope.addDec('arguments');
      if (type === 'FunctionDeclaration') {
        // 関数宣言の名前は外側スコープ
        parseNode(node.id, functionScope, blockScope, DECLARATION_TARGET_BLOCK);
      } else {
        // 関数式の名前は内側スコープ
        parseNode(node.id, newScope, newScope, DECLARATION_TARGET_BLOCK);
      }
    }
    parseNode(node.params, newScope, newScope, DECLARATION_TARGET_BLOCK);
    parseNode(node.body, newScope, newScope, DECLARATION_TARGET_NONE);
    blockScope.merge(newScope);
  } else if (
    type === 'Program' ||
    type === 'BlockStatement' ||
    type === 'ForStatement' ||
    type === 'ForInStatement' ||
    type === 'ForOfStatement'
  ) {
    // {} block, for
    const newScope = new Scope();
    for (const child of Object.values(node)) {
      parseNode(child, functionScope, newScope, target);
    }
    blockScope.merge(newScope);
  } else if (type === 'SwitchStatement') {
    parseNode(
      node.discriminant,
      functionScope,
      blockScope,
      DECLARATION_TARGET_NONE,
    );
    const newScope = new Scope();
    parseNode(node.cases, functionScope, newScope, DECLARATION_TARGET_NONE);
    blockScope.merge(newScope);
  } else if (type === 'CatchClause') {
    const newScope = new Scope();
    parseNode(node.param, functionScope, newScope, DECLARATION_TARGET_BLOCK);
    parseNode(node.body, functionScope, newScope, DECLARATION_TARGET_NONE);
    blockScope.merge(newScope);
  } else if (
    type === 'AssignmentExpression' ||
    type === 'BinaryExpression' ||
    type === 'AssignmentPattern'
  ) {
    // a=b, a+b, (a+b), f(a=b)
    parseNode(node.left, functionScope, blockScope, target);
    parseNode(node.right, functionScope, blockScope, DECLARATION_TARGET_NONE);
  } else if (type === 'MemberExpression') {
    // a.b
    parseNode(node.object, functionScope, blockScope, DECLARATION_TARGET_NONE);
    // node.propertyは対象外
  } else if (
    type === 'Property' ||
    type === 'MetaProperty' || // import.meta
    type === 'MethodDefinition' ||
    type === 'PropertyDefinition'
  ) {
    // {} literal, class methods, class prooerties, let { a }
    // 変数宣言ではなく、computedでないnode.keyは対象外
    // computedの例: ({ [x]: 123 })
    const valueType = (node.value as acorn.Node | undefined)?.type;
    if (
      node.computed ||
      // ネストされた分割代入チェック
      !(
        target === DECLARATION_TARGET_NONE ||
        valueType === 'ObjectPattern' ||
        valueType === 'ArrayPattern'
      )
    ) {
      parseNode(node.key, functionScope, blockScope, target);
    }
    parseNode(node.value, functionScope, blockScope, target);
  } else if (type === 'ClassDeclaration' || type === 'ClassExpression') {
    const newScope = new Scope();
    if (type === 'ClassDeclaration') {
      // クラス宣言の名前は外側スコープ
      parseNode(node.id, functionScope, blockScope, DECLARATION_TARGET_BLOCK);
    } else {
      // クラス式の名前は内側スコープ
      parseNode(node.id, newScope, newScope, DECLARATION_TARGET_BLOCK);
    }
    parseNode(
      node.superClass,
      functionScope,
      blockScope,
      DECLARATION_TARGET_NONE,
    );
    parseNode(node.body, newScope, newScope, DECLARATION_TARGET_NONE);
    blockScope.merge(newScope);
  } else if (
    type === 'ImportSpecifier' ||
    type === 'ImportNamespaceSpecifier' ||
    type === 'ImportDefaultSpecifier'
  ) {
    // import
    parseNode(node.local, functionScope, blockScope, DECLARATION_TARGET_BLOCK);
    // importedは対象外
  } else if (type === 'ExportSpecifier') {
    // export
    parseNode(node.local, functionScope, blockScope, DECLARATION_TARGET_NONE);
    // exportedは対象外
  } else {
    for (const name of Object.keys(node)) {
      if (name !== 'label') {
        parseNode(node[name], functionScope, blockScope, target);
      }
    }
  }
}

export function getUndefinedVariables(
  node: acorn.Node,
): Map<string, acorn.Node[]> {
  const scope = new Scope();
  parseNode(node, scope, scope, DECLARATION_TARGET_NONE);
  return scope.negate();
}

export default getUndefinedVariables;
