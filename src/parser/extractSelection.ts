/**
 * Selection Extraction Module
 * Fault-tolerant extraction of object/array literal from selected text
 */

import * as babelParser from "@babel/parser";
import * as types from "@babel/types";
import {
  getCommonExpressionParseOptions,
  getCommonParseOptions,
} from "./parserOptions";

export interface ExtractionResult {
  success: boolean;
  // Expression can be any JS expression node (object/array/primitives/code)
  expression?: types.Expression;
  error?: string;
  hint?: string;
  // optional offsets in the source text for the expression
  start?: number;
  end?: number;
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
      error: "选区为空",
    };
  }

  // Attempt 1: Parse as expression directly
  try {
    const ast = babelParser.parseExpression(
      text,
      getCommonExpressionParseOptions(),
    );

    if (isObjectOrArrayLiteral(ast)) {
      return {
        success: true,
        expression: ast as types.ObjectExpression | types.ArrayExpression,
      };
    }
  } catch (e) {
    // Continue to attempt 2
  }

  // Attempt 2: Parse as statement (e.g., variable declaration)
  try {
    const parseResult = babelParser.parse(text, getCommonParseOptions());

    const candidates = extractLiteralsFromProgram(parseResult.program);

    if (candidates.length === 1) {
      return {
        success: true,
        expression: candidates[0],
      };
    }

    if (candidates.length > 1) {
      return {
        success: false,
        error: `找到 ${candidates.length} 个候选对象/数组字面量，请精确选择其中一个`,
        hint: "请重新选择，确保选区内只有一个 object/array literal",
      };
    }

    if (candidates.length === 0) {
      return {
        success: false,
        error: "选区内未找到对象或数组字面量",
        hint: "请选择 {...} 或 [...] 字面量，或包含它们的变量初始化语句",
      };
    }
  } catch (e) {
    return {
      success: false,
      error: `语法解析失败: ${(e as any)?.message || "未知错误"}`,
      hint: "请确保选区是有效的 JavaScript 代码",
    };
  }

  return {
    success: false,
    error: "无法识别选区中的数据结构",
  };
}

/**
 * Try to extract a literal expression (object/array/primitive) from the full document
 * at a given character offset (cursor position). Returns the deepest enclosing
 * literal node if found, with start/end offsets.
 */
export function extractLiteralFromDocument(
  text: string,
  offset: number,
): ExtractionResult {
  try {
    const ast = babelParser.parse(
      text,
      getCommonParseOptions({ ranges: true }),
    );

    const matches: any[] = [];
    const varInits: any[] = [];

    function isJsonLike(n: any) {
      return (
        types.isObjectExpression(n) ||
        types.isArrayExpression(n) ||
        types.isStringLiteral(n) ||
        types.isNumericLiteral(n) ||
        types.isBooleanLiteral(n) ||
        types.isNullLiteral(n) ||
        types.isTemplateLiteral(n)
      );
    }

    function walk(node: any) {
      if (!node || typeof node.type !== "string") return;

      // Node must contain the offset to be considered
      if (typeof node.start === "number" && typeof node.end === "number") {
        if (node.start <= offset && node.end >= offset) {
          // Collect json-like nodes that contain the offset
          if (isJsonLike(node)) {
            matches.push(node);
          }

          // If this is a variable declarator and its initializer is json-like
          // and the cursor falls anywhere inside that initializer, remember it
          // so we can prefer the whole variable initializer over nested children.
          if (
            types.isVariableDeclarator(node) &&
            node.init &&
            isJsonLike(node.init)
          ) {
            // If the cursor is anywhere inside the variable declarator
            // (e.g. on the identifier or the initializer), prefer the
            // initializer as the extraction target.
            if (
              typeof node.start === "number" &&
              typeof node.end === "number"
            ) {
              if (node.start <= offset && node.end >= offset) {
                varInits.push(node.init);
              }
            }
          }
        }
      }

      // Recurse into child nodes
      for (const key of Object.keys(node)) {
        if (
          key === "loc" ||
          key === "start" ||
          key === "end" ||
          key === "range"
        )
          continue;
        const child = (node as any)[key];
        if (Array.isArray(child)) {
          for (const c of child) {
            if (c && typeof c.type === "string") walk(c);
          }
        } else if (child && typeof child.type === "string") {
          walk(child);
        }
      }
    }

    walk(ast.program || ast);

    // Prefer variable initializer candidates (outermost) if any found
    if (varInits.length > 0) {
      varInits.sort((a, b) => a.start - b.start);
      const chosen = varInits[0];
      return {
        success: true,
        expression: chosen as types.Expression,
        start: chosen.start,
        end: chosen.end,
      };
    }

    // If we collected json-like matches, prefer the outermost one (smallest start)
    if (matches.length > 0) {
      matches.sort((a, b) => a.start - b.start);
      const chosen = matches[0];
      return {
        success: true,
        expression: chosen as types.Expression,
        start: chosen.start,
        end: chosen.end,
      };
    }
    // No AST-based match found; try a lightweight brace-scanning fallback
    const braceFallback = findEnclosingLiteralByBraces(text, offset);
    if (braceFallback.success) return braceFallback;

    return {
      success: false,
      error: "在光标处未找到对象/数组或字面量",
    };
  } catch (e) {
    // If full-parse failed (malformed file), attempt brace-scanning fallback
    const braceFallback = findEnclosingLiteralByBraces(text, offset);
    if (braceFallback.success) return braceFallback;
    return {
      success: false,
      error: `解析文档失败: ${(e as any)?.message || "未知错误"}`,
    };
  }
}

