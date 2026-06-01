import * as fs from "fs";
import * as vscode from "vscode";
import generate from "@babel/generator";
import { parse, parseExpression, type ParserPlugin } from "@babel/parser";
import * as t from "@babel/types";

type JsonNode =
  | JsonObjectNode
  | JsonArrayNode
  | JsonStringNode
  | JsonNumberNode
  | JsonBooleanNode
  | JsonNullNode
  | JsonCodeTextNode;

interface JsonNodeBase {
  kind:
    | "object"
    | "array"
    | "string"
    | "number"
    | "boolean"
    | "null"
    | "codeText";
  editable?: boolean;
  raw?: string;
  writeMode?: "json" | "code";
  sourceKind?: string;
}

interface JsonObjectNode extends JsonNodeBase {
  kind: "object";
  children: Record<string, JsonNode>;
}

interface JsonArrayNode extends JsonNodeBase {
  kind: "array";
  items: JsonNode[];
}

interface JsonStringNode extends JsonNodeBase {
  kind: "string";
  value: string;
}

interface JsonNumberNode extends JsonNodeBase {
  kind: "number";
  value: number;
}

interface JsonBooleanNode extends JsonNodeBase {
  kind: "boolean";
  value: boolean;
}

interface JsonNullNode extends JsonNodeBase {
  kind: "null";
  value: null;
}

interface JsonCodeTextNode extends JsonNodeBase {
  kind: "codeText";
  value: string;
}

interface OpenTarget {
  uri: vscode.Uri;
  languageId: string;
  version: number;
  range: vscode.Range;
  rootModel: JsonNode;
  title: string;
}

interface EditableTargetMatch {
  node: t.Expression;
  start: number;
  end: number;
  priority: number;
}

const SUPPORTED_LANGUAGES = new Set([
  "json",
  "jsonc",
  "html",
  "javascript",
  "javascriptreact",
  "markdown",
  "plaintext",
  "astro",
  "svelte",
  "typescript",
  "typescriptreact",
  "vue",
]);

export function activate(context: vscode.ExtensionContext): void {
  void vscode.commands.executeCommand(
    "setContext",
    "JSONOK.lang",
    vscode.env.language === "en" ? "en" : "zh-CN",
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("JSONOK.openSelection", async () => {
      await openJsonOk(context);
    }),
    vscode.commands.registerCommand("JSONOK.openSelectionEnglish", async () => {
      await openJsonOk(context);
    }),
  );
}

export function deactivate(): void {
  JsonOkPanel.disposeCurrent();
}

async function openJsonOk(context: vscode.ExtensionContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showErrorMessage("JSONOK: No active editor.");
    return;
  }

  if (!SUPPORTED_LANGUAGES.has(editor.document.languageId)) {
    void vscode.window.showErrorMessage(
      "JSONOK only supports JSON, JavaScript/TypeScript, common frontend host files, Markdown, and text documents.",
    );
    return;
  }

  try {
    const target = extractOpenTarget(editor);
    JsonOkPanel.open(context, target);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`JSONOK: ${message}`);
  }
}

class JsonOkPanel {
  private static current: JsonOkPanel | undefined;

  public static open(
    context: vscode.ExtensionContext,
    target: OpenTarget,
  ): void {
    JsonOkPanel.disposeCurrent();
    JsonOkPanel.current = new JsonOkPanel(context, target);
  }

