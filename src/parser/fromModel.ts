/**
 * Intermediate Model to Source Code Generation
 * Converts edited JsonNode back to JavaScript source code.
 */

import * as babelParser from "@babel/parser";
import { JsonNode } from "../model";
import { getCommonExpressionParseOptions } from "./parserOptions";

export interface GenerationResult {
  success: boolean;
  code?: string;
  error?: string;
}

/**
 * Convert edited JsonNode back to JavaScript source code
 * Handles JSON nodes and code text nodes with validation
 */
export function modelToCode(
  model: JsonNode,
  indent: string = "",
): GenerationResult {
  try {
    const validation = validateModelCode(model);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || "代码文本节点包含无效的 JavaScript 代码",
      };
    }

    const generatedCode = emitNodeCode(model, 0, indent);

    // Apply indentation
    if (indent) {
      const lines = generatedCode.split("\n");
      const indented = lines
        .map((line: string, i: number) => (i === 0 ? line : indent + line))
        .join("\n");
      return {
        success: true,
        code: indented,
      };
    }

    return {
      success: true,
      code: generatedCode,
    };
  } catch (e) {
    return {
      success: false,
      error: `代码生成失败: ${(e as any)?.message || "未知错误"}`,
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
export function validateModelCode(model: JsonNode): ValidationResult {
  if (model.kind === "codeText") {
    const validation = validateCodeTextNode(model);
    if (!validation.valid) {
      return validation;
    }
  }

  if (model.children) {
    for (const child of Object.values(model.children)) {
      const res = validateModelCode(child);
      if (!res.valid) return res;
    }
  }

  if (model.items) {
    for (const item of model.items) {
      const res = validateModelCode(item);
      if (!res.valid) return res;
    }
  }

  return { valid: true };
}

function validateCodeTextNode(model: JsonNode): ValidationResult {
  const code = getCodeText(model);

  if (!code.trim()) {
    return {
      valid: false,
      error: "代码文本不能为空",
    };
  }

  if (looksLikeObjectMethod(code)) {
    if (tryParseObjectMethod(code)) {
      return { valid: true };
    }
  }

  try {
    babelParser.parseExpression(code, getCommonExpressionParseOptions());
    return { valid: true };
  } catch (e) {
    return {
      valid: false,
      error: `代码文本无效: ${(e as any).message}`,
    };
  }
}

function emitNodeCode(
  model: JsonNode,
  level: number,
  baseIndent: string,
): string {
  switch (model.kind) {
    case "string":
      return JSON.stringify(String(model.value ?? ""));
    case "number":
      return Number.isFinite(Number(model.value)) ? String(model.value) : "0";
    case "boolean":
      return model.value ? "true" : "false";
    case "null":
      return "null";
    case "codeText":
      return getCodeText(model);
    case "object":
      return emitObjectCode(model, level, baseIndent);
    case "array":
      return emitArrayCode(model, level, baseIndent);
    default:
      return "null";
  }
}

function emitObjectCode(
  model: JsonNode,
  level: number,
  baseIndent: string,
): string {
  const entries = Object.entries(model.children || {});
  if (entries.length === 0) {
    return "{}";
  }

  const currentIndent = getIndent(level, baseIndent);
  const childIndent = getIndent(level + 1, baseIndent);
  const lines = entries.map(([key, child]) =>
    emitObjectEntry(key, child, level + 1, baseIndent, childIndent),
  );

  return ["{", lines.join(",\n"), `${currentIndent}}`].join("\n");
}

function emitArrayCode(
  model: JsonNode,
  level: number,
  baseIndent: string,
): string {
  const items = model.items || [];
  if (items.length === 0) {
    return "[]";
  }

  const currentIndent = getIndent(level, baseIndent);
  const childIndent = getIndent(level + 1, baseIndent);
  const lines = items.map((item) =>
    emitArrayItemCode(item, level + 1, baseIndent, childIndent),
  );

  return ["[", lines.join(",\n"), `${currentIndent}]`].join("\n");
}

function isValidIdentifier(str: string): boolean {
  try {
    const ast = babelParser.parseExpression(
      str,
      getCommonExpressionParseOptions(),
    );
    return ast.type === "Identifier";
  } catch {
    return false;
  }
}

function emitObjectEntry(
  key: string,
  child: JsonNode,
  level: number,
  baseIndent: string,
  childIndent: string,
): string {
  if (key === "..." || child.sourceKind === "spread") {
    return indentRawBlock(getCodeText(child), childIndent);
  }

  if (child.kind === "codeText" && child.sourceKind === "objectMethod") {
    const code = getCodeText(child);
    if (looksLikeObjectMethod(code) && tryParseObjectMethod(code)) {
      return indentRawBlock(code, childIndent);
    }
  }

  const valueCode = emitNodeCode(child, level, baseIndent);
  const propertyPrefix = `${childIndent}${formatObjectKey(key)}: `;

  if (child.kind === "codeText" && valueCode.includes("\n")) {
    return indentCodeTextProperty(propertyPrefix, valueCode, childIndent);
  }

  const valueLines = valueCode.split("\n");
  if (valueLines.length === 1) {
    return `${propertyPrefix}${valueCode}`;
  }

  return `${propertyPrefix}${valueLines[0]}\n${valueLines.slice(1).join("\n")}`;
}

function emitArrayItemCode(
  item: JsonNode,
  level: number,
  baseIndent: string,
  childIndent: string,
): string {
  const itemCode = emitNodeCode(item, level, baseIndent);

  if (item.kind === "codeText" && itemCode.includes("\n")) {
    return indentRawBlock(itemCode, childIndent);
  }

  const lines = itemCode.split("\n");
  if (lines.length === 1) {
    return `${childIndent}${itemCode}`;
  }

  return `${childIndent}${lines[0]}\n${lines.slice(1).join("\n")}`;
}

function formatObjectKey(key: string): string {
  return isValidIdentifier(key) ? key : JSON.stringify(key);
}

function getCodeText(model: JsonNode): string {
  return String(model.raw ?? model.value ?? "");
}

function indentCodeTextProperty(
  propertyPrefix: string,
  valueCode: string,
  childIndent: string,
): string {
  const [firstLine, ...restLines] = valueCode.split("\n");
  if (restLines.length === 0) {
    return `${propertyPrefix}${firstLine}`;
  }

  return `${propertyPrefix}${firstLine}\n${restLines
    .map((line) => `${childIndent}${line}`)
    .join("\n")}`;
}

function indentRawBlock(code: string, indent: string): string {
  return code
    .split("\n")
    .map((line) => `${indent}${line}`)
    .join("\n");
}

function looksLikeObjectMethod(code: string): boolean {
  const trimmed = code.trim();
  const parenIdx = trimmed.indexOf("(");
  if (parenIdx <= 0) return false;
  const braceIdx = trimmed.indexOf("{");
  return braceIdx > parenIdx;
}

function tryParseObjectMethod(methodCode: string): boolean {
  try {
    const wrappedCode = `{ ${methodCode} }`;
    const ast = babelParser.parseExpression(
      wrappedCode,
      getCommonExpressionParseOptions(),
    );

    return (
      ast.type === "ObjectExpression" &&
      ast.properties[0]?.type === "ObjectMethod"
    );
  } catch {
    return false;
  }
}

function getIndent(level: number, baseIndent: string): string {
  return `${baseIndent}${"  ".repeat(level)}`;
}
