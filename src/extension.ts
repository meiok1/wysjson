/**
 * wysJSON VS Code Extension
 * Main entry point
 */

import * as vscode from "vscode";
import * as path from "path";
import * as babelParser from "@babel/parser";
import {
  extractLiteralFromSelection,
  extractLiteralFromDocument,
} from "./parser/extractSelection";
import { astToModel } from "./parser/toModel";
import { modelToCode, validateModelCode } from "./parser/fromModel";
import { JsonNode, SourceInfo, SaveMessage, ExtensionResponse } from "./model";

let extensionContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
  extensionContext = context;

  // Register command
  const disposable = vscode.commands.registerCommand(
    "wysjson.openSelection",
    () => handleOpenSelection(),
  );

  context.subscriptions.push(disposable);
  // Also register an English-only menu command id so we can show a non-localized
  // label when the user prefers English (the editor context menu labels are
  // controlled by VS Code localization and cannot be changed at runtime;
  // using a separate command + menu entry controlled by a context key lets
  // us present an English label when requested).
  const disposableEn = vscode.commands.registerCommand(
    "wysjson.openSelectionEnglish",
    () => handleOpenSelection(),
  );
  context.subscriptions.push(disposableEn);
  console.log("wysJSON extension activated");
}

export function deactivate() {
  console.log("wysJSON extension deactivated");
}

