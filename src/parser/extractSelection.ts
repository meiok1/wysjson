/**
 * Selection Extraction Module
 * Fault-tolerant extraction of object/array literal from selected text
 */

import * as babelParser from '@babel/parser';
import * as types from '@babel/types';

export interface ExtractionResult {
  success: boolean;
  expression?: types.ObjectExpression | types.ArrayExpression;
  error?: string;
  hint?: string;
}

/**
 * Try to extract a single object or array literal from selected text.
 * 
 * Strategy:
 * 1. If selection is exactly an object/array literal, use it directly
 * 2. If selection wraps an initializer like `const x = {...}`, extract the value
 * 3. If selection is larger (e.g., function body), find all literals and check for exactly one
 * 4. If multiple candidates found, fail with hint to user
 * 5. Variable names and function nodes are preserved as-is, not expanded
 */
export function extractLiteralFromSelection(text: string): ExtractionResult {
  text = text.trim();
  
  if (!text) {
    return {
      success: false,
      error: '选区为空'
    };
  }

  // Attempt 1: Parse as expression directly
  try {
    const ast = babelParser.parseExpression(text, {
      sourceType: 'module',
      allowImportExportEverywhere: true
    });

    if (isObjectOrArrayLiteral(ast)) {
      return {
        success: true,
        expression: ast as types.ObjectExpression | types.ArrayExpression
      };
    }
  } catch (e) {
    // Continue to attempt 2
  }

  // Attempt 2: Parse as statement (e.g., variable declaration)
  try {
    const parseResult = babelParser.parse(text, {
      sourceType: 'module',
      allowImportExportEverywhere: true
    });

    const candidates = extractLiteralsFromProgram(parseResult.program);

    if (candidates.length === 1) {
      return {
        success: true,
        expression: candidates[0]
      };
    }

    if (candidates.length > 1) {
      return {
        success: false,
        error: `找到 ${candidates.length} 个候选对象/数组字面量，请精确选择其中一个`,
        hint: '请重新选择，确保选区内只有一个 object/array literal'
      };
    }

    if (candidates.length === 0) {
      return {
        success: false,
        error: '选区内未找到对象或数组字面量',
        hint: '请选择 {...} 或 [...] 字面量，或包含它们的变量初始化语句'
      };
    }
  } catch (e) {
    return {
      success: false,
      error: `语法解析失败: ${(e as any)?.message || '未知错误'}`,
      hint: '请确保选区是有效的 JavaScript 代码'
    };
  }

  return {
    success: false,
    error: '无法识别选区中的数据结构'
  };
}

/**
 * Check if an AST node is an object or array literal
 */
function isObjectOrArrayLiteral(node: any): boolean {
  return types.isObjectExpression(node) || types.isArrayExpression(node);
}

/**
 * Extract all object/array literals from a Program AST
 */
function extractLiteralsFromProgram(
  ast: types.Program
): (types.ObjectExpression | types.ArrayExpression)[] {
  const candidates: (types.ObjectExpression | types.ArrayExpression)[] = [];

  // Walk through all statements
  for (const statement of ast.body) {
    if (types.isVariableDeclaration(statement)) {
      // Extract from variable initializers
      for (const decl of statement.declarations) {
        if (decl.init && isObjectOrArrayLiteral(decl.init)) {
          candidates.push(decl.init as types.ObjectExpression | types.ArrayExpression);
        }
      }
    } else if (types.isExpressionStatement(statement)) {
      // Check if the expression itself is a literal
      if (isObjectOrArrayLiteral(statement.expression)) {
        candidates.push(statement.expression as types.ObjectExpression | types.ArrayExpression);
      }
    }
  }

  return candidates;
}