  public static disposeCurrent(): void {
    JsonOkPanel.current?.dispose();
  }

  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];

  private constructor(
    private readonly context: vscode.ExtensionContext,
    private target: OpenTarget,
  ) {
    this.panel = vscode.window.createWebviewPanel(
      "jsonok.editor",
      target.title,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri],
      },
    );

    this.panel.webview.html = this.getWebviewHtml(this.panel.webview);

    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        await this.handleMessage(message);
      },
      undefined,
      this.disposables,
    );

    this.panel.onDidDispose(
      () => {
        this.dispose();
      },
      undefined,
      this.disposables,
    );
  }

  private dispose(): void {
    if (JsonOkPanel.current === this) {
      JsonOkPanel.current = undefined;
    }
    while (this.disposables.length > 0) {
      const disposable = this.disposables.pop();
      disposable?.dispose();
    }
    if (this.panel.visible) {
      this.panel.dispose();
    }
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!message || typeof message !== "object") {
      return;
    }

    const payload = message as {
      type?: string;
      model?: JsonNode;
      message?: string;
    };

    switch (payload.type) {
      case "ready":
        this.postInit();
        return;
      case "save":
        if (!payload.model) {
          this.postError("Missing JSON model from webview.");
          return;
        }
        await this.saveToDocument(payload.model);
        return;
      case "cancel":
        this.panel.dispose();
        return;
      default:
        return;
    }
  }

  private postInit(): void {
    this.panel.webview.postMessage({
      type: "init",
      language: vscode.env.language === "en" ? "en" : "zh-CN",
      userLangPref: "auto",
      rootModel: this.target.rootModel,
    });
  }

  private postError(message: string): void {
    this.panel.webview.postMessage({ type: "error", message });
  }

  private async saveToDocument(model: JsonNode): Promise<void> {
    let normalizedModel = model;
    try {
      const document = await vscode.workspace.openTextDocument(this.target.uri);
      if (document.version !== this.target.version) {
        throw new Error(
          "The source document changed after JSONOK was opened. Please reopen JSONOK from the latest editor content.",
        );
      }

      normalizedModel = restoreEmptyCodeTextNodes(model, this.target.rootModel);
      const replacement = renderModelForLanguage(
        normalizedModel,
        this.target.languageId,
      );
      const edit = new vscode.WorkspaceEdit();
      edit.replace(this.target.uri, this.target.range, replacement);
      const applied = await vscode.workspace.applyEdit(edit);
      if (!applied) {
        throw new Error("VS Code rejected the edit.");
      }

      const updatedDocument = await vscode.workspace.openTextDocument(
        this.target.uri,
      );
      const start = this.target.range.start;
      const startOffset = updatedDocument.offsetAt(start);
      const end = updatedDocument.positionAt(startOffset + replacement.length);
      this.target = {
        ...this.target,
        version: updatedDocument.version,
        range: new vscode.Range(start, end),
        rootModel: normalizedModel,
      };

      void vscode.window.showInformationMessage(
        "JSONOK saved changes back to the editor.",
      );
      this.panel.webview.postMessage({
        type: "success",
        message:
          vscode.env.language === "en"
            ? "Saved to editor. You can continue editing."
            : "已保存到编辑器，可继续修改。",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const debugLog = buildSaveDebugLog(model, normalizedModel);
      this.postError(`${message}\n\n[JSONOK debug]\n${debugLog}`);
    }
  }

  private getWebviewHtml(webview: vscode.Webview): string {
    const sourcePath = vscode.Uri.joinPath(
      this.context.extensionUri,
      "indexMonaco.html",
    );
    const rawHtml = fs.readFileSync(sourcePath.fsPath, "utf8");
    const baseHref = `${webview.asWebviewUri(this.context.extensionUri).toString()}/`;
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} https: data: blob:`,
      `font-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'`,
      `worker-src ${webview.cspSource} blob:`,
      `child-src ${webview.cspSource} blob:`,
      `connect-src ${webview.cspSource} https: data: blob:`,
    ].join("; ");

    const injectedHead = `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">\n    <base href="${baseHref}">`;
    const bridgeScript = `<script>\n(function () {\n  const vscode = acquireVsCodeApi();\n\n  function installBridge() {\n    const app = window.App;\n    if (!app || app.__jsonOkVsCodeBridgeInstalled) {\n      return !!app;\n    }\n\n    app.__jsonOkVsCodeBridgeInstalled = true;\n    app.model = null;\n    app.modelNodeMap = {};\n    app.isVsCodeHost = true;\n\n    app.getModelNodeByPath = function (path) {\n      const key = path || '';\n      return this.modelNodeMap && Object.prototype.hasOwnProperty.call(this.modelNodeMap, key)\n        ? this.modelNodeMap[key]\n        : null;\n    };\n\n    app.buildModelNodeMap = function (node, path) {\n      if (!node) return;\n      this.modelNodeMap[path] = node;\n      if (node.kind === 'object' && node.children) {\n        for (const key of Object.keys(node.children)) {\n          const childPath = path ? path + '.' + key : key;\n          this.buildModelNodeMap(node.children[key], childPath);\n        }\n      } else if (node.kind === 'array' && Array.isArray(node.items)) {\n        for (let i = 0; i < node.items.length; i += 1) {\n          this.buildModelNodeMap(node.items[i], path + '[' + i + ']');\n        }\n      }\n    };\n\n    app.modelToData = function (node) {\n      if (!node) return null;\n      if (node.kind === 'object') {\n        const obj = {};\n        for (const key of Object.keys(node.children || {})) {\n          obj[key] = this.modelToData(node.children[key]);\n        }\n        return obj;\n      }\n      if (node.kind === 'array') {\n        return (node.items || []).map((item) => this.modelToData(item));\n      }\n      if (node.kind === 'string' || node.kind === 'codeText') {\n        return node.value == null ? '' : String(node.value);\n      }\n      if (node.kind === 'number') {\n        return typeof node.value === 'number' ? node.value : Number(node.value);\n      }\n      if (node.kind === 'boolean') {\n        return !!node.value;\n      }\n      return null;\n    };\n\n    app.createJsonNodeFromValue = function (value, preferredType) {\n      if (preferredType === 'codeText') {\n        const codeValue = value == null ? '' : String(value);\n        return { kind: 'codeText', value: codeValue, raw: codeValue, editable: true, writeMode: 'code', sourceKind: 'code' };\n      }\n      if (value === null || value === undefined) {\n        return { kind: 'null', value: null, raw: 'null', editable: true, writeMode: 'json' };\n      }\n      if (typeof value === 'boolean') {\n        return { kind: 'boolean', value: value, raw: String(value), editable: true, writeMode: 'json' };\n      }\n      if (typeof value === 'number') {\n        return { kind: 'number', value: value, raw: String(value), editable: true, writeMode: 'json' };\n      }\n      if (Array.isArray(value)) {\n        return { kind: 'array', items: value.map((item) => this.createJsonNodeFromValue(item)), editable: true, writeMode: 'json' };\n      }\n      if (typeof value === 'object') {\n        const children = {};\n        for (const key of Object.keys(value)) {\n          children[key] = this.createJsonNodeFromValue(value[key]);\n        }\n        return { kind: 'object', children: children, editable: true, writeMode: 'json' };\n      }\n      const stringValue = String(value);\n      return { kind: 'string', value: stringValue, raw: JSON.stringify(stringValue), editable: true, writeMode: 'json' };\n    };\n\n    app.rebuildModelFromData = function (data, path) {\n      const originalNode = this.getModelNodeByPath(path);\n      if (data === null || data === undefined) {\n        return { kind: 'null', value: null, raw: 'null', editable: true, writeMode: 'json' };\n      }\n      if (Array.isArray(data)) {\n        return { kind: 'array', items: data.map((item, index) => this.rebuildModelFromData(item, path + '[' + index + ']')), editable: true, writeMode: 'json' };\n      }\n      if (typeof data === 'object') {\n        const children = {};\n        for (const key of Object.keys(data)) {\n          const childPath = path ? path + '.' + key : key;\n          children[key] = this.rebuildModelFromData(data[key], childPath);\n        }\n        return { kind: 'object', children: children, editable: true, writeMode: 'json' };\n      }\n      if (originalNode && originalNode.kind === 'codeText') {\n        const nextValue = String(data);\n        return { kind: 'codeText', value: nextValue, raw: nextValue, editable: true, writeMode: 'code', sourceKind: originalNode.sourceKind || 'code' };\n      }\n      if (typeof data === 'boolean') {\n        return { kind: 'boolean', value: data, raw: String(data), editable: true, writeMode: 'json' };\n      }\n      if (typeof data === 'number') {\n        return { kind: 'number', value: data, raw: String(data), editable: true, writeMode: 'json' };\n      }\n      const nextString = String(data);\n      return { kind: 'string', value: nextString, raw: JSON.stringify(nextString), editable: true, writeMode: 'json' };\n    };\n\n    app.loadRootModel = function (rootModel, language) {\n      this.model = rootModel;\n      this.modelNodeMap = {};\n      this.buildModelNodeMap(rootModel, '');\n      this.data = this.modelToData(rootModel);\n      this.focusPath = '';\n      this.nestedStates = {};\n      this.columnStates = {};\n      if (language) {\n        this.currentLanguage = language;\n        document.documentElement.lang = language;\n      }\n      if (typeof this.setJsonInputValue === 'function') {\n        this.setJsonInputValue(JSON.stringify(this.data, null, 2), { focus: false });\n      }\n      if (typeof this.render === 'function') {\n        this.render();\n      }\n      if (typeof this.setStatus === 'function') {\n        const text = this.currentLanguage === 'zh-CN' ? '数据已加载，可编辑' : 'Data loaded, ready to edit';\n        this.setStatus(text);\n      }\n    };\n\n    const originalApplyTranslations = typeof app.applyTranslations === 'function' ? app.applyTranslations.bind(app) : null;\n    app.applyTranslations = function () {\n      if (originalApplyTranslations) {\n        originalApplyTranslations();\n      }\n      const isZh = this.currentLanguage === 'zh-CN';\n      const exportButton = document.getElementById('btnExport');\n      if (exportButton) {\n        exportButton.textContent = isZh ? '保存' : 'Save';\n        exportButton.title = isZh ? '写回编辑器' : 'Save back to editor';\n      }\n    };\n\n    app.downloadJSON = function () {\n      if (this.data === null && !this.model) {\n        return this.setStatus(this.currentLanguage === 'zh-CN' ? '没有数据' : 'No data', true);\n      }\n      const savedModel = this.rebuildModelFromData(this.data, '');\n      vscode.postMessage({ type: 'save', model: savedModel });\n      this.setStatus(this.currentLanguage === 'zh-CN' ? '正在保存...' : 'Saving...');\n    };\n\n    window.addEventListener('message', function (event) {\n      const message = event.data || {};\n      if (message.type === 'init') {\n        if (message.language) {\n          app.currentLanguage = message.language;\n          document.documentElement.lang = message.language;\n        }\n        app.applyTranslations();\n        app.loadRootModel(message.rootModel, message.language);\n      } else if (message.type === 'error') {\n        app.setStatus(message.message || (app.currentLanguage === 'zh-CN' ? '操作失败' : 'Operation failed'), true);\n      } else if (message.type === 'success') {\n        app.setStatus(message.message || (app.currentLanguage === 'zh-CN' ? '已保存' : 'Saved'));\n      }\n    });\n\n    document.addEventListener('keydown', function (event) {\n      if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 's') {\n        event.preventDefault();\n        app.downloadJSON();\n      }\n    }, true);\n\n    app.applyTranslations();\n    vscode.postMessage({ type: 'ready' });\n    return true;\n  }\n\n  function ensureBridge() {\n    if (!installBridge()) {\n      window.setTimeout(ensureBridge, 50);\n    }\n  }\n\n  ensureBridge();\n})();\n</script>`;

    const finalBridgeScript = bridgeScript
      .replace(
        "raw: nextValue, editable: true, writeMode: 'code', sourceKind: originalNode.sourceKind || 'code'",
        "raw: nextValue.trim() ? nextValue : (typeof originalNode.raw === 'string' ? originalNode.raw : ''), editable: true, writeMode: 'code', sourceKind: originalNode.sourceKind || 'code'",
      )
      .replace(
        "app.setStatus(message.message || (app.currentLanguage === 'zh-CN' ? '操作失败' : 'Operation failed'), true);",
        "const errorText = message.message || (app.currentLanguage === 'zh-CN' ? '操作失败' : 'Operation failed');\n        app.setStatus(errorText, true);\n        window.alert(errorText);",
      );

    return rawHtml
      .replace("<head>", injectedHead)
      .replace("</body>", `${finalBridgeScript}\n</body>`);
  }
}

