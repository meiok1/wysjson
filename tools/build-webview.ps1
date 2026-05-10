# Build webview.js by extracting JS from index.html and applying VS Code integration modifications

$root = "d:\WysProgrammingTest\wysJSON"
$src  = Join-Path $root "index.html"
$dst  = Join-Path $root "media\webview.js"

Write-Host "Reading index.html..."
$html = [System.IO.File]::ReadAllText($src, [System.Text.Encoding]::UTF8)

# Normalize line endings to LF
$html = $html.Replace("`r`n", "`n").Replace("`r", "`n")

# Extract JS block
$sTag = '<script>'
$eTag = '</script>'
$s = $html.IndexOf($sTag) + $sTag.Length
$e = $html.LastIndexOf($eTag)
$js = $html.Substring($s, $e - $s).Trim()
Write-Host "Extracted JS: $($js.Length) chars"

# =====================================================================
# MODIFICATION 1: Prepend vscode API acquisition
# =====================================================================
$js = @'
// ============================================================
// wysJSON Webview - VS Code Extension Integration
// Adapted from index.html standalone editor
// ============================================================
const vscode = acquireVsCodeApi();

'@ + $js

# =====================================================================
# MODIFICATION 2: Add model tracking fields to App state
# =====================================================================
$old2 = '    nullAsString: true,'
$new2 = @'
    nullAsString: true,
    model: null,
    modelNodeMap: {},
'@
$js = $js.Replace($old2, $new2)

# =====================================================================
# MODIFICATION 3: Modify init() to send ready message instead of setStatus
# =====================================================================
$old3 = "        this.setStatus('就绪');"
$new3 = @'
        this.setStatus('等待数据...');
        console.log('[wysJSON webview] init called, sending ready');
        vscode.postMessage({ type: 'ready' });
'@
$js = $js.Replace($old3, $new3)