async function handleOpenSelection() {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showErrorMessage("请先打开编辑器");
    return;
  }

  const selection = editor.selection;
  const document = editor.document;

  let selectedText: string | undefined;
  let extractResult: any;
  let rootModel: JsonNode | undefined;
  let sourceInfo: SourceInfo | undefined;

  if (!selection.isEmpty) {
    // Preserve existing behavior when user made a selection
    // If editing a Markdown file and the selection lies inside a fenced code block,
    // extract the inner code only (strip the surrounding ``` markers).
    if (document.languageId === "markdown") {
      const selStartLine = selection.start.line;
      const selEndLine = selection.end.line;
      let startFenceLine: number | null = null;
      for (let i = selStartLine; i >= 0; --i) {
        const line = document.lineAt(i).text;
        if (line.trim().startsWith("```")) {
          startFenceLine = i;
          break;
        }
      }
      let endFenceLine: number | null = null;
      if (startFenceLine !== null) {
        for (let j = startFenceLine + 1; j < document.lineCount; ++j) {
          const line = document.lineAt(j).text;
          if (line.trim().startsWith("```")) {
            endFenceLine = j;
            break;
          }
        }
      }
      if (
        startFenceLine !== null &&
        endFenceLine !== null &&
        selStartLine >= startFenceLine + 1 &&
        selEndLine <= endFenceLine - 1
      ) {
        const innerStart = new vscode.Position(startFenceLine + 1, 0);
        const innerEnd = new vscode.Position(endFenceLine, 0);
        // Clip selection into inner code region
        const useStart = selection.start.isBefore(innerStart)
          ? innerStart
          : selection.start;
        const useEnd = selection.end.isAfter(innerEnd)
          ? innerEnd
          : selection.end;
        selectedText = document.getText(new vscode.Range(useStart, useEnd));
      } else {
        selectedText = document.getText(selection);
      }
    } else {
      selectedText = document.getText(selection);
    }
    extractResult = extractLiteralFromSelection(selectedText);

    if (!extractResult.success) {
      vscode.window.showErrorMessage(
        extractResult.error || "无法识别选区中的数据结构",
      );
      if (extractResult.hint) {
        vscode.window.showInformationMessage(extractResult.hint);
      }
      return;
    }

    if (!extractResult.expression) {
      vscode.window.showErrorMessage("提取表达式失败");
      return;
    }

    try {
      rootModel = astToModel(extractResult.expression, selectedText);
    } catch (e) {
      vscode.window.showErrorMessage(`转换模型失败: ${(e as any).message}`);
      return;
    }

    sourceInfo = {
      uri: document.uri.toString(),
      selectedText,
      start: {
        line: selection.start.line,
        character: selection.start.character,
      },
      end: {
        line: selection.end.line,
        character: selection.end.character,
      },
      version: document.version,
      indent: getIndentation(document, selection.start.line),
      originalLines: extractOriginalLines(document, selection),
    };
  } else {
    // No selection: try to detect a literal at cursor position in the whole document
    const fullText = document.getText();
    const offset = document.offsetAt(selection.active);

    const isJsTsLanguage = (id: string) =>
      id === "javascript" ||
      id === "javascriptreact" ||
      id === "typescript" ||
      id === "typescriptreact";
    const isPlainTextLanguage = (id: string) => id === "plaintext";

    // If this is a Markdown file, try to detect a fenced code block around the cursor
    if (document.languageId === "markdown") {
      const cursorLine = selection.active.line;
      let startFenceLine: number | null = null;
      for (let i = cursorLine; i >= 0; --i) {
        const line = document.lineAt(i).text;
        if (line.trim().startsWith("```")) {
          startFenceLine = i;
          break;
        }
      }
      let endFenceLine: number | null = null;
      if (startFenceLine !== null) {
        for (let j = startFenceLine + 1; j < document.lineCount; ++j) {
          const line = document.lineAt(j).text;
          if (line.trim().startsWith("```")) {
            endFenceLine = j;
            break;
          }
        }
      }

      if (
        startFenceLine !== null &&
        endFenceLine !== null &&
        cursorLine > startFenceLine &&
        cursorLine < endFenceLine
      ) {
        const codeStartPos = new vscode.Position(startFenceLine + 1, 0);
        const codeEndPos = new vscode.Position(endFenceLine, 0);
        const codeText = document.getText(
          new vscode.Range(codeStartPos, codeEndPos),
        );
        const codeStartOffset = document.offsetAt(codeStartPos);
        const offsetInCode = offset - codeStartOffset;
        extractResult = extractLiteralFromDocument(codeText, offsetInCode);

        if (extractResult.success && extractResult.expression) {
          const startOffset =
            typeof extractResult.start === "number"
              ? extractResult.start
              : (extractResult.expression.start as number);
          const endOffset =
            typeof extractResult.end === "number"
              ? extractResult.end
              : (extractResult.expression.end as number);
          const startPos = document.positionAt(codeStartOffset + startOffset);
          const endPos = document.positionAt(codeStartOffset + endOffset);
          selectedText = document.getText(new vscode.Range(startPos, endPos));
          try {
            rootModel = astToModel(extractResult.expression, selectedText);
          } catch (e) {
            vscode.window.showErrorMessage(
              `转换模型失败: ${(e as any).message}`,
            );
            return;
          }
          sourceInfo = {
            uri: document.uri.toString(),
            selectedText,
            start: { line: startPos.line, character: startPos.character },
            end: { line: endPos.line, character: endPos.character },
            version: document.version,
            indent: getIndentation(document, startPos.line),
            originalLines: extractOriginalLines(
              document,
              new vscode.Selection(startPos, endPos),
            ),
          };
        } else {
          // For markdown outside fenced code blocks, try cursor-based
          // structural extraction from the raw document before falling back.
          extractResult = extractLiteralFromDocument(fullText, offset);
        }
      } else {
        extractResult = extractLiteralFromDocument(fullText, offset);
      }
    } else {
      // Non-markdown files: preserve JS/TS behavior, and allow plain text
      // files to use cursor-based structural extraction.
      if (isJsTsLanguage(document.languageId)) {
        extractResult = extractLiteralFromDocument(fullText, offset);
      } else if (isPlainTextLanguage(document.languageId)) {
        extractResult = extractLiteralFromDocument(fullText, offset);
      } else {
        extractResult = { success: false };
      }
    }

    if (extractResult.success && extractResult.expression) {
      const startOffset =
        typeof extractResult.start === "number"
          ? extractResult.start
          : (extractResult.expression.start as number);
      const endOffset =
        typeof extractResult.end === "number"
          ? extractResult.end
          : (extractResult.expression.end as number);
      const startPos = document.positionAt(startOffset);
      const endPos = document.positionAt(endOffset);
      selectedText = document.getText(new vscode.Range(startPos, endPos));

      try {
        rootModel = astToModel(extractResult.expression, selectedText);
      } catch (e) {
        vscode.window.showErrorMessage(`转换模型失败: ${(e as any).message}`);
        return;
      }

      sourceInfo = {
        uri: document.uri.toString(),
        selectedText,
        start: { line: startPos.line, character: startPos.character },
        end: { line: endPos.line, character: endPos.character },
        version: document.version,
        indent: getIndentation(document, startPos.line),
        originalLines: extractOriginalLines(
          document,
          new vscode.Selection(startPos, endPos),
        ),
      };
    } else {
      // Fallback: open wysjson with an empty object at the cursor position
      selectedText = "{}";
      rootModel = {
        kind: "object",
        value: {},
        raw: "{}",
        editable: true,
        writeMode: "json",
        children: {},
      } as unknown as JsonNode;

      const pos = selection.active;
      sourceInfo = {
        uri: document.uri.toString(),
        selectedText,
        start: { line: pos.line, character: pos.character },
        end: { line: pos.line, character: pos.character },
        version: document.version,
        indent: getIndentation(document, pos.line),
        originalLines: [document.lineAt(pos.line).text],
      };
    }
  }

  console.log("[wysJSON] extracted model kind:", rootModel!.kind);

  // Prepare language preference for webview (persisted in globalState)
  const userLangPref =
    (extensionContext.globalState.get<string>("wysjson.language") as string) ||
    "auto";
  // Default to English unless user explicitly chose otherwise
  const effectiveLang =
    userLangPref && userLangPref !== "auto" ? userLangPref : "en";

  // Expose a context key so package.json menu contributions can show/hide
  // localized vs. English-only menu entries based on the user's choice.
  try {
    vscode.commands.executeCommand("setContext", "wysjson.lang", effectiveLang);
  } catch (e) {
    console.warn("Failed to set context wysjson.lang", e);
  }

  // Create webview panel
  const panel = vscode.window.createWebviewPanel(
    "wysJSON",
    "wysJSON Editor",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(extensionContext.extensionPath, "media")),
      ],
    },
  );

  // Set webview HTML (pass effective language and user preference)
  panel.webview.html = getWebviewContent(
    panel.webview,
    effectiveLang,
    userLangPref,
  );

  // Handle messages from webview
  panel.webview.onDidReceiveMessage(
    async (message) => {
      console.log("[wysJSON] received message from webview:", message.type);
      if (message.type === "ready") {
        console.log(
          "[wysJSON] webview ready, sending init data, rootModel.kind=",
          rootModel.kind,
        );
        panel.webview.postMessage({
          type: "init",
          rootModel,
          sourceInfo,
          readonlyWarnings: [],
          language: effectiveLang,
          userLangPref: userLangPref,
        });
      } else {
        await handleWebviewMessage(
          message,
          editor,
          document,
          sourceInfo,
          panel,
        );
      }
    },
    undefined,
    extensionContext.subscriptions,
  );
}