function extractOpenTarget(editor: vscode.TextEditor): OpenTarget {
  const document = editor.document;
  const selection = editor.selection;
  if (isJsonLanguage(document.languageId)) {
    return extractJsonTarget(document, selection);
  }
  if (isPlainJsonTextLanguage(document.languageId)) {
    return extractLooseTextTarget(document, selection);
  }
  return extractJavaScriptTarget(document, selection);
}

function extractLooseTextTarget(
  document: vscode.TextDocument,
  selection: vscode.Selection,
): OpenTarget {
  const startOffset = document.offsetAt(selection.start);
  const endOffset = document.offsetAt(selection.end);
  const anchorOffset = selection.isEmpty
    ? document.offsetAt(selection.active)
    : Math.max(
        startOffset,
        Math.min(document.offsetAt(selection.active), endOffset - 1),
      );

  if (!selection.isEmpty) {
    const selectedRange = new vscode.Range(selection.start, selection.end);
    const selectedSource = document.getText(selectedRange);
    const trimmedSelectedSource = selectedSource.trim();
    if (trimmedSelectedSource) {
      try {
        const value = JSON.parse(trimmedSelectedSource) as JsonValue;
        return {
          uri: document.uri,
          languageId: document.languageId,
          version: document.version,
          range: selectedRange,
          rootModel: jsonValueToModel(value),
          title: `JSONOK: ${document.fileName.split(/[/\\]/).pop() ?? document.fileName}`,
        };
      } catch {
        const localAnchor = Math.max(
          0,
          Math.min(anchorOffset - startOffset, selectedSource.length - 1),
        );
        const selectedJsonRange =
          findJsonRangeAtOffset(selectedSource, localAnchor) ??
          findOutermostJsonRange(selectedSource);
        if (selectedJsonRange) {
          const parsed = JSON.parse(
            selectedSource.slice(
              selectedJsonRange.start,
              selectedJsonRange.end,
            ),
          ) as JsonValue;
          return {
            uri: document.uri,
            languageId: document.languageId,
            version: document.version,
            range: new vscode.Range(
              document.positionAt(startOffset + selectedJsonRange.start),
              document.positionAt(startOffset + selectedJsonRange.end),
            ),
            rootModel: jsonValueToModel(parsed),
            title: `JSONOK: ${document.fileName.split(/[/\\]/).pop() ?? document.fileName}`,
          };
        }
      }
    }
  }

  const source = document.getText();
  const jsonRange =
    findJsonRangeAtOffset(source, anchorOffset) ?? findUniqueJsonRange(source);
  if (jsonRange) {
    const parsed = JSON.parse(
      source.slice(jsonRange.start, jsonRange.end),
    ) as JsonValue;
    return {
      uri: document.uri,
      languageId: document.languageId,
      version: document.version,
      range: new vscode.Range(
        document.positionAt(jsonRange.start),
        document.positionAt(jsonRange.end),
      ),
      rootModel: jsonValueToModel(parsed),
      title: `JSONOK: ${document.fileName.split(/[/\\]/).pop() ?? document.fileName}`,
    };
  }

  const insertRange = new vscode.Range(selection.active, selection.active);
  return {
    uri: document.uri,
    languageId: document.languageId,
    version: document.version,
    range: insertRange,
    rootModel: emptyObjectModel(),
    title: `JSONOK: ${document.fileName.split(/[/\\]/).pop() ?? document.fileName}`,
  };
}