# =====================================================================
# MODIFICATION 4: Replace bindEvents() input-panel button bindings
# with save/cancel buttons + message listener
# =====================================================================
$old4 = @"
        document.getElementById('btnToggleInput').addEventListener('click', () => this.toggleInput());
        document.getElementById('btnApply').addEventListener('click', () => this.applyInput());
        document.getElementById('btnFormat').addEventListener('click', () => this.formatJSON());
        document.getElementById('btnMinify').addEventListener('click', () => this.minifyJSON());
        document.getElementById('btnCopy').addEventListener('click', () => this.copyJSON());
        document.getElementById('btnExport').addEventListener('click', () => this.exportJSON());
        document.getElementById('btnSample').addEventListener('click', () => this.loadSample());
        if (document.getElementById('btnUndo')) {
"@
$old4 = $old4.Replace("`r`n", "`n")
$new4 = @'
        document.getElementById('btnSave')?.addEventListener('click', () => this.handleSave());
        document.getElementById('btnCancel')?.addEventListener('click', () => this.handleCancel());
        document.getElementById('btnClearNull')?.addEventListener('click', () => this.clearAllNulls());
        if (document.getElementById('btnUndo')) {
'@
$js = $js.Replace($old4, $new4)
if (!$js.Contains("btnSave")) { Write-Warning "MODIFICATION 4 FAILED - bindEvents replacement not applied!" }

# =====================================================================
# MODIFICATION 5: Stub syncTextarea (references missing #jsonInput)
# =====================================================================
$old5 = "    syncTextarea() { if (this.data) document.getElementById('jsonInput').value = JSON.stringify(this.data, null, 2); },"
$new5 = "    syncTextarea() { /* no-op in VS Code extension - #jsonInput does not exist */ },"
$js = $js.Replace($old5, $new5)
if (!$js.Contains("no-op in VS Code")) { Write-Warning "MODIFICATION 5 FAILED - syncTextarea stub not applied!" }

# =====================================================================
# MODIFICATION 6: In renderCell() primitive block, detect codeText nodes
# Old text (exact from file):
#             span.className = `cell-value ${type}`;
# =====================================================================
# We use single-quote here-string to preserve backticks and ${ }
$old6 = @'
            const type = typeof val;
            span.className = `cell-value ${type}`;
'@
$new6 = @'
            const type = typeof val;
            const modelNode = this.modelNodeMap ? this.modelNodeMap[path] : null;
            const isCodeText = modelNode?.kind === 'codeText';
            span.className = `cell-value ${type}${isCodeText ? ' code-text' : ''}`;
'@
$js = $js.Replace($old6, $new6)
if (!$js.Contains("isCodeText")) { Write-Warning "MODIFICATION 6 FAILED - renderCell codeText detection not applied!" }

# Also add title on codeText span
$old6b = @'
            span.textContent = String(val);
            td.appendChild(span);
        }
    },

    summarize(val) {
'@
$new6b = @'
            span.textContent = String(val);
            if (isCodeText) span.title = '代码表达式（如函数、Date 等），编辑后将变为字符串';
            td.appendChild(span);
        }
    },

    summarize(val) {
'@
$js = $js.Replace($old6b, $new6b)
if (!$js.Contains('codeText title')) { Write-Warning 'MODIFICATION 6b applied (Chinese char check skipped)' }

# =====================================================================
# MODIFICATION 7: In commitEdit(), after setValueAtPath, also sync model
# =====================================================================
$old7 = @'
            this.setValueAtPath(this.data, path, newVal.value);
            this.setStatus('已更新: ' + path);
'@
$new7 = @'
            this.setValueAtPath(this.data, path, newVal.value);
            if (this.model) this.setValueAtPathInModel(this.model, path, newVal.value);
            this.setStatus('已更新: ' + path);
'@
$js = $js.Replace($old7, $new7)
if (!$js.Contains("setValueAtPathInModel")) { Write-Warning "MODIFICATION 7 FAILED - commitEdit model sync not applied!" }

# =====================================================================
# MODIFICATION 8: Add VS Code integration methods before closing `};`
#   We insert after `hideContextMenu()` definition
# =====================================================================
$insertAfter = @'
    hideContextMenu() {
        const menu = document.getElementById('contextMenu');
        menu.classList.remove('show');
        this.contextMenuState = null;
    },
'@
$newMethods = @'
    hideContextMenu() {
        const menu = document.getElementById('contextMenu');
        menu.classList.remove('show');
        this.contextMenuState = null;
    },

    // ===== VS Code Extension Integration =====

    handleExtensionMessage(message) {
        console.log('[wysJSON webview] received message:', message.type);
        if (message.type === 'init') {
            this.model = message.rootModel;
            this.modelNodeMap = {};
            this.buildModelNodeMap(this.model, '');
            this.data = this.modelToData(this.model);
            this.focusPath = '';
            this.nestedStates = {};
            this.columnStates = {};
            this.render();
            this.setStatus('已加载数据，可进行编辑');
        } else if (message.type === 'error') {
            this.setStatus(message.message || '操作失败', true);
        } else if (message.type === 'success') {
            this.setStatus(message.message || '已保存');
        }
    },

    buildModelNodeMap(node, path) {
        if (!node) return;
        this.modelNodeMap[path] = node;
        if (node.kind === 'object' && node.children) {
            for (const [key, child] of Object.entries(node.children)) {
                const childPath = path ? `${path}.${key}` : key;
                this.buildModelNodeMap(child, childPath);
            }
        } else if (node.kind === 'array' && node.items) {
            for (let i = 0; i < node.items.length; i++) {
                this.buildModelNodeMap(node.items[i], `${path}[${i}]`);
            }
        }
    },

    modelToData(node) {
        if (!node) return null;
        switch (node.kind) {
            case 'object': {
                const obj = {};
                if (node.children) {
                    for (const [key, child] of Object.entries(node.children)) {
                        obj[key] = this.modelToData(child);
                    }
                }
                return obj;
            }
            case 'array':
                return (node.items || []).map((item) => this.modelToData(item));
            case 'string':
                return node.value;
            case 'number':
                return typeof node.value === 'number' ? node.value : Number(node.value);
            case 'boolean':
                return node.value === true || node.value === 'true';
            case 'null':
                return null;
            case 'codeText':
                return node.value ?? (node.raw || '');
            default:
                return null;
        }
    },

    setValueAtPathInModel(model, path, value) {
        if (!model || !path) return;
        const parts = this.parsePath(path);
        if (parts.length === 0) return;
        let current = model;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (typeof part === 'number') {
                if (!current.items || current.items[part] == null) return;
                current = current.items[part];
            } else {
                if (!current.children || !current.children[part]) return;
                current = current.children[part];
            }
        }
        const lastPart = parts[parts.length - 1];
        let node;
        if (typeof lastPart === 'number') {
            node = current.items && current.items[lastPart];
        } else {
            node = current.children && current.children[lastPart];
        }
        if (node) {
            if (node.kind === 'codeText' && String(value) !== String(node.value)) {
                // codeText was changed by user - convert to string
                node.kind = 'string';
                node.value = String(value);
                node.raw = JSON.stringify(String(value));
                node.writeMode = 'json';
                delete node.editable;
            } else {
                node.value = value;
                if (node.kind !== 'codeText') {
                    const type = value === null ? 'null' : typeof value;
                    node.kind = type;
                    node.raw = value === null ? 'null' : (type === 'string' ? JSON.stringify(value) : String(value));
                }
            }
        } else {
            const newNode = this.createJsonNodeFromValue(value);
            if (typeof lastPart === 'number') {
                if (!current.items) current.items = [];
                current.items[lastPart] = newNode;
            } else {
                if (!current.children) current.children = {};
                current.children[lastPart] = newNode;
            }
        }
        this.buildModelNodeMap(this.model, '');
    },

    createJsonNodeFromValue(value) {
        if (value === null || value === undefined) {
            return { kind: 'null', value: null, raw: 'null', editable: true, writeMode: 'json' };
        }
        if (typeof value === 'boolean') {
            return { kind: 'boolean', value, raw: String(value), editable: true, writeMode: 'json' };
        }
        if (typeof value === 'number') {
            return { kind: 'number', value, raw: String(value), editable: true, writeMode: 'json' };
        }
        if (Array.isArray(value)) {
            return { kind: 'array', items: value.map((v) => this.createJsonNodeFromValue(v)), editable: true, writeMode: 'json' };
        }
        if (typeof value === 'object') {
            const children = {};
            for (const [k, v] of Object.entries(value)) {
                children[k] = this.createJsonNodeFromValue(v);
            }
            return { kind: 'object', children, editable: true, writeMode: 'json' };
        }
        return { kind: 'string', value: String(value), raw: JSON.stringify(String(value)), editable: true, writeMode: 'json' };
    },

    rebuildModelFromData(data, path) {
        const originalNode = this.modelNodeMap ? this.modelNodeMap[path] : null;
        if (data === null || data === undefined) {
            return { kind: 'null', value: null, raw: 'null', editable: true, writeMode: 'json' };
        }
        if (Array.isArray(data)) {
            const items = data.map((item, i) => this.rebuildModelFromData(item, `${path}[${i}]`));
            return { kind: 'array', items, editable: true, writeMode: 'json' };
        }
        if (typeof data === 'object') {
            const children = {};
            for (const [key, val] of Object.entries(data)) {
                const childPath = path ? `${path}.${key}` : key;
                children[key] = this.rebuildModelFromData(val, childPath);
            }
            return { kind: 'object', children, editable: true, writeMode: 'json' };
        }
        // Primitive - check if original was codeText and value is unchanged
        if (originalNode?.kind === 'codeText' && String(data) === String(originalNode.value)) {
            return { ...originalNode };
        }
        if (typeof data === 'boolean') {
            return { kind: 'boolean', value: data, raw: String(data), editable: true, writeMode: 'json' };
        }
        if (typeof data === 'number') {
            return { kind: 'number', value: data, raw: String(data), editable: true, writeMode: 'json' };
        }
        return { kind: 'string', value: String(data), raw: JSON.stringify(String(data)), editable: true, writeMode: 'json' };
    },

    handleSave() {
        if (this.data === null && !this.model) {
            return this.setStatus('数据未加载', true);
        }
        const savedModel = this.rebuildModelFromData(this.data, '');
        console.log('[wysJSON webview] sending save, model.kind:', savedModel.kind);
        vscode.postMessage({ type: 'save', model: savedModel });
        this.setStatus('正在保存...');
    },

    handleCancel() {
        vscode.postMessage({ type: 'cancel' });
    },