function getIndentation(document: vscode.TextDocument, line: number): string {
  const lineText = document.lineAt(line).text;
  const match = lineText.match(/^(\s*)/);
  return match ? match[1] : "";
}

function extractOriginalLines(
  document: vscode.TextDocument,
  selection: vscode.Selection,
): string[] {
  const lines: string[] = [];
  for (let i = selection.start.line; i <= selection.end.line; i++) {
    lines.push(document.lineAt(i).text);
  }
  return lines;
}

async function handleWebviewMessage(
  message: any,
  editor: vscode.TextEditor,
  document: vscode.TextDocument,
  sourceInfo: SourceInfo,
  panel: vscode.WebviewPanel,
) {
  if (message.type === "setLanguage") {
    const langPref = message.language || "auto";
    await extensionContext.globalState.update("wysjson.language", langPref);
    const effective = langPref && langPref !== "auto" ? langPref : "en";
    try {
      await vscode.commands.executeCommand(
        "setContext",
        "wysjson.lang",
        effective,
      );
    } catch (e) {
      console.warn("Failed to update context wysjson.lang", e);
    }
    panel.webview.postMessage({ type: "languageSaved", language: langPref });
    return;
  }
  if (message.type === "save") {
    const saveMsg = message as SaveMessage;

    // Check if document has been modified since extraction
    if (document.version !== sourceInfo.version) {
      panel.webview.postMessage({
        type: "error",
        message: "文档已被修改，请重新打开编辑器以避免覆盖更改",
      } as ExtensionResponse);
      return;
    }

    // Validate edited model contains no syntax errors
    const validation = validateEditedModel(saveMsg.model);
    if (!validation.valid) {
      panel.webview.postMessage({
        type: "error",
        message: validation.error || "编辑后的数据包含无效的代码",
      } as ExtensionResponse);
      return;
    }

    // Generate code from edited model
    const genResult = modelToCode(saveMsg.model, sourceInfo.indent);

    if (!genResult.success) {
      panel.webview.postMessage({
        type: "error",
        message: genResult.error || "代码生成失败",
      } as ExtensionResponse);
      return;
    }

    // Apply edit using source info positions (not editor selection)
    try {
      const startPos = new vscode.Position(
        sourceInfo.start.line,
        sourceInfo.start.character,
      );
      const endPos = new vscode.Position(
        sourceInfo.end.line,
        sourceInfo.end.character,
      );
      const range = new vscode.Range(startPos, endPos);

      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, range, genResult.code || "");
      const success = await vscode.workspace.applyEdit(edit);

      if (!success) {
        throw new Error("WorkspaceEdit 应用失败");
      }

      panel.webview.postMessage({
        type: "success",
        message: "已写回编辑器",
        generatedCode: genResult.code,
      } as ExtensionResponse);

      // Close webview after short delay to show success message
      setTimeout(() => panel.dispose(), 500);
    } catch (e) {
      panel.webview.postMessage({
        type: "error",
        message: `写回编辑器失败: ${(e as any).message}`,
      } as ExtensionResponse);
    }
  } else if (message.type === "cancel") {
    panel.dispose();
  }
}