function extractJsonTarget(
  document: vscode.TextDocument,
  selection: vscode.Selection,
): OpenTarget {
  const range = selection.isEmpty
    ? fullDocumentRange(document)
    : new vscode.Range(selection.start, selection.end);
  const source = document.getText(range).trim();
  if (!source) {
    throw new Error("The selected JSON is empty.");
  }
  const value = JSON.parse(source) as JsonValue;
  return {
    uri: document.uri,
    languageId: document.languageId,
    version: document.version,
    range,
    rootModel: jsonValueToModel(value),
    title: `JSONOK: ${document.fileName.split(/[/\\]/).pop() ?? document.fileName}`,
  };
}

function extractJavaScriptTarget(
  document: vscode.TextDocument,
  selection: vscode.Selection,
): OpenTarget {
  const plugins = getParserPlugins(document.languageId);

  if (!selection.isEmpty) {
    const range = new vscode.Range(selection.start, selection.end);
    const source = document.getText(range).trim();
    if (!source) {
      throw new Error("The selected JavaScript is empty.");
    }
    const expression = parseSelectedExpression(source, plugins);
    return {
      uri: document.uri,
      languageId: document.languageId,
      version: document.version,
      range,
      rootModel: astNodeToModel(expression, source),
      title: `JSONOK: ${document.fileName.split(/[/\\]/).pop() ?? document.fileName}`,
    };
  }

  const source = document.getText();
  const offset = document.offsetAt(selection.active);
  let match: { node: t.Expression; start: number; end: number } | null = null;

  try {
    const fileAst = parse(source, {
      sourceType: "unambiguous",
      plugins,
      errorRecovery: false,
    });
    match = findRootEditableTargetAtOffset(fileAst.program, offset);
  } catch {
    match = findBracketedJavaScriptExpressionAtOffset(source, offset, plugins);
  }

  if (!match) {
    throw new Error(
      "No editable JSON/JS expression was found at the cursor. Select a JSON object/array or place the cursor inside one.",
    );
  }

  const range = new vscode.Range(
    document.positionAt(match.start),
    document.positionAt(match.end),
  );
  const expressionSource = source.slice(match.start, match.end);
  return {
    uri: document.uri,
    languageId: document.languageId,
    version: document.version,
    range,
    rootModel: astNodeToModel(match.node, source),
    title: `JSONOK: ${document.fileName.split(/[/\\]/).pop() ?? document.fileName}`,
  };
}

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

