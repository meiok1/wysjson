/**
 * Intermediate Model to Source Code Generation
 * Converts edited JsonNode back to JavaScript source code
 * 
 * Strategy for codeText nodes:
 * - If unmodified, use original raw source
 * - If modified, parse as JavaScript expression
 * - If parse fails, return error and prevent save
 */

import * as types from '@babel/types';
import generate from '@babel/generator';
import * as babelParser from '@babel/parser';
import { JsonNode } from '../model';

export interface GenerationResult {
  success: boolean;
  code?: string;
  error?: string;
}

/**
 * Convert edited JsonNode back to JavaScript source code
 * Handles JSON nodes and code text nodes with validation
 */
export function modelToCode(model: JsonNode, indent: string = ''): GenerationResult {
  try {
    // Pre-validate all codeText nodes are parseable
    const validation = validateCodeTextNodes(model);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || '代码文本节点包含无效的 JavaScript 代码'
      };
    }

    const ast = modelToAst(model);
    if (!ast) {
      return {
        success: false,
        error: '无法转换模型到 AST'
      };
    }

    const generatedCode = generate(ast).code;

    // Apply indentation
    if (indent) {
      const lines = generatedCode.split('\n');
      const indented = lines.map((line: string, i: number) => 
        i === 0 ? line : indent + line
      ).join('\n');
      return {
        success: true,
        code: indented
      };
    }

    return {
      success: true,
      code: generatedCode
    };
  } catch (e) {
    return {
      success: false,
      error: `代码生成失败: ${(e as any)?.message || '未知错误'}`
    };
  }
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Recursively validate that all codeText nodes contain valid JavaScript
 */
function validateCodeTextNodes(model: JsonNode): ValidationResult {
  if (model.kind === 'codeText') {
    const code = model.value || model.raw || '';
    try {
      babelParser.parseExpression(code, {
        sourceType: 'module',
        allowImportExportEverywhere: true
      });
      return { valid: true };
    } catch (e) {
      return {
        valid: false,
        error: `代码文本无效: ${(e as any).message}`
      };
    }
  }

  if (model.children) {
    for (const child of Object.values(model.children)) {
      const res = validateCodeTextNodes(child);
      if (!res.valid) return res;
    }
  }

  if (model.items) {
    for (const item of model.items) {
      const res = validateCodeTextNodes(item);
      if (!res.valid) return res;
    }
  }

  return { valid: true };
}

function modelToAst(model: JsonNode): any {
  switch (model.kind) {
    case 'string':
      return types.stringLiteral(model.value);

    case 'number':
      return types.numericLiteral(model.value);

    case 'boolean':
      return types.booleanLiteral(model.value);

    case 'null':
      return types.nullLiteral();

    case 'object':
      return modelToObjectExpression(model);

    case 'array':
      return modelToArrayExpression(model);

    case 'codeText':
      // Parse code text back to AST
      return parseCodeTextSafely(model.raw || model.value);

    default:
      return null;
  }
}

function modelToObjectExpression(model: JsonNode): types.ObjectExpression {
  const properties: (types.ObjectProperty | types.ObjectMethod | types.SpreadElement)[] = [];

  if (model.children) {
    for (const [key, childModel] of Object.entries(model.children)) {
      // Skip special markers
      if (key === '...') {
        continue;
      }

      const keyNode = isValidIdentifier(key)
        ? types.identifier(key)
        : types.stringLiteral(key);

      if (childModel.kind === 'codeText' && isObjectMethod(childModel.raw || childModel.value)) {
        // Try to parse as object method
        const parsed = parseAsObjectMethod(key, childModel.raw || childModel.value);
        if (parsed) {
          properties.push(parsed);
          continue;
        }
      }

      const valueNode = modelToAst(childModel);
      if (valueNode) {
        properties.push(
          types.objectProperty(keyNode, valueNode)
        );
      }
    }
  }

  return types.objectExpression(properties);
}

function modelToArrayExpression(model: JsonNode): types.ArrayExpression {
  const elements: (types.Expression | types.SpreadElement | null)[] = [];

  if (model.items) {
    for (const item of model.items) {
      const elem = modelToAst(item);
      if (elem) {
        elements.push(elem);
      } else {
        elements.push(null);
      }
    }
  }

  return types.arrayExpression(elements);
}

/**
 * Parse code text safely, returning AST or null if invalid
 */
function parseCodeTextSafely(code: string): any {
  try {
    return babelParser.parseExpression(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true
    });
  } catch {
    return null;
  }
}

/**
 * Check if a string is a valid JavaScript identifier
 */
function isValidIdentifier(str: string): boolean {
  try {
    const ast = babelParser.parseExpression(str);
    return types.isIdentifier(ast);
  } catch {
    return false;
  }
}

/**
 * Check if code text looks like an object method
 */
function isObjectMethod(code: string): boolean {
  // Simple heuristic: starts with identifier, then '(', then has '{'
  const trimmed = code.trim();
  const parenIdx = trimmed.indexOf('(');
  if (parenIdx <= 0) return false;
  const braceIdx = trimmed.indexOf('{');
  return braceIdx > parenIdx;
}

/**
 * Try to parse code as object method and return ObjectMethod node
 */
function parseAsObjectMethod(key: string, methodCode: string): types.ObjectMethod | null {
  try {
    // Wrap in object literal to parse as object property
    const wrappedCode = `{ ${methodCode} }`;
    const ast = babelParser.parseExpression(wrappedCode);
    
    if (types.isObjectExpression(ast) && ast.properties.length > 0) {
      const prop = ast.properties[0];
      if (types.isObjectMethod(prop)) {
        return prop;
      }
    }
  } catch {
    return null;
  }
  return null;
}