/**
 * Validate that edited model contains no unresolvable code text
 */
function validateEditedModel(model: JsonNode): {
  valid: boolean;
  error?: string;
} {
  return validateCodeTextNodes(model);
}

function validateCodeTextNodes(model: JsonNode): {
  valid: boolean;
  error?: string;
} {
  return validateModelCode(model);
}

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function getWebviewContent(
  webview: vscode.Webview,
  htmlLang: string = "en",
  userLangPref: string = "auto",
): string {
  const cssUri = webview.asWebviewUri(
    vscode.Uri.file(
      path.join(extensionContext.extensionPath, "media", "webview.css"),
    ),
  );
  const jsUri = webview.asWebviewUri(
    vscode.Uri.file(
      path.join(extensionContext.extensionPath, "media", "webview.js"),
    ),
  );
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>wysJSON - Nested JSON Table Editor</title>
  <link rel="stylesheet" href="${cssUri}">
</head>
<body>

<!-- Toolbar -->
<div class="toolbar">
  <span class="title">📋 wysJSON</span>
  <button id="btnSave" class="accent" title="Save to source file">💾 Save</button>
  <button id="btnCancel" title="Close editor">✕ Cancel</button>
  <select id="languageSelect" class="language-select" title="Language">
    <option value="auto">🌐 Auto</option>
    <option value="en">English</option>
    <option value="zh-CN">中文 (简体)</option>
  </select>
  <span class="sep"></span>
  <button id="btnUndo" title="Undo (Ctrl+Z)">↩ Undo</button>
  <button id="btnRedo" title="Redo (Ctrl+Y)">↪ Redo</button>
  <span class="sep"></span>
  <button id="btnClearNull" title="Replace all nulls with empty strings">🧹 Clear null</button>
  <label class="toolbar-checkbox"><input type="checkbox" id="chkNullAsString" checked> null as string</label>
  <label class="toolbar-checkbox"><input type="checkbox" id="chkThumbnail"> Thumbnail</label>
  <label class="toolbar-checkbox"><input type="checkbox" id="chkQuickJump"> Quick Jump</label>
</div>

<!-- Breadcrumb -->
<div class="breadcrumb" id="breadcrumb">
  <span class="current">📄 root</span>
</div>

<!-- Main Content (no input-panel in extension mode) -->
<div class="main-content">
  <div class="table-view" id="tableView">
    <div class="editor-canvas" id="editorCanvas"></div>
    <div class="mini-map thumbnail-panel hidden" id="thumbnailPanel"></div>
    <div class="mini-map hidden" id="miniMap"></div>
    <div class="empty-state" id="emptyState">
      <div class="icon">📋</div>
      <h3>wysJSON Table Editor</h3>
      <p>Loading data from editor selection...</p>
    </div>
  </div>
</div>

<!-- Status Bar -->
<div class="status-bar" id="statusBar">
  <span>⏳ Loading...</span>
</div>

<!-- Context Menu -->
<div class="context-menu" id="contextMenu"></div>

  <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
}