function jsonValueToModel(value: JsonValue): JsonNode {
  if (value === null) {
    return {
      kind: "null",
      value: null,
      editable: true,
      raw: "null",
      writeMode: "json",
    };
  }
  if (typeof value === "boolean") {
    return {
      kind: "boolean",
      value,
      editable: true,
      raw: String(value),
      writeMode: "json",
    };
  }
  if (typeof value === "number") {
    return {
      kind: "number",
      value,
      editable: true,
      raw: String(value),
      writeMode: "json",
    };
  }
  if (typeof value === "string") {
    return {
      kind: "string",
      value,
      editable: true,
      raw: JSON.stringify(value),
      writeMode: "json",
    };
  }
  if (Array.isArray(value)) {
    return {
      kind: "array",
      items: value.map(jsonValueToModel),
      editable: true,
      writeMode: "json",
    };
  }
  const children: Record<string, JsonNode> = {};
  for (const [key, child] of Object.entries(value)) {
    children[key] = jsonValueToModel(child);
  }
  return { kind: "object", children, editable: true, writeMode: "json" };
}

function astNodeToModel(node: t.Node, source: string): JsonNode {
  const nodeSource = sliceNodeSource(source, node);

  if (t.isObjectExpression(node)) {
    const children: Record<string, JsonNode> = {};
    for (const property of node.properties) {
      if (t.isSpreadElement(property)) {
        return codeTextNode(nodeSource);
      }

      if (t.isObjectMethod(property)) {
        if (property.computed) {
          return codeTextNode(nodeSource);
        }
        const key = extractObjectKey(property.key);
        if (!key) {
          return codeTextNode(nodeSource);
        }
        children[key] = codeTextNode(objectMethodToExpressionSource(property));
        continue;
      }

      if (!t.isObjectProperty(property) || property.computed) {
        return codeTextNode(nodeSource);
      }

      const key = extractObjectKey(property.key);
      if (!key || !t.isExpression(property.value)) {
        return codeTextNode(nodeSource);
      }

      children[key] = astNodeToModel(property.value, source);
    }
    return { kind: "object", children, editable: true, writeMode: "json" };
  }

  if (t.isArrayExpression(node)) {
    const items = node.elements.map((element) => {
      if (!element) {
        return codeTextNode("undefined");
      }
      if (t.isSpreadElement(element)) {
        return codeTextNode(sliceNodeSource(source, element));
      }
      return astNodeToModel(element, source);
    });
    return { kind: "array", items, editable: true, writeMode: "json" };
  }

  if (t.isStringLiteral(node)) {
    return {
      kind: "string",
      value: node.value,
      editable: true,
      raw: JSON.stringify(node.value),
      writeMode: "json",
    };
  }

  if (t.isNumericLiteral(node)) {
    return {
      kind: "number",
      value: node.value,
      editable: true,
      raw: String(node.value),
      writeMode: "json",
    };
  }

  if (t.isBooleanLiteral(node)) {
    return {
      kind: "boolean",
      value: node.value,
      editable: true,
      raw: String(node.value),
      writeMode: "json",
    };
  }

  if (t.isNullLiteral(node)) {
    return {
      kind: "null",
      value: null,
      editable: true,
      raw: "null",
      writeMode: "json",
    };
  }

  if (t.isTemplateLiteral(node) && node.expressions.length === 0) {
    const cooked = node.quasis
      .map((item) => item.value.cooked ?? item.value.raw)
      .join("");
    return {
      kind: "string",
      value: cooked,
      editable: true,
      raw: JSON.stringify(cooked),
      writeMode: "json",
    };
  }

  if (
    t.isUnaryExpression(node) &&
    node.operator === "-" &&
    t.isNumericLiteral(node.argument)
  ) {
    return {
      kind: "number",
      value: -node.argument.value,
      editable: true,
      raw: `-${node.argument.value}`,
      writeMode: "json",
    };
  }

  return codeTextNode(nodeSource);
}

function renderModelForLanguage(model: JsonNode, languageId: string): string {
  if (isJsonLanguage(languageId) || isPlainJsonTextLanguage(languageId)) {
    return JSON.stringify(modelToJsonValue(model), null, 2);
  }
  const expression = modelToExpression(model, getParserPlugins(languageId));
  return generate(expression, {
    comments: false,
    retainFunctionParens: true,
    jsescOption: { minimal: true },
  }).code;
}

function modelToJsonValue(model: JsonNode): JsonValue {
  switch (model.kind) {
    case "object": {
      const result: Record<string, JsonValue> = {};
      for (const [key, child] of Object.entries(model.children)) {
        result[key] = modelToJsonValue(child);
      }
      return result;
    }
    case "array":
      return model.items.map(modelToJsonValue);
    case "string":
      return model.value;
    case "number":
      return model.value;
    case "boolean":
      return model.value;
    case "null":
      return null;
    case "codeText":
      throw new Error(
        "JSON documents cannot contain JavaScript-only expressions.",
      );
  }
}