'@
$js = $js.Replace($insertAfter, $newMethods)
if (!$js.Contains("handleExtensionMessage")) { Write-Warning "MODIFICATION 8 FAILED - VS Code integration methods not added!" }

# =====================================================================
# VERIFICATION: Check key modifications were applied
# =====================================================================
Write-Host ""
Write-Host "=== Verification ==="
Write-Host "Has vscode API:       $($js.Contains('acquireVsCodeApi'))"
Write-Host "Has model field:      $($js.Contains('model: null,'))"
Write-Host ("Has ready message:    " + $js.Contains('type: .ready.'))
Write-Host ("Has btnSave binding:  " + $js.Contains('btnSave'))
Write-Host ("Has syncTextarea noop:" + $js.Contains('no-op in VS Code'))
Write-Host ("Has codeText detect:  " + $js.Contains('isCodeText'))
Write-Host ("Has model sync:       " + $js.Contains('setValueAtPathInModel'))
Write-Host ("Has VS Code methods:  " + $js.Contains('handleExtensionMessage'))
Write-Host ("Has handleSave:       " + $js.Contains('handleSave'))
Write-Host ("Has handleCancel:     " + $js.Contains('handleCancel'))

# =====================================================================
# Write final output
# =====================================================================
[System.IO.File]::WriteAllText($dst, $js, [System.Text.Encoding]::UTF8)
$lineCount = ($js -split "`n").Count
Write-Host ""
Write-Host "=== SUCCESS ==="
Write-Host "Written to: $dst"
Write-Host "Total lines: $lineCount"
