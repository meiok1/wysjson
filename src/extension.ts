/**
 * wysJSON VS Code Extension
 * Main entry point
 */

import * as vscode from "vscode";
import * as path from "path";
import * as babelParser from "@babel/parser";
import { extractLiteralFromSelection } from "./parser/extractSelection";
import { astToModel } from "./parser/toModel";
import { modelToCode } from "./parser/fromModel";
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
  if (selection.isEmpty) {
    vscode.window.showErrorMessage("请选择 JavaScript 对象或数组字面量");
    return;
  }

  const document = editor.document;
  const selectedText = document.getText(selection);

  // Try to extract literal from selection
  const extractResult = extractLiteralFromSelection(selectedText);

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

  // Convert to model
  let rootModel: JsonNode;
  try {
    rootModel = astToModel(extractResult.expression, selectedText);
  } catch (e) {
    vscode.window.showErrorMessage(`转换模型失败: ${(e as any).message}`);
    return;
  }

  // Create source info
  const sourceInfo: SourceInfo = {
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

  console.log("[wysJSON] extracted model kind:", rootModel.kind);

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

  // Set webview HTML
  panel.webview.html = getWebviewContent(panel.webview);

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

      // Format document after edit (optional)
      try {
        await vscode.commands.executeCommand("editor.action.formatDocument");
      } catch {
        // Formatting is optional, don't fail if unavailable
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
  if (model.kind === "codeText") {
    const code = model.value || model.raw || "";
    try {
      babelParser.parseExpression(code, {
        sourceType: "module",
        allowImportExportEverywhere: true,
      });
      return { valid: true };
    } catch (e) {
      return {
        valid: false,
        error: `代码文本包含语法错误: ${(e as any).message}`,
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

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function getWebviewContent(webview: vscode.Webview): string {
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
<html lang="zh-CN">
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