function modelToExpression(
  model: JsonNode,
  plugins: ParserPlugin[],
): t.Expression {
  switch (model.kind) {
    case "object": {
      const properties = Object.entries(model.children).map(([key, child]) => {
        const keyNode = t.isValidIdentifier(key)
          ? t.identifier(key)
          : t.stringLiteral(key);
        return t.objectProperty(keyNode, modelToExpression(child, plugins));
      });
      return t.objectExpression(properties);
    }
    case "array":
      return t.arrayExpression(
        model.items.map((item) => modelToExpression(item, plugins)),
      );
    case "string":
      return t.stringLiteral(model.value);
    case "number":
      return t.numericLiteral(model.value);
    case "boolean":
      return t.booleanLiteral(model.value);
    case "null":
      return t.nullLiteral();
    case "codeText": {
      const codeModel = model as JsonCodeTextNode;
      const source = resolveCodeTextSource(codeModel);
      if (!source) {
        throw new Error(
          "A JavaScript expression became empty and cannot be written back.",
        );
      }
      return parseCodeTextExpression(source, plugins);
    }
  }
}

function codeTextNode(source: string): JsonCodeTextNode {
  const value = source.trim();
  return {
    kind: "codeText",
    value,
    raw: value,
    editable: true,
    writeMode: "code",
    sourceKind: "code",
  };
}

function restoreEmptyCodeTextNodes(
  model: JsonNode,
  previous: JsonNode | undefined,
): JsonNode {
  if (model.kind === "codeText") {
    const codeModel = model as JsonCodeTextNode;
    const value = resolveCodeTextSource(codeModel);
    if (value) {
      return model;
    }
    if (previous?.kind === "codeText") {
      return previous;
    }
    return model;
  }

  if (model.kind === "object") {
    const previousChildren =
      previous?.kind === "object" ? previous.children : {};
    const nextChildren: Record<string, JsonNode> = {};
    for (const [key, child] of Object.entries(model.children)) {
      nextChildren[key] = restoreEmptyCodeTextNodes(
        child,
        previousChildren[key],
      );
    }
    return { ...model, children: nextChildren };
  }

  if (model.kind === "array") {
    const previousItems = previous?.kind === "array" ? previous.items : [];
    return {
      ...model,
      items: model.items.map((item, index) =>
        restoreEmptyCodeTextNodes(item, previousItems[index]),
      ),
    };
  }

  return model;
}

function buildSaveDebugLog(model: JsonNode, normalizedModel: JsonNode): string {
  const inputEmptyPaths = collectEmptyCodeTextPaths(model);
  const normalizedEmptyPaths = collectEmptyCodeTextPaths(normalizedModel);
  return [
    `inputCodeTextCount=${countCodeTextNodes(model)}`,
    `normalizedCodeTextCount=${countCodeTextNodes(normalizedModel)}`,
    `inputEmptyCodeTextPaths=${inputEmptyPaths.length ? inputEmptyPaths.join(", ") : "(none)"}`,
    `normalizedEmptyCodeTextPaths=${normalizedEmptyPaths.length ? normalizedEmptyPaths.join(", ") : "(none)"}`,
  ].join("\n");
}

function collectEmptyCodeTextPaths(model: JsonNode, path = "$"): string[] {
  if (model.kind === "codeText") {
    const codeModel = model as JsonCodeTextNode;
    const value = resolveCodeTextSource(codeModel);
    return value ? [] : [path];
  }
  if (model.kind === "object") {
    return Object.entries(model.children).flatMap(([key, child]) =>
      collectEmptyCodeTextPaths(child, `${path}.${key}`),
    );
  }
  if (model.kind === "array") {
    return model.items.flatMap((item, index) =>
      collectEmptyCodeTextPaths(item, `${path}[${index}]`),
    );
  }
  return [];
}

function countCodeTextNodes(model: JsonNode): number {
  if (model.kind === "codeText") {
    return 1;
  }
  if (model.kind === "object") {
    return Object.values(model.children).reduce(
      (count, child) => count + countCodeTextNodes(child),
      0,
    );
  }
  if (model.kind === "array") {
    return model.items.reduce(
      (count, item) => count + countCodeTextNodes(item),
      0,
    );
  }
  return 0;
}

function resolveCodeTextSource(model: JsonCodeTextNode): string {
  const value = String(model.value ?? "").trim();
  if (value) {
    return value;
  }
  return String(model.raw ?? "").trim();
}

function parseCodeTextExpression(
  source: string,
  plugins: ParserPlugin[],
): t.Expression {
  try {
    return parseSelectedExpression(source, plugins);
  } catch {
    try {
      return parseExpression(`(${source})`, { plugins }) as t.Expression;
    } catch {
      const objectMethod = parseObjectMemberAsExpression(source, plugins);
      if (objectMethod) {
        return objectMethod;
      }
      throw new Error(
        "The JavaScript code cell could not be written back. Please keep it as a valid expression or function.",
      );
    }
  }
}

function parseSelectedExpression(
  source: string,
  plugins: ParserPlugin[],
): t.Expression {
  try {
    return parseExpression(source, { plugins }) as t.Expression;
  } catch {
    const fileAst = parse(source, {
      sourceType: "unambiguous",
      plugins,
      errorRecovery: false,
    });
    if (fileAst.program.body.length !== 1) {
      throw new Error("The selection is not a single JSON/JS expression.");
    }
    const statement = fileAst.program.body[0];
    if (t.isExpressionStatement(statement)) {
      return statement.expression;
    }
    if (
      t.isVariableDeclaration(statement) &&
      statement.declarations.length === 1
    ) {
      const initializer = statement.declarations[0].init;
      if (initializer && t.isExpression(initializer)) {
        return initializer;
      }
    }
    if (
      t.isExportDefaultDeclaration(statement) &&
      t.isExpression(statement.declaration)
    ) {
      return statement.declaration;
    }
    throw new Error("The selection is not a single JSON/JS expression.");
  }
}