/**
 * Attempt to find an enclosing JSON-like literal by scanning for matching
 * braces/brackets around the cursor. This is a best-effort fallback for
 * plain text/markdown files where we cannot or do not want to run a full
 * JS AST parse of the entire document.
 */
function findEnclosingLiteralByBraces(
  text: string,
  offset: number,
): ExtractionResult {
  const len = text.length;
  const maxWindow = 20000; // limit scanning window for performance
  const leftBound = Math.max(0, offset - maxWindow);
  const rightBound = Math.min(len, offset + maxWindow);

  // Helper: try to find a matching end index for an opening brace at `start`
  function forwardFindMatching(start: number): number | null {
    const open = text[start];
    const close = open === "{" ? "}" : open === "[" ? "]" : null;
    if (!close) return null;

    let i = start + 1;
    const stack: string[] = [open];
    let inString = false;
    let stringQuote: string | null = null;
    let escaped = false;

    while (i < rightBound) {
      const ch = text[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === stringQuote) {
          inString = false;
          stringQuote = null;
        }
        i++;
        continue;
      }

      // Enter string
      if (ch === '"' || ch === "'" || ch === "`") {
        inString = true;
        stringQuote = ch;
        escaped = false;
        i++;
        continue;
      }

      // Skip comments
      if (ch === "/" && i + 1 < rightBound) {
        const nxt = text[i + 1];
        if (nxt === "/") {
          // line comment
          i += 2;
          while (i < rightBound && text[i] !== "\n") i++;
          continue;
        } else if (nxt === "*") {
          // block comment
          i += 2;
          while (
            i + 1 < rightBound &&
            !(text[i] === "*" && text[i + 1] === "/")
          )
            i++;
          i += 2;
          continue;
        }
      }

      if (ch === "{" || ch === "[") {
        stack.push(ch);
      } else if (ch === "}" || ch === "]") {
        const last = stack[stack.length - 1];
        if ((last === "{" && ch === "}") || (last === "[" && ch === "]")) {
          stack.pop();
          if (stack.length === 0) return i;
        } else {
          // mismatched closing brace — continue searching
        }
      }

      i++;
    }
    return null;
  }

  // Scan leftwards from cursor for an opening brace
  for (let i = offset; i >= leftBound; --i) {
    const ch = text[i];
    if (ch !== "{" && ch !== "[") continue;
    const matchEnd = forwardFindMatching(i);
    if (matchEnd !== null && matchEnd >= offset) {
      const candidate = text.slice(i, matchEnd + 1);
      // Try to parse candidate as JS expression (permissive) using Babel
      try {
        const expr = babelParser.parseExpression(candidate, {
          sourceType: "module",
          allowImportExportEverywhere: true,
        }) as types.Expression;
        return { success: true, expression: expr, start: i, end: matchEnd + 1 };
      } catch (e) {
        // parsing failed — try next possible opening brace
        continue;
      }
    }
  }

  return { success: false };
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
  ast: types.Program,
): (types.ObjectExpression | types.ArrayExpression)[] {
  const candidates: (types.ObjectExpression | types.ArrayExpression)[] = [];

  // Walk through all statements
  for (const statement of ast.body) {
    if (types.isVariableDeclaration(statement)) {
      // Extract from variable initializers
      for (const decl of statement.declarations) {
        if (decl.init && isObjectOrArrayLiteral(decl.init)) {
          candidates.push(
            decl.init as types.ObjectExpression | types.ArrayExpression,
          );
        }
      }
    } else if (types.isExpressionStatement(statement)) {
      // Check if the expression itself is a literal
      if (isObjectOrArrayLiteral(statement.expression)) {
        candidates.push(
          statement.expression as
            | types.ObjectExpression
            | types.ArrayExpression,
        );
      }
    }
  }

  return candidates;
}
