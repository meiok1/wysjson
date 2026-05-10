/**
 * AST to Intermediate Model Conversion
 * Converts Babel AST nodes to wysJSON JsonNode model
 */

import * as types from '@babel/types';
import generate from '@babel/generator';
import { JsonNode } from '../model';

export function astToModel(node: any, originalSource?: string): JsonNode {
  if (types.isObjectExpression(node)) {
    return astObjectToModel(node, originalSource);
  }

  if (types.isArrayExpression(node)) {
    return astArrayToModel(node, originalSource);
  }

  if (types.isStringLiteral(node)) {
    return {
      kind: 'string',
      value: node.value,
      raw: (node.extra?.raw as string) || JSON.stringify(node.value),
      editable: true,
      writeMode: 'json'
    };
  }

  if (types.isNumericLiteral(node)) {
    return {
      kind: 'number',
      value: node.value,
      raw: (node.extra?.raw as string) || String(node.value),
      editable: true,
      writeMode: 'json'
    };
  }

  if (types.isBooleanLiteral(node)) {
    return {
      kind: 'boolean',
      value: node.value,
      raw: String(node.value),
      editable: true,
      writeMode: 'json'
    };
  }

  if (types.isNullLiteral(node)) {
    return {
      kind: 'null',
      value: null,
      raw: 'null',
      editable: true,
      writeMode: 'json'
    };
  }

  // Everything else (functions, dates, symbols, identifiers, calls, etc.)
  // Preserve as code text node
  const codeText = generate.default(node).code;
  return {
    kind: 'codeText',
    value: codeText,
    raw: codeText,
    editable: true,
    writeMode: 'code',
    warning: '此节点为 JavaScript 代码表达式，修改后需要保证语法有效'
  };
}

function astObjectToModel(node: types.ObjectExpression, originalSource?: string): JsonNode {
  const children: Record<string, JsonNode> = {};

  for (const prop of node.properties) {
    if (types.isObjectProperty(prop) || types.isObjectMethod(prop)) {
      let key: string;

      if (types.isIdentifier(prop.key)) {
        key = prop.key.name;
      } else if (types.isStringLiteral(prop.key)) {
        key = prop.key.value;
      } else if (types.isNumericLiteral(prop.key)) {
        key = String(prop.key.value);
      } else {
        // Computed property or other unsupported key type
        key = generate.default(prop.key).code;
      }

      if (types.isObjectMethod(prop)) {
        // Object method: preserve as code text
        const methodCode = generate.default(prop).code;
        children[key] = {
          kind: 'codeText',
          value: methodCode,
          raw: methodCode,
          editable: true,
          writeMode: 'code',
          warning: '对象方法将保留 JavaScript 代码形式'
        };
      } else {
        // Regular object property
        children[key] = astToModel(prop.value, originalSource);
      }
    } else if (types.isSpreadElement(prop)) {
      // Spread not supported, mark as warning
      children['...'] = {
        kind: 'codeText',
        value: generate.default(prop).code,
        raw: generate.default(prop).code,
        editable: false,
        writeMode: 'code',
        warning: '扩展运算符（...）不支持在 wysJSON 中编辑'
      };
    }
  }

  return {
    kind: 'object',
    value: {},
    raw: originalSource,
    editable: true,
    writeMode: 'json',
    children
  };
}

function astArrayToModel(node: types.ArrayExpression, originalSource?: string): JsonNode {
  const items: JsonNode[] = [];

  for (let i = 0; i < node.elements.length; i++) {
    const elem = node.elements[i];

    if (elem === null) {
      // Hole in array
      items.push({
        kind: 'null',
        value: null,
        raw: 'null',
        editable: true,
        writeMode: 'json'
      });
    } else if (types.isSpreadElement(elem)) {
      // Spread not supported
      items.push({
        kind: 'codeText',
        value: generate.default(elem).code,
        raw: generate.default(elem).code,
        editable: false,
        writeMode: 'code',
        warning: '扩展运算符（...）不支持在 wysJSON 中编辑'
      });
    } else {
      items.push(astToModel(elem, originalSource));
    }
  }

  return {
    kind: 'array',
    value: [],
    raw: originalSource,
    editable: true,
    writeMode: 'json',
    items
  };
}