function extractObjectKey(
  key: t.Expression | t.Identifier | t.PrivateName,
): string | null {
  if (t.isIdentifier(key)) {
    return key.name;
  }
  if (t.isStringLiteral(key)) {
    return key.value;
  }
  if (t.isNumericLiteral(key)) {
    return String(key.value);
  }
  return null;
}

function sliceNodeSource(source: string, node: t.Node): string {
  if (typeof node.start !== "number" || typeof node.end !== "number") {
    return source;
  }
  return source.slice(node.start, node.end);
}

function parseObjectMemberAsExpression(
  source: string,
  plugins: ParserPlugin[],
): t.Expression | null {
  try {
    const fileAst = parse(`({${source}})`, {
      sourceType: "unambiguous",
      plugins,
      errorRecovery: false,
    });
    if (fileAst.program.body.length !== 1) {
      return null;
    }
    const statement = fileAst.program.body[0];
    if (!t.isExpressionStatement(statement)) {
      return null;
    }
    if (!t.isObjectExpression(statement.expression)) {
      return null;
    }
    if (statement.expression.properties.length !== 1) {
      return null;
    }
    const [property] = statement.expression.properties;
    if (t.isObjectMethod(property)) {
      return t.functionExpression(
        null,
        property.params,
        property.body,
        property.generator,
        property.async,
      );
    }
    if (t.isObjectProperty(property) && t.isExpression(property.value)) {
      return property.value;
    }
  } catch {
    return null;
  }
  return null;
}

function objectMethodToExpressionSource(node: t.ObjectMethod): string {
  const expression = t.functionExpression(
    null,
    node.params,
    node.body,
    node.generator,
    node.async,
  );
  expression.returnType = node.returnType;
  expression.typeParameters = node.typeParameters;
  return generate(expression, {
    comments: false,
    retainFunctionParens: true,
    jsescOption: { minimal: true },
  }).code;
}

function emptyObjectModel(): JsonObjectNode {
  return {
    kind: "object",
    children: {},
    editable: true,
    writeMode: "json",
  };
}

function isPlainJsonTextLanguage(languageId: string): boolean {
  return languageId === "markdown" || languageId === "plaintext";
}

function findJsonRangeAtOffset(
  source: string,
  offset: number,
): { start: number; end: number } | null {
  let best: { start: number; end: number } | null = null;
  for (let start = offset; start >= 0; start -= 1) {
    const current = source[start];
    if (current !== "{" && current !== "[") {
      continue;
    }
    const end = findMatchingJsonBracket(source, start);
    if (end === null || offset < start || offset >= end) {
      continue;
    }
    const snippet = source.slice(start, end);
    try {
      JSON.parse(snippet);
      const nextSpan = end - start;
      const bestSpan = best ? best.end - best.start : 0;
      if (nextSpan > bestSpan) {
        best = { start, end };
      }
    } catch {
      // Ignore invalid JSON candidates.
    }
  }
  return best;
}

function findOutermostJsonRange(
  source: string,
): { start: number; end: number } | null {
  let best: { start: number; end: number } | null = null;
  for (let start = 0; start < source.length; start += 1) {
    const current = source[start];
    if (current !== "{" && current !== "[") {
      continue;
    }
    const end = findMatchingJsonBracket(source, start);
    if (end === null) {
      continue;
    }
    const snippet = source.slice(start, end);
    try {
      JSON.parse(snippet);
      const nextSpan = end - start;
      const bestSpan = best ? best.end - best.start : 0;
      if (nextSpan > bestSpan) {
        best = { start, end };
      }
    } catch {
      // Ignore invalid JSON candidates.
    }
  }
  return best;
}

function findUniqueJsonRange(
  source: string,
): { start: number; end: number } | null {
  const matches: Array<{ start: number; end: number }> = [];
  for (let start = 0; start < source.length; start += 1) {
    const current = source[start];
    if (current !== "{" && current !== "[") {
      continue;
    }
    const end = findMatchingJsonBracket(source, start);
    if (end === null) {
      continue;
    }
    const snippet = source.slice(start, end);
    try {
      JSON.parse(snippet);
      matches.push({ start, end });
    } catch {
      // Ignore invalid JSON candidates.
    }
  }

  if (matches.length !== 1) {
    return null;
  }
  return matches[0];
}

function findBracketedJavaScriptExpressionAtOffset(
  source: string,
  offset: number,
  plugins: ParserPlugin[],
): { start: number; end: number; node: t.Expression } | null {
  let best: { start: number; end: number; node: t.Expression } | null = null;

  for (let start = offset; start >= 0; start -= 1) {
    const current = source[start];
    if (current !== "{" && current !== "[") {
      continue;
    }

    const end = findMatchingBracket(source, start);
    if (end === null || offset < start || offset >= end) {
      continue;
    }

    const snippet = source.slice(start, end);
    try {
      const expression = parseSelectedExpression(snippet, plugins);
      const nextSpan = end - start;
      const bestSpan = best ? best.end - best.start : 0;
      if (nextSpan > bestSpan) {
        best = { start, end, node: expression };
      }
    } catch {
      // Ignore invalid JS expression candidates.
    }
  }

  return best;
}

function findMatchingJsonBracket(source: string, start: number): number | null {
  return findMatchingBracket(source, start, { jsonOnly: true });
}

function findMatchingBracket(
  source: string,
  start: number,
  options?: { jsonOnly?: boolean },
): number | null {
  const opening = source[start];
  const closing = opening === "{" ? "}" : opening === "[" ? "]" : "";
  if (!closing) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let stringQuote = '"';
  let escaping = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const next = index + 1 < source.length ? source[index + 1] : "";

    if (inLineComment) {
      if (char === "\n" || char === "\r") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      if (escaping) {
        escaping = false;
        continue;
      }
      if (char === "\\") {
        escaping = true;
        continue;
      }
      if (char === stringQuote) {
        inString = false;
      }
      continue;
    }

    if (char === "/" && !options?.jsonOnly) {
      if (next === "/") {
        inLineComment = true;
        index += 1;
        continue;
      }
      if (next === "*") {
        inBlockComment = true;
        index += 1;
        continue;
      }
    }

    if (
      char === '"' ||
      (!options?.jsonOnly && (char === "'" || char === "`"))
    ) {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === opening) {
      depth += 1;
      continue;
    }

    if (char === closing) {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
    }
  }

  return null;
}

function isJsonLanguage(languageId: string): boolean {
  return languageId === "json" || languageId === "jsonc";
}

function fullDocumentRange(document: vscode.TextDocument): vscode.Range {
  const lastLine = document.lineAt(document.lineCount - 1);
  return new vscode.Range(0, 0, document.lineCount - 1, lastLine.text.length);
}

function getParserPlugins(languageId: string): ParserPlugin[] {
  const plugins: ParserPlugin[] = ["decorators-legacy"];
  if (
    languageId === "typescript" ||
    languageId === "typescriptreact" ||
    languageId === "vue" ||
    languageId === "svelte" ||
    languageId === "astro"
  ) {
    plugins.push("typescript");
  }
  if (
    languageId === "javascriptreact" ||
    languageId === "typescriptreact" ||
    languageId === "html" ||
    languageId === "vue" ||
    languageId === "svelte" ||
    languageId === "astro"
  ) {
    plugins.push("jsx");
  }
  return plugins;
}

function findRootEditableTargetAtOffset(
  root: t.Node,
  offset: number,
): { node: t.Expression; start: number; end: number } | null {
  const matches: EditableTargetMatch[] = [];

  const visit = (
    node: t.Node | null | undefined,
    parent?: t.Node,
    parentKey?: string,
  ): void => {
    if (
      !node ||
      typeof node.start !== "number" ||
      typeof node.end !== "number"
    ) {
      return;
    }
    if (offset < node.start || offset > node.end) {
      return;
    }

    const candidate = toEditableTargetCandidate(node, parent, parentKey);
    if (candidate) {
      matches.push(candidate);
    }

    for (const [key, value] of Object.entries(node)) {
      if (
        key === "loc" ||
        key === "leadingComments" ||
        key === "innerComments" ||
        key === "trailingComments"
      ) {
        continue;
      }
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child === "object" && "type" in child) {
            visit(child as t.Node, node, key);
          }
        }
      } else if (value && typeof value === "object" && "type" in value) {
        visit(value as t.Node, node, key);
      }
    }
  };

  visit(root);
  if (matches.length === 0) {
    return null;
  }
  matches.sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }
    const rightSpan = right.end - right.start;
    const leftSpan = left.end - left.start;
    return rightSpan - leftSpan;
  });
  const [selected] = matches;
  return {
    node: selected.node,
    start: selected.start,
    end: selected.end,
  };
}

function toEditableTargetCandidate(
  node: t.Node,
  parent?: t.Node,
  parentKey?: string,
): EditableTargetMatch | null {
  if (
    t.isVariableDeclarator(node) &&
    node.init &&
    t.isExpression(node.init) &&
    typeof node.init.start === "number" &&
    typeof node.init.end === "number"
  ) {
    return {
      node: node.init,
      start: node.init.start,
      end: node.init.end,
      priority: 400,
    };
  }

  if (
    t.isAssignmentExpression(node) &&
    t.isExpression(node.right) &&
    typeof node.right.start === "number" &&
    typeof node.right.end === "number"
  ) {
    return {
      node: node.right,
      start: node.right.start,
      end: node.right.end,
      priority: 350,
    };
  }

  if (
    t.isExportDefaultDeclaration(node) &&
    t.isExpression(node.declaration) &&
    typeof node.declaration.start === "number" &&
    typeof node.declaration.end === "number"
  ) {
    return {
      node: node.declaration,
      start: node.declaration.start,
      end: node.declaration.end,
      priority: 320,
    };
  }

  if (
    t.isExpressionStatement(node) &&
    typeof node.expression.start === "number" &&
    typeof node.expression.end === "number"
  ) {
    return {
      node: node.expression,
      start: node.expression.start,
      end: node.expression.end,
      priority: 300,
    };
  }

  if (!t.isExpression(node)) {
    return null;
  }
  if (
    t.isIdentifier(node) &&
    parent &&
    t.isObjectProperty(parent) &&
    parentKey === "key" &&
    !parent.computed
  ) {
    return null;
  }
  if (
    t.isStringLiteral(node) &&
    parent &&
    t.isObjectProperty(parent) &&
    parentKey === "key" &&
    !parent.computed
  ) {
    return null;
  }
  if (
    t.isNumericLiteral(node) &&
    parent &&
    t.isObjectProperty(parent) &&
    parentKey === "key" &&
    !parent.computed
  ) {
    return null;
  }
  if (typeof node.start !== "number" || typeof node.end !== "number") {
    return null;
  }
  return {
    node,
    start: node.start,
    end: node.end,
    priority: 100,
  };
}
