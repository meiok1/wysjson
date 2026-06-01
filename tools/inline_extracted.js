
        // ============================================================
        // wysJSON - Nested JSON Table Editor
        // Designed to be portable to VS Code Extension
        // ============================================================

        const App = {
            uiStateStorageKey: 'wysjson.ui-state.v1',
            data: null,
            nestedStates: {}, // track expand/collapse state by path
            columnStates: {}, // track header-level expand/collapse state by path
            selectedCell: null,
            editingCell: null,
            hoveredCell: null,
            selectionAnchorCell: null,
            selectedRangeCells: [],
            isMouseSelecting: false,
            mouseSelectionMoved: false,
            suppressNextClickSelection: false,
            isFillDragging: false,
            fillSourceMatrix: null,
            fillSourceRect: null,
            columnWidthCache: {},
            editingHeader: null,
            pendingHeaderEdit: null,
            pendingCellSelection: null,
            contextMenuState: null,
            dragState: null,
            focusPath: '',
            visibleDepthLimit: 5,
            paginationStates: {},
            paginationThreshold: 200,
            paginationPageSizes: [20, 50, 100, 200],
            thumbnailEnabled: false,
            thumbnailDrag: null,
            thumbnailViewportDrag: null,
            thumbnailViewportPending: null,
            thumbnailViewportLastTarget: null,
            thumbnailViewportFrame: 0,
            thumbnailResizeDrag: null,
            thumbnailCustomOffset: null,
            thumbnailSuppressClick: false,
            thumbnailWidth: 220,
            miniMapEnabled: false,
            miniMapDrag: null,
            miniMapResizeDrag: null,
            miniMapCustomOffset: null,
            miniMapWidth: 220,
            miniMapSearchQuery: '',
            miniMapSearchDraftQuery: null,
            miniMapSearchDebounceTimer: null,
            miniMapSearchDebounceDelay: 150,
            miniMapSearchComposing: false,
            miniMapSearchMode: 'all',
            miniMapSearchActiveIndex: 0,
            inputPanelMode: 'hidden',
            inputPanelWidth: 400,
            inputPanelResizeDrag: null,
            editorScale: 1,
            canvasPanState: null,
            isCtrlPressed: false,
            canvasVirtualPadding: { top: 0, right: 0, bottom: 0, left: 0 },
            nullAsString: true,
            jsonEditor: null,
            monacoLoading: false,
            monacoReady: false,
            monacoLoadFailed: false,
            monacoInitTimeoutTimer: null,
            monacoInitTimeoutMs: 3500,

            // Localization (standalone page)
            currentLanguage: 'en',
            userLangPref: 'auto',
            translations: {
                'en': {
                    ready: 'Ready',
                    title: 'wysJSON',
                    toggleInput: 'Input',
                    downloadJson: 'Download JSON',
                    sendToInput: 'Send JSON to input panel',
                    sendToView: 'Send JSON to table view',
                    applyToView: 'Send JSON to table view',
                    closeInput: 'Close',
                    maximizeInput: 'Maximize',
                    restoreInput: 'Restore',
                    format: 'Format',
                    minify: 'Minify',
                    copy: 'Copy',
                    export: 'Export',
                    undo: 'Undo',
                    redo: 'Redo',
                    sample: 'Sample',
                    clearNull: 'Clear null',
                    nullAsString: 'null as string',
                    thumbnail: 'Thumbnail',
                    quickJump: 'Quick Jump',
                    depthFilter: 'Depth',
                    depthAll: 'All'
                    ,
                    // Context menu
                    convertType: 'Convert type',
                    insertRowBefore: 'Insert row before',
                    insertRowAfter: 'Insert row after',
                    deleteCurrentRow: 'Delete current row',
                    deleteRootNode: 'Delete root node (set to null)',
                    deleteCurrentNode: 'Delete current node (set to null)',
                    addChildItem: 'Add item to array',
                    addFieldRoot: 'Add field to root object',
                    addFieldCurrent: 'Add field to current object',
                    focusNode: 'Focus node',
                    openAsJson: 'Open as JSON',
                    convertToJson: 'Convert to JSON',
                    convertToJsonString: 'Convert JSON string',
                    deleteRow: 'Delete row {n}',
                    insertColumnBefore: 'Insert column {key} before',
                    insertColumnAfter: 'Insert column {key} after',
                    deleteColumn: 'Delete column {key}',
                    setObjectNull: 'Set object to null',
                    clearSelectionNodes: 'Delete selected nodes (set to null)',
                    // Type labels
                    'type.array': 'Array',
                    'type.object': 'Object',
                    'type.single': 'Single value',
                    'type.string': 'String',
                    'type.number': 'Number',
                    'type.boolean': 'Boolean',
                    'type.null': '空值'
                    ,
                    // Status messages
                    noData: 'No data',
                    notFoundToFocus: 'No node to focus',
                    focusedToNode: 'Focused to node {path}',
                    returnedToRoot: 'Returned to root',
                    focusBadge: 'Focusing',
                    thumbnailHint: 'Drag panel / drag viewport / click to locate / resize on left edge',
                    thumbnailOverviewLabel: 'Viewport',
                    quickJumpHint: 'Drag panel / Ctrl+click to focus / resize on left edge',
                    closePanel: 'Close panel',
                    quickJumpSearchPlaceholder: 'Search key / value / path',
                    quickJumpSearchAll: 'All',
                    quickJumpSearchKey: 'Key',
                    quickJumpSearchValue: 'Value',
                    quickJumpSearchResults: '{count} results',
                    quickJumpSearchLimited: 'showing first {count}',
                    quickJumpSearchEmpty: 'No matches',
                    quickJumpSearchWaiting: 'Search after typing stops',
                    // Row/column insert status
                    insertedRowBefore: 'Inserted new item before row {n}',
                    insertedRowAfter: 'Inserted new item after row {n}',
                    insertedColumnBefore: 'Inserted new column before {key}',
                    insertedColumnAfter: 'Inserted new column after {key}',
                    insertColumnFailed: 'Insert column failed',
                    notFoundColumnObject: "Column's parent object not found",
                    notFoundTargetObject: 'Target object not found',
                    objectSetToNull: 'Set object to null',
                    noDataToOperate: 'No data to operate',
                    allNullsCleared: 'Converted all nulls to empty strings',
                    addedNewRow: 'Added new row',
                    pathNotArray: 'Path is not an array',
                    currentNodeNotObjectCannotAddColumn: 'Current node is not an object, cannot add column',
                    currentNodeNotObjectCannotInsertColumn: 'Current node is not an object, cannot insert column',
                    columnTitleCannotBeEmpty: 'Column title cannot be empty',
                    columnTitleNotModified: 'Column title not modified',
                    columnTitleEditCancelled: 'Column title edit cancelled',
                    noUndoOps: 'No undoable actions',
                    undone: 'Undone',
                    noRedoOps: 'No redoable actions',
                    redone: 'Redone',
                    openAsJsonFailed: 'This string is not valid JSON',
                    openAsJsonPopupBlocked: 'New window was blocked by the browser',
                    openAsJsonOpened: 'Opened JSON string in a new page',
                    openAsJsonLoaded: 'Loaded JSON from string field',
                    convertToJsonFailed: 'Current node is not a valid JSON string',
                    convertToJsonStringFailed: 'Current node cannot be converted to JSON string',
                    convertedToJson: 'Converted {count} node(s) to JSON',
                    convertedToJsonString: 'Converted {count} node(s) to JSON string',
                },
                'zh-CN': {
                    ready: '就绪',
                    title: 'wysJSON',
                    toggleInput: '输入',
                    downloadJson: '下载 JSON',
                    sendToInput: '发送 JSON 到输入面板',
                    sendToView: '发送 JSON 到表格视图',
                    applyToView: '发送 JSON 到表格视图',
                    closeInput: '关闭',
                    maximizeInput: '最大化',
                    restoreInput: '还原',
                    format: '格式化',
                    minify: '压缩',
                    copy: '复制',
                    export: '⬇ 导出',
                    undo: '撤销',
                    redo: '重做',
                    sample: '示例',
                    clearNull: '清除 null',
                    nullAsString: '将 null 视为字符串',
                    thumbnail: '缩略图',
                    quickJump: '快速跳转',
                    depthFilter: '层级',
                    depthAll: '全部'
                    ,
                    // Context menu
                    convertType: '改变类型',
                    insertRowBefore: '在当前行前插入',
                    insertRowAfter: '在当前行后插入',
                    deleteCurrentRow: '删除当前行',
                    deleteRootNode: '删除根节点（置为 null）',
                    deleteCurrentNode: '删除当前节点（置为 null）',
                    addChildItem: '向当前数组添加项',
                    addFieldRoot: '向根对象添加字段',
                    addFieldCurrent: '向当前对象添加字段',
                    focusNode: '聚焦此节点',
                    openAsJson: '作为 JSON 打开',
                    convertToJson: '转换为 JSON',
                    convertToJsonString: '转换为 JSON 字符串',
                    deleteRow: '删除第 {n} 行',
                    insertColumnBefore: '在列 {key} 前插入',
                    insertColumnAfter: '在列 {key} 后插入',
                    deleteColumn: '删除列 {key}',
                    setObjectNull: '将对象设为 null',
                    clearSelectionNodes: '删除选区节点（置为 null）',
                    // Type labels
                    'type.array': '数组',
                    'type.object': '对象',
                    'type.single': '单值',
                    'type.string': '字符串',
                    'type.number': '数字',
                    'type.boolean': '布尔值',
                    'type.null': 'Null'
                    ,
                    // Status messages
                    noData: '没有数据',
                    notFoundToFocus: '未找到要聚焦的节点',
                    focusedToNode: '已聚焦到节点 {path}',
                    returnedToRoot: '已返回 root',
                    focusBadge: '聚焦中',
                    thumbnailHint: '拖动面板 / 拖动视区 / 点击定位 / 左侧拖边调整宽度',
                    thumbnailOverviewLabel: '视区',
                    quickJumpHint: '拖动面板 / Ctrl+点击聚焦 / 左侧拖边调整宽度',
                    closePanel: '关闭面板',
                    quickJumpSearchPlaceholder: '搜索 key / value / path',
                    quickJumpSearchAll: '全部',
                    quickJumpSearchKey: 'Key',
                    quickJumpSearchValue: 'Value',
                    quickJumpSearchResults: '{count} 个结果',
                    quickJumpSearchLimited: '显示前 {count} 个',
                    quickJumpSearchEmpty: '没有匹配结果',
                    quickJumpSearchWaiting: '停止输入后搜索',
                    // Row/column insert status
                    insertedRowBefore: '已在第 {n} 行前插入新项',
                    insertedRowAfter: '已在第 {n} 行后插入新项',
                    insertedColumnBefore: '已在列 {key} 前插入新列',
                    insertedColumnAfter: '已在列 {key} 后插入新列',
                    insertColumnFailed: '插入列失败',
                    notFoundColumnObject: '未找到列所在对象',
                    notFoundTargetObject: '未找到要修改的对象',
                    objectSetToNull: '已将对象设为 null',
                    noDataToOperate: '没有数据可操作',
                    allNullsCleared: '已将所有 null 转为空字符串',
                    addedNewRow: '已添加新行',
                    pathNotArray: '路径不是数组',
                    currentNodeNotObjectCannotAddColumn: '当前节点不是对象，无法添加列',
                    currentNodeNotObjectCannotInsertColumn: '当前节点不是对象，无法插入列',
                    columnTitleCannotBeEmpty: '列标题不能为空',
                    columnTitleNotModified: '列标题未修改',
                    columnTitleEditCancelled: '已取消列标题修改',
                    noUndoOps: '没有可撤销的操作',
                    undone: '已撤销',
                    noRedoOps: '没有可重做的操作',
                    redone: '已重做',
                    openAsJsonFailed: '当前字符串不是有效 JSON',
                    openAsJsonPopupBlocked: '浏览器阻止了新窗口打开',
                    openAsJsonOpened: '已在新页面打开 JSON 字符串',
                    openAsJsonLoaded: '已从字符串字段加载 JSON',
                    convertToJsonFailed: '当前节点不是有效 JSON 字符串',
                    convertToJsonStringFailed: '当前节点无法转换成 JSON 字符串',
                    convertedToJson: '已将 {count} 个节点转换为 JSON',
                    convertedToJsonString: '已将 {count} 个节点转换为 JSON 字符串',
                    addedNewColumnPleaseEdit: '已添加新列，请输入列标题',
                }
            },

            getTranslation(key, params) {
                const map = this.translations[this.currentLanguage] || this.translations['en'];
                let txt = map[key] || key;
                if (params && typeof params === 'object') {
                    for (const p of Object.keys(params)) {
                        txt = String(txt).replace(new RegExp(`\{${p}\}`, 'g'), params[p]);
                    }
                }
                return txt;
            },

            applyTranslations() {
                try {
                    const t = (k) => this.getTranslation(k);
                    const titleEl = document.querySelector('.toolbar .title');
                    if (titleEl) titleEl.textContent = t('title');
                    const btnToggleInput = document.getElementById('btnToggleInput');
                    if (btnToggleInput) btnToggleInput.textContent = t('toggleInput');
                    const btnSendToInput = document.getElementById('btnSendToInput');
                    if (btnSendToInput) {
                        btnSendToInput.textContent = this.currentLanguage === 'zh-CN' ? '到输入' : 'To Input';
                        btnSendToInput.title = t('sendToInput');
                    }
                    const btnFormat = document.getElementById('btnFormat');
                    if (btnFormat) btnFormat.textContent = t('format');
                    const btnMinify = document.getElementById('btnMinify');
                    if (btnMinify) btnMinify.textContent = t('minify');
                    const btnCopy = document.getElementById('btnCopy');
                    if (btnCopy) btnCopy.textContent = t('copy');
                    const btnExport = document.getElementById('btnExport');
                    if (btnExport) {
                        btnExport.textContent = this.currentLanguage === 'zh-CN' ? '导出' : 'Export';
                        btnExport.title = t('downloadJson');
                    }
                    const btnUndo = document.getElementById('btnUndo');
                    if (btnUndo) btnUndo.textContent = t('undo');
                    const btnRedo = document.getElementById('btnRedo');
                    if (btnRedo) btnRedo.textContent = t('redo');
                    const btnSample = document.getElementById('btnSample');
                    if (btnSample) btnSample.textContent = t('sample');
                    const btnClearNull = document.getElementById('btnClearNull');
                    if (btnClearNull) btnClearNull.textContent = t('clearNull');
                    const btnApply = document.getElementById('btnApply');
                    if (btnApply) {
                        btnApply.textContent = '→';
                        btnApply.title = t('applyToView');
                        btnApply.setAttribute('aria-label', t('applyToView'));
                    }
                    const btnMaximizeInput = document.getElementById('btnMaximizeInput');
                    if (btnMaximizeInput) {
                        const maximizeTitle = this.inputPanelMode === 'maximized' ? t('restoreInput') : t('maximizeInput');
                        btnMaximizeInput.textContent = this.inputPanelMode === 'maximized' ? '▣' : '□';
                        btnMaximizeInput.title = maximizeTitle;
                        btnMaximizeInput.setAttribute('aria-label', maximizeTitle);
                        btnMaximizeInput.classList.toggle('is-maximized', this.inputPanelMode === 'maximized');
                    }
                    const btnCloseInput = document.getElementById('btnCloseInput');
                    if (btnCloseInput) {
                        btnCloseInput.textContent = '×';
                        btnCloseInput.title = t('closeInput');
                        btnCloseInput.setAttribute('aria-label', t('closeInput'));
                    }
                    const chk = document.getElementById('chkNullAsString');
                    if (chk && chk.parentElement) {
                        chk.parentElement.childNodes.forEach((n) => {
                            if (n.nodeType === Node.TEXT_NODE) n.textContent = ' ' + t('nullAsString');
                        });
                    }
                    const depthFilterLabel = document.getElementById('depthFilterLabel');
                    if (depthFilterLabel) depthFilterLabel.textContent = t('depthFilter');
                    const depthSelect = document.getElementById('selVisibleDepth');
                    if (depthSelect) {
                        const allOption = depthSelect.querySelector('option[value="all"]');
                        if (allOption) allOption.textContent = t('depthAll');
                    }
                } catch (err) {
                    console.warn('applyTranslations failed', err);
                }
            },

            // --- Undo/Redo ---
            undoStack: [],
            redoStack: [],
            maxUndo: 50,

            init() {
                this.loadUIState();
                this.bindEvents();
                // Language initialization from localStorage
                try {
                    const userPref = localStorage.getItem('wysjson.language') || 'auto';
                    this.userLangPref = userPref;
                    // Default to English for 'auto' unless user chose otherwise
                    this.currentLanguage = userPref === 'auto' ? 'en' : userPref;
                    document.documentElement.lang = this.currentLanguage;
                    const langSel = document.getElementById('languageSelect');
                    if (langSel) {
                        langSel.value = userPref;
                        langSel.addEventListener('change', (e) => {
                            const v = e.target.value || 'auto';
                            this.userLangPref = v;
                            this.currentLanguage = v === 'auto' ? (navigator.language && navigator.language.startsWith('zh') ? 'zh-CN' : 'en') : v;
                            document.documentElement.lang = this.currentLanguage;
                            localStorage.setItem('wysjson.language', v);
                            this.applyTranslations();
                        });
                    }
                    this.applyTranslations();
                } catch (err) {
                    console.warn('language init failed', err);
                }
                const chk = document.getElementById('chkNullAsString');
                if (chk) chk.checked = this.nullAsString;
                const thumbnailChk = document.getElementById('chkThumbnail');
                if (thumbnailChk) thumbnailChk.checked = this.thumbnailEnabled;
                const quickJumpChk = document.getElementById('chkQuickJump');
                if (quickJumpChk) quickJumpChk.checked = this.miniMapEnabled;
                const depthSelect = document.getElementById('selVisibleDepth');
                if (depthSelect) depthSelect.value = this.visibleDepthLimit === null ? 'all' : String(this.visibleDepthLimit);
                this.applyInputPanelLayout();
                this.initMonacoEditor();
                const loadedOpenAsJsonPayload = this.loadOpenAsJsonPayload();
                this.applyEditorScale();
                if (!loadedOpenAsJsonPayload) this.setStatus(this.getTranslation('ready'));
            },

            loadOpenAsJsonPayload() {
                try {
                    const params = new URLSearchParams(window.location.search || '');
                    const payloadId = params.get('wysjsonOpenPayload');
                    if (!payloadId) return false;
                    const storageKey = `wysjson.openAsJson.${payloadId}`;
                    const raw = localStorage.getItem(storageKey);
                    localStorage.removeItem(storageKey);
                    if (!raw) return false;
                    const payload = JSON.parse(raw);
                    this.data = payload.data;
                    this.focusPath = '';
                    this.nestedStates = {};
                    this.columnStates = {};
                    this.paginationStates = {};
                    this.setJsonInputValue(JSON.stringify(this.data, null, 2), { focus: false });
                    this.render();
                    this.setStatus(this.getTranslation('openAsJsonLoaded'));
                    const cleanUrl = new URL(window.location.href);
                    cleanUrl.searchParams.delete('wysjsonOpenPayload');
                    window.history.replaceState(null, '', cleanUrl.href);
                    return true;
                } catch (error) {
                    console.warn('Failed to load Open as JSON payload', error);
                    this.setStatus(this.getTranslation('openAsJsonFailed'), true);
                    return false;
                }
            },

            getJsonInputElement() {
                return document.getElementById('jsonInput');
            },

            getJsonEditorShell() {
                return document.getElementById('jsonEditorShell');
            },

            getJsonEditorHost() {
                return document.getElementById('jsonMonacoEditor');
            },

            isJsonEditorTarget(target) {
                return !!target?.closest?.('#jsonEditorShell, .monaco-editor');
            },

            getJsonInputValue() {
                if (this.jsonEditor) return this.jsonEditor.getValue();
                return this.getJsonInputElement()?.value || '';
            },

            setJsonInputValue(value, options = {}) {
                const nextValue = String(value ?? '');
                const fallback = this.getJsonInputElement();
                const shell = this.getJsonEditorShell();
                if (this.jsonEditor) {
                    if (this.jsonEditor.getValue() !== nextValue) {
                        this.jsonEditor.setValue(nextValue);
                    }
                    if (options.focus !== false) this.jsonEditor.focus();
                } else if (fallback) {
                    fallback.value = nextValue;
                    if (options.focus !== false) fallback.focus();
                }
                if (shell) {
                    shell.classList.toggle('is-ready', !!this.jsonEditor);
                    shell.classList.toggle('is-fallback', !this.jsonEditor);
                }
            },

            focusJsonInput() {
                if (this.jsonEditor) {
                    this.layoutJsonEditor();
                    this.jsonEditor.focus();
                    return;
                }
                this.getJsonInputElement()?.focus();
            },

            layoutJsonEditor() {
                if (!this.jsonEditor) return;
                const host = this.getJsonEditorHost();
                if (!host || host.clientWidth <= 0 || host.clientHeight <= 0) return;
                this.jsonEditor.layout({ width: host.clientWidth, height: host.clientHeight });
            },

            scheduleJsonEditorLayout(options = {}) {
                const run = () => {
                    this.layoutJsonEditor();
                    if (options.focus) this.focusJsonInput();
                };
                requestAnimationFrame(() => {
                    run();
                    requestAnimationFrame(run);
                });
                window.setTimeout(run, 80);
                window.setTimeout(run, 220);
            },

            buildJsonPathIndex(text) {
                const ranges = [];
                const length = text.length;
                let index = 0;

                const isWhitespace = (ch) => /\s/.test(ch);
                const skipWhitespace = () => {
                    while (index < length && isWhitespace(text[index])) index++;
                };

                const recordRange = (path, start, end, kind = 'value') => {
                    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return;
                    ranges.push({ path: path || '', start, end, kind, length: end - start });
                };

                const parseStringToken = () => {
                    const start = index;
                    if (text[index] !== '"') return null;
                    index++;
                    let escaped = false;
                    while (index < length) {
                        const ch = text[index++];
                        if (escaped) {
                            escaped = false;
                            continue;
                        }
                        if (ch === '\\') {
                            escaped = true;
                            continue;
                        }
                        if (ch === '"') break;
                    }
                    const end = index;
                    let value = '';
                    try {
                        value = JSON.parse(text.slice(start, end));
                    } catch (error) {
                        value = text.slice(start + 1, Math.max(start + 1, end - 1));
                    }
                    return { value, start, end };
                };

                const parseNumberToken = () => {
                    const start = index;
                    const numberPattern = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
                    numberPattern.lastIndex = index;
                    const match = numberPattern.exec(text);
                    if (!match) return null;
                    index = numberPattern.lastIndex;
                    return { value: Number(match[0]), start, end: index };
                };

                const parseLiteralToken = () => {
                    const start = index;
                    if (text.startsWith('true', index)) {
                        index += 4;
                        return { value: true, start, end: index };
                    }
                    if (text.startsWith('false', index)) {
                        index += 5;
                        return { value: false, start, end: index };
                    }
                    if (text.startsWith('null', index)) {
                        index += 4;
                        return { value: null, start, end: index };
                    }
                    return null;
                };

                const parseValue = (path) => {
                    skipWhitespace();
                    const start = index;
                    const ch = text[index];
                    if (ch === '{') return parseObject(path, start);
                    if (ch === '[') return parseArray(path, start);
                    if (ch === '"') {
                        const token = parseStringToken();
                        if (token) recordRange(path, token.start, token.end, 'value');
                        return token;
                    }
                    const numberToken = parseNumberToken();
                    if (numberToken) {
                        recordRange(path, numberToken.start, numberToken.end, 'value');
                        return numberToken;
                    }
                    const literalToken = parseLiteralToken();
                    if (literalToken) {
                        recordRange(path, literalToken.start, literalToken.end, 'value');
                        return literalToken;
                    }
                    return null;
                };

                const parseObject = (path, start) => {
                    index++; // skip '{'
                    skipWhitespace();
                    if (text[index] === '}') {
                        index++;
                        recordRange(path, start, index, 'value');
                        return { start, end: index };
                    }

                    while (index < length) {
                        skipWhitespace();
                        const keyToken = parseStringToken();
                        if (!keyToken) break;
                        const key = keyToken.value;
                        const childPath = path ? `${path}.${key}` : key;
                        recordRange(childPath, keyToken.start, keyToken.end, 'key');
                        skipWhitespace();
                        if (text[index] !== ':') break;
                        index++;
                        const valueStart = index;
                        parseValue(childPath);
                        recordRange(childPath, valueStart, index, 'value');
                        skipWhitespace();
                        if (text[index] === ',') {
                            index++;
                            continue;
                        }
                        if (text[index] === '}') {
                            index++;
                            break;
                        }
                        break;
                    }

                    recordRange(path, start, index, 'value');
                    return { start, end: index };
                };

                const parseArray = (path, start) => {
                    index++; // skip '['
                    skipWhitespace();
                    if (text[index] === ']') {
                        index++;
                        recordRange(path, start, index, 'value');
                        return { start, end: index };
                    }

                    let itemIndex = 0;
                    while (index < length) {
                        const childPath = path ? `${path}[${itemIndex}]` : `[${itemIndex}]`;
                        const valueStart = index;
                        parseValue(childPath);
                        recordRange(childPath, valueStart, index, 'value');
                        itemIndex++;
                        skipWhitespace();
                        if (text[index] === ',') {
                            index++;
                            continue;
                        }
                        if (text[index] === ']') {
                            index++;
                            break;
                        }
                        break;
                    }

                    recordRange(path, start, index, 'value');
                    return { start, end: index };
                };

                skipWhitespace();
                parseValue('');
                skipWhitespace();
                recordRange('', 0, Math.max(index, 0), 'value');
                return ranges;
            },

            findJsonRangeForPath(text, path) {
                const ranges = this.buildJsonPathIndex(text);
                const candidates = ranges.filter((range) => range.path === (path || '') && range.kind === 'value');
                if (candidates.length === 0) return null;
                candidates.sort((left, right) => (left.length - right.length) || (left.start - right.start));
                return candidates[0];
            },

            findJsonPathAtOffset(text, offset) {
                const ranges = this.buildJsonPathIndex(text);
                const candidates = ranges.filter((range) => range.start <= offset && offset <= Math.max(range.end - 1, range.start));
                if (candidates.length === 0) return null;
                candidates.sort((left, right) => {
                    if (left.length !== right.length) return left.length - right.length;
                    if (left.kind !== right.kind) return left.kind === 'value' ? -1 : 1;
                    return right.start - left.start;
                });
                return candidates[0]?.path ?? null;
            },

            focusJsonPath(path) {
                if (!this.jsonEditor || typeof monaco === 'undefined') return false;
                const model = this.jsonEditor.getModel();
                if (!model) return false;
                const range = this.findJsonRangeForPath(this.jsonEditor.getValue(), path);
                if (!range) return false;
                const startPosition = model.getPositionAt(range.start);
                const endPosition = model.getPositionAt(Math.max(range.end, range.start + 1));
                const selection = new monaco.Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column);
                this.jsonEditor.setSelection(selection);
                this.jsonEditor.revealRangeInCenter(selection);
                this.jsonEditor.focus();
                return true;
            },

            selectRootCellByPath(path) {
                if (!path) return null;
                const currentFocus = this.focusPath;
                if (currentFocus && currentFocus !== '') {
                    this.setFocusPath('', { selectPath: path });
                }
                const cell = this.selectCellByPath(path);
                if (!cell) {
                    this.pendingCellSelection = path;
                    if (currentFocus !== '') this.setFocusPath('', { selectPath: path });
                }
                return cell;
            },

            initMonacoEditor() {
                const shell = this.getJsonEditorShell();
                const host = this.getJsonEditorHost();
                const fallback = this.getJsonInputElement();
                if (!shell || !host || !fallback) return;
                if (this.monacoLoading || this.jsonEditor) return;

                if (typeof window.require !== 'function') {
                    this.activateJsonEditorFallback('Local Monaco loader is not available');
                    return;
                }

                this.monacoLoading = true;
                const monacoBase = new URL('./node_modules/monaco-editor/min', document.baseURI).href;
                window.MonacoEnvironment = window.MonacoEnvironment || {};
                window.MonacoEnvironment.getWorkerUrl = () => {
                    const workerCode = `self.MonacoEnvironment = { baseUrl: '${monacoBase}/' }; importScripts('${monacoBase}/vs/base/worker/workerMain.js');`;
                    return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(workerCode);
                };

                this.clearMonacoInitTimeout();
                this.monacoInitTimeoutTimer = window.setTimeout(() => {
                    if (this.jsonEditor) return;
                    this.activateJsonEditorFallback('Local Monaco initialization timed out');
                }, this.monacoInitTimeoutMs);

                const handleMonacoError = (error) => {
                    console.warn('Monaco local load failed', error);
                    this.activateJsonEditorFallback('Local Monaco load failed');
                };

                try {
                    window.require.config({ paths: { vs: `${monacoBase}/vs` } });
                    window.require(['vs/editor/editor.main'], () => {
                        try {
                            if (!shell.isConnected || !host.isConnected) return;
                            this.clearMonacoInitTimeout();
                            const initialValue = fallback.value || '';
                            this.jsonEditor = monaco.editor.create(host, {
                                value: initialValue,
                                language: 'json',
                                theme: 'vs',
                                automaticLayout: false,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                wordWrap: 'on',
                                wrappingIndent: 'indent',
                                renderLineHighlight: 'all',
                                fontSize: 12,
                                lineNumbers: 'on',
                                lineNumbersMinChars: 6,
                                lineDecorationsWidth: 0,
                                glyphMargin: false,
                                folding: false,
                                fixedOverflowWidgets: true,
                                tabSize: 2,
                                formatOnPaste: true,
                                formatOnType: true,
                            });
                            if (monaco?.languages?.json?.jsonDefaults) {
                                monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
                                    validate: true,
                                    allowComments: true,
                                    trailingCommas: true,
                                    schemaValidation: 'warning',
                                });
                            }
                            this.jsonEditor.onDidChangeModelContent(() => {
                                fallback.value = this.jsonEditor.getValue();
                            });
                            this.jsonEditor.onMouseDown((event) => {
                                const browserEvent = event.event?.browserEvent;
                                if (!browserEvent || !(browserEvent.ctrlKey || browserEvent.metaKey)) return;
                                const position = event.target?.position;
                                const model = this.jsonEditor?.getModel();
                                if (!position || !model) return;
                                browserEvent.preventDefault();
                                browserEvent.stopPropagation();
                                const offset = model.getOffsetAt(position);
                                const path = this.findJsonPathAtOffset(this.jsonEditor.getValue(), offset);
                                if (path === null) return;
                                this.selectRootCellByPath(path);
                                this.setFocusPath('', { selectPath: path });
                            });
                            this.jsonEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => this.applyInput());
                            this.monacoReady = true;
                            this.monacoLoadFailed = false;
                            shell.classList.add('is-ready');
                            shell.classList.remove('is-fallback');
                            this.scheduleJsonEditorLayout({ focus: this.inputPanelMode !== 'hidden' });
                        } catch (error) {
                            console.warn('Monaco init failed', error);
                            this.jsonEditor = null;
                            this.activateJsonEditorFallback('Monaco init failed');
                        } finally {
                            this.monacoLoading = false;
                        }
                    }, handleMonacoError);
                } catch (error) {
                    handleMonacoError(error);
                }
            },

            clearMonacoInitTimeout() {
                if (!this.monacoInitTimeoutTimer) return;
                window.clearTimeout(this.monacoInitTimeoutTimer);
                this.monacoInitTimeoutTimer = null;
            },

            activateJsonEditorFallback(reason) {
                const shell = this.getJsonEditorShell();
                const fallback = this.getJsonInputElement();
                this.clearMonacoInitTimeout();
                this.monacoLoading = false;
                this.monacoLoadFailed = true;
                if (shell) {
                    shell.classList.add('is-fallback');
                    shell.classList.remove('is-ready');
                }
                if (fallback) {
                    fallback.disabled = false;
                    if (this.inputPanelMode !== 'hidden') fallback.focus();
                }
                console.warn(`[wysJSON] ${reason}; using textarea fallback.`);
            },

            loadUIState() {
                try {
                    const raw = localStorage.getItem(this.uiStateStorageKey);
                    if (!raw) return;
                    const state = JSON.parse(raw);
                    this.thumbnailEnabled = !!state.thumbnailEnabled;
                    this.miniMapEnabled = !!state.quickJumpEnabled;
                    this.visibleDepthLimit = state.visibleDepthLimit === 'all' || state.visibleDepthLimit === null
                        ? null
                        : Math.max(1, Number(state.visibleDepthLimit) || this.visibleDepthLimit);
                    this.thumbnailWidth = Math.max(220, Number(state.thumbnailWidth) || this.thumbnailWidth);
                    this.miniMapWidth = Math.max(220, Number(state.quickJumpWidth) || this.miniMapWidth);
                    this.inputPanelMode = ['hidden', 'normal', 'maximized'].includes(state.inputPanelMode) ? state.inputPanelMode : 'hidden';
                    this.inputPanelWidth = Math.max(280, Number(state.inputPanelWidth) || this.inputPanelWidth);
                    this.thumbnailCustomOffset = state.thumbnailOffset && Number.isFinite(state.thumbnailOffset.x) && Number.isFinite(state.thumbnailOffset.y)
                        ? { x: state.thumbnailOffset.x, y: state.thumbnailOffset.y }
                        : null;
                    this.miniMapCustomOffset = state.quickJumpOffset && Number.isFinite(state.quickJumpOffset.x) && Number.isFinite(state.quickJumpOffset.y)
                        ? { x: state.quickJumpOffset.x, y: state.quickJumpOffset.y }
                        : null;
                } catch (error) {
                    console.warn('Failed to load UI state', error);
                }
            },

            saveUIState() {
                try {
                    const thumbnailChk = document.getElementById('chkThumbnail');
                    const quickJumpChk = document.getElementById('chkQuickJump');
                    localStorage.setItem(this.uiStateStorageKey, JSON.stringify({
                        thumbnailEnabled: thumbnailChk ? !!thumbnailChk.checked : this.thumbnailEnabled,
                        quickJumpEnabled: quickJumpChk ? !!quickJumpChk.checked : this.miniMapEnabled,
                        visibleDepthLimit: this.visibleDepthLimit === null ? 'all' : this.visibleDepthLimit,
                        thumbnailWidth: this.thumbnailWidth,
                        quickJumpWidth: this.miniMapWidth,
                        inputPanelMode: this.inputPanelMode,
                        inputPanelWidth: this.inputPanelWidth,
                        thumbnailOffset: this.thumbnailCustomOffset,
                        quickJumpOffset: this.miniMapCustomOffset,
                    }));
                } catch (error) {
                    console.warn('Failed to save UI state', error);
                }
            },

            // Push current data state for undo
            pushUndo() {
                if (this.data === null) return;
                this.undoStack.push(JSON.parse(JSON.stringify(this.data)));
                if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
                this.redoStack = [];
            },

            undo() {
                if (this.undoStack.length === 0) return this.setStatus(this.getTranslation('noUndoOps'));
                if (this.data !== null) this.redoStack.push(JSON.parse(JSON.stringify(this.data)));
                this.data = this.undoStack.pop();
                this.nestedStates = {};
                this.render();
                this.setStatus(this.getTranslation('undone'));
            },

            redo() {
                if (this.redoStack.length === 0) return this.setStatus(this.getTranslation('noRedoOps'));
                if (this.data !== null) this.undoStack.push(JSON.parse(JSON.stringify(this.data)));
                this.data = this.redoStack.pop();
                this.nestedStates = {};
                this.render();
                this.setStatus(this.getTranslation('redone'));
            },

            bindEvents() {
                const commitActive = () => { if (this.editingCell) this.finishEdit(this.editingCell); };
                document.getElementById('btnToggleInput').addEventListener('click', () => { commitActive(); this.toggleInput(); });
                document.getElementById('btnApply').addEventListener('click', () => { commitActive(); this.applyInput(); });
                document.getElementById('btnSendToInput').addEventListener('click', () => { commitActive(); this.sendToInputPanel(); });
                document.getElementById('btnMaximizeInput').addEventListener('click', () => { commitActive(); this.toggleMaximizeInputPanel(); });
                document.getElementById('btnCloseInput').addEventListener('click', () => { commitActive(); this.hideInputPanel(); });
                document.getElementById('inputPanelResizeHandle').addEventListener('mousedown', (e) => this.startInputPanelResize(e));
                document.getElementById('btnFormat').addEventListener('click', () => { commitActive(); this.formatJSON(); });
                document.getElementById('btnMinify').addEventListener('click', () => { commitActive(); this.minifyJSON(); });
                document.getElementById('btnCopy').addEventListener('click', () => { commitActive(); this.copyJSON(); });
                document.getElementById('btnExport').addEventListener('click', () => { commitActive(); this.downloadJSON(); });
                document.getElementById('btnSample').addEventListener('click', () => { commitActive(); this.loadSample(); });
                if (document.getElementById('btnUndo')) {
                    document.getElementById('btnUndo').addEventListener('click', () => { commitActive(); this.undo(); });
                    document.getElementById('btnRedo').addEventListener('click', () => { commitActive(); this.redo(); });
                }
                document.getElementById('tableView').addEventListener('click', (e) => this.handleTableClickCapture(e), true);
                document.getElementById('tableView').addEventListener('click', (e) => this.handleTableClick(e));
                document.getElementById('tableView').addEventListener('dblclick', (e) => this.handleTableDoubleClick(e));
                document.getElementById('tableView').addEventListener('mousedown', (e) => this.handleTableMouseDown(e));
                document.getElementById('tableView').addEventListener('contextmenu', (e) => this.handleTableContextMenu(e));
                document.getElementById('tableView').addEventListener('input', (e) => this.handleCellEdit(e));
                document.getElementById('tableView').addEventListener('keydown', (e) => this.handleKeydown(e));
                document.getElementById('tableView').addEventListener('mouseover', (e) => this.handleTableHover(e));
                document.getElementById('tableView').addEventListener('paste', (e) => this.handlePaste(e));
                document.getElementById('tableView').addEventListener('mouseleave', () => this.setHoveredCell(null));
                const btnClearNull = document.getElementById('btnClearNull');
                if (btnClearNull) btnClearNull.addEventListener('click', () => { commitActive(); this.clearAllNulls(); });
                const chk = document.getElementById('chkNullAsString');
                if (chk) chk.addEventListener('change', (e) => { this.nullAsString = !!e.target.checked; });
                const thumbnailChk = document.getElementById('chkThumbnail');
                if (thumbnailChk) thumbnailChk.addEventListener('change', (e) => {
                    this.thumbnailEnabled = !!e.target.checked;
                    this.saveUIState();
                    this.updateThumbnail();
                });
                const miniMapChk = document.getElementById('chkQuickJump');
                if (miniMapChk) miniMapChk.addEventListener('change', (e) => {
                    this.miniMapEnabled = !!e.target.checked;
                    this.saveUIState();
                    this.updateMiniMap();
                });
                const depthSelect = document.getElementById('selVisibleDepth');
                if (depthSelect) depthSelect.addEventListener('change', (e) => {
                    const nextValue = e.target.value;
                    this.visibleDepthLimit = nextValue === 'all' ? null : Math.max(1, Number(nextValue) || 5);
                    this.saveUIState();
                    this.render();
                });
                document.getElementById('tableView').addEventListener('scroll', () => {
                    this.updateThumbnailViewport();
                    this.updateThumbnailPosition();
                    this.updateMiniMapPosition();
                    this.layoutJsonEditor();
                });
                document.addEventListener('copy', (e) => {
                    if (this.isJsonEditorTarget(e.target)) return;
                    this.handleCopy(e);
                });
                document.addEventListener('cut', (e) => {
                    if (this.isJsonEditorTarget(e.target)) return;
                    this.handleCut(e);
                });
                window.addEventListener('pagehide', () => this.saveUIState());
                window.addEventListener('beforeunload', () => this.saveUIState());
                document.addEventListener('mousemove', (e) => {
                    if (!this.inputPanelResizeDrag) return;
                    const nextWidth = Math.min(this.inputPanelResizeDrag.maxWidth, Math.max(this.inputPanelResizeDrag.minWidth, this.inputPanelResizeDrag.startWidth + (e.clientX - this.inputPanelResizeDrag.startX)));
                    this.inputPanelMode = 'normal';
                    this.inputPanelWidth = nextWidth;
                    this.applyInputPanelLayout();
                    this.saveUIState();
                });
                document.addEventListener('mouseup', () => { this.inputPanelResizeDrag = null; });
                document.addEventListener('mouseup', () => this.finishMouseSelection());
                document.addEventListener('mousemove', (e) => this.handleDocumentMouseMove(e));
                document.addEventListener('click', (e) => {
                    try {
                        if (!e || !e.target || !e.target.closest || !e.target.closest('#contextMenu')) {
                            this.hideContextMenu();
                        }
                    } catch (err) {
                        this.hideContextMenu();
                    }
                });
                document.getElementById('contextMenu').addEventListener('click', (e) => this.handleContextMenuAction(e));
                document.getElementById('breadcrumb').addEventListener('click', (e) => this.handleBreadcrumbClick(e));
                document.getElementById('thumbnailPanel').addEventListener('click', (e) => this.handleThumbnailClick(e));
                document.getElementById('thumbnailPanel').addEventListener('mousedown', (e) => this.handleThumbnailMouseDown(e));
                document.getElementById('miniMap').addEventListener('click', (e) => this.handleMiniMapClick(e));
                document.getElementById('miniMap').addEventListener('compositionstart', (e) => this.handleMiniMapSearchCompositionStart(e));
                document.getElementById('miniMap').addEventListener('compositionend', (e) => this.handleMiniMapSearchCompositionEnd(e));
                document.getElementById('miniMap').addEventListener('input', (e) => this.handleMiniMapSearchInput(e));
                document.getElementById('miniMap').addEventListener('change', (e) => this.handleMiniMapSearchChange(e));
                document.getElementById('miniMap').addEventListener('keydown', (e) => this.handleMiniMapSearchKeydown(e));
                document.getElementById('miniMap').addEventListener('mousedown', (e) => this.handleMiniMapMouseDown(e));
                document.getElementById('tableView').addEventListener('wheel', (e) => this.handleEditorWheel(e), { passive: false });
                document.addEventListener('mousemove', (e) => this.handleThumbnailMouseMove(e));
                document.addEventListener('mouseup', () => this.handleThumbnailMouseUp());
                document.addEventListener('mousemove', (e) => this.handleMiniMapMouseMove(e));
                document.addEventListener('mouseup', () => this.handleMiniMapMouseUp());
                window.addEventListener('resize', () => {
                    this.layoutJsonEditor();
                    this.updateThumbnailPosition();
                    this.updateMiniMapPosition();
                });

                // Global undo/redo hotkeys
                document.addEventListener('keydown', (e) => {
                    if (this.isJsonEditorTarget(e.target)) return;
                    this.updateCanvasPanReady(e);
                    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); this.undo(); }
                    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); this.redo(); }
                });
                document.addEventListener('keyup', (e) => this.updateCanvasPanReady(e));
                window.addEventListener('blur', () => this.updateCanvasPanReady({ ctrlKey: false, metaKey: false }));
            },

            // ===== Status =====
            setStatus(msg, isError = false) {
                const bar = document.getElementById('statusBar');
                bar.textContent = (isError ? '❌ ' : '✅ ') + msg;
                bar.className = 'status-bar' + (isError ? ' error' : '');
            },

            // ===== Undo/Redo =====
            undoStack: [],
            redoStack: [],
            maxUndo: 50,

            pushUndo() {
                if (this.data === null) return;
                this.undoStack.push(JSON.parse(JSON.stringify(this.data)));
                if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
                this.redoStack = [];
            },

            undo() {
                if (this.undoStack.length === 0) return this.setStatus('没有可撤销的操作');
                if (this.data !== null) this.redoStack.push(JSON.parse(JSON.stringify(this.data)));
                this.data = this.undoStack.pop();
                this.nestedStates = {};
                this.columnStates = {};
                this.selectedCell = null;
                this.editingCell = null;
                this.hoveredCell = null;
                this.selectionAnchorCell = null;
                this.selectedRangeCells = [];
                this.isMouseSelecting = false;
                this.mouseSelectionMoved = false;
                this.suppressNextClickSelection = false;
                this.isFillDragging = false;
                this.fillSourceMatrix = null;
                this.fillSourceRect = null;
                this.editingHeader = null;
                this.pendingHeaderEdit = null;
                this.render();
                this.syncTextarea();
                this.setStatus('已撤销');
            },

            redo() {
                if (this.redoStack.length === 0) return this.setStatus('没有可重做的操作');
                if (this.data !== null) this.undoStack.push(JSON.parse(JSON.stringify(this.data)));
                this.data = this.redoStack.pop();
                this.nestedStates = {};
                this.columnStates = {};
                this.selectedCell = null;
                this.editingCell = null;
                this.hoveredCell = null;
                this.selectionAnchorCell = null;
                this.selectedRangeCells = [];
                this.isMouseSelecting = false;
                this.mouseSelectionMoved = false;
                this.suppressNextClickSelection = false;
                this.isFillDragging = false;
                this.fillSourceMatrix = null;
                this.fillSourceRect = null;
                this.editingHeader = null;
                this.pendingHeaderEdit = null;
                this.render();
                this.syncTextarea();
                this.setStatus('已重做');
            },

            syncTextarea() {
                if (this.data !== undefined) {
                    this.setJsonInputValue(JSON.stringify(this.data, null, 2), { focus: false });
                }
            },

            applyEditorScale() {
                const canvas = document.getElementById('editorCanvas');
                if (!canvas) return;
                canvas.style.zoom = String(this.editorScale);
                this.updateThumbnailViewport();
                this.updateThumbnailPosition();
                this.updateMiniMapPosition();
                this.layoutJsonEditor();
            },

            applyEditorScaleAroundPoint(previousScale, clientX, clientY) {
                const tableView = document.getElementById('tableView');
                if (!tableView || !Number.isFinite(previousScale) || previousScale <= 0) {
                    this.applyEditorScale();
                    return;
                }
                const rect = tableView.getBoundingClientRect();
                const viewportX = clientX - rect.left;
                const viewportY = clientY - rect.top;
                const worldX = (tableView.scrollLeft + viewportX) / previousScale;
                const worldY = (tableView.scrollTop + viewportY) / previousScale;
                this.applyEditorScale();
                tableView.scrollLeft = Math.max(0, worldX * this.editorScale - viewportX);
                tableView.scrollTop = Math.max(0, worldY * this.editorScale - viewportY);
                this.updateThumbnailViewport();
                this.updateThumbnailPosition();
                this.updateMiniMapPosition();
            },

            applyCanvasVirtualPadding() {
                const canvas = document.getElementById('editorCanvas');
                if (!canvas) return;
                const padding = this.canvasVirtualPadding || { top: 0, right: 0, bottom: 0, left: 0 };
                canvas.style.padding = `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;
                canvas.style.boxSizing = 'content-box';
            },

            growCanvasVirtualPadding(side, amount) {
                if (!Number.isFinite(amount) || amount <= 0) return false;
                this.canvasVirtualPadding = this.canvasVirtualPadding || { top: 0, right: 0, bottom: 0, left: 0 };
                this.canvasVirtualPadding[side] = Math.max(this.canvasVirtualPadding[side] || 0, Math.ceil(amount));
                this.applyCanvasVirtualPadding();
                return true;
            },

            applyInputPanelLayout() {
                const shell = this.getJsonEditorShell();
                const inputPanel = document.getElementById('inputPanel');
                const mainContent = document.querySelector('.main-content');
                if (!inputPanel || !mainContent) return;
                inputPanel.classList.toggle('open', this.inputPanelMode !== 'hidden');
                inputPanel.classList.toggle('maximized', this.inputPanelMode === 'maximized');
                mainContent.classList.toggle('input-maximized', this.inputPanelMode === 'maximized');
                if (this.inputPanelMode === 'normal') {
                    inputPanel.style.setProperty('--input-panel-width', `${this.inputPanelWidth}px`);
                    inputPanel.style.width = `${this.inputPanelWidth}px`;
                } else {
                    inputPanel.style.removeProperty('--input-panel-width');
                    inputPanel.style.width = '';
                }
                const btnMaximizeInput = document.getElementById('btnMaximizeInput');
                if (btnMaximizeInput) {
                    const maximizeTitle = this.inputPanelMode === 'maximized' ? this.getTranslation('restoreInput') : this.getTranslation('maximizeInput');
                    btnMaximizeInput.textContent = this.inputPanelMode === 'maximized' ? '▣' : '□';
                    btnMaximizeInput.title = maximizeTitle;
                    btnMaximizeInput.setAttribute('aria-label', maximizeTitle);
                    btnMaximizeInput.classList.toggle('is-maximized', this.inputPanelMode === 'maximized');
                }
                if (shell) {
                    shell.classList.toggle('is-ready', !!this.jsonEditor);
                    shell.classList.toggle('is-fallback', !this.jsonEditor);
                }
                this.layoutJsonEditor();
            },

            openInputPanel(mode = 'normal', focus = true) {
                this.inputPanelMode = mode;
                this.applyInputPanelLayout();
                this.initMonacoEditor();
                this.scheduleJsonEditorLayout({ focus: focus && mode !== 'hidden' });
                this.saveUIState();
            },

            hideInputPanel() {
                this.inputPanelMode = 'hidden';
                this.applyInputPanelLayout();
                this.saveUIState();
            },

            toggleMaximizeInputPanel() {
                this.inputPanelMode = this.inputPanelMode === 'maximized' ? 'normal' : 'maximized';
                this.applyInputPanelLayout();
                this.initMonacoEditor();
                this.scheduleJsonEditorLayout({ focus: this.inputPanelMode !== 'hidden' });
                this.saveUIState();
            },

            startInputPanelResize(e) {
                if (this.inputPanelMode === 'maximized') return;
                const inputPanel = document.getElementById('inputPanel');
                const mainContent = document.querySelector('.main-content');
                if (!inputPanel || !mainContent) return;
                this.inputPanelResizeDrag = {
                    startX: e.clientX,
                    startWidth: inputPanel.offsetWidth,
                    minWidth: 280,
                    maxWidth: Math.max(280, mainContent.clientWidth - 240),
                };
                e.preventDefault();
                e.stopPropagation();
            },

            // ===== Input Panel =====
            toggleInput() {
                if (this.inputPanelMode === 'hidden') {
                    this.openInputPanel('normal');
                } else {
                    this.hideInputPanel();
                }
            },

            applyInput() {
                const raw = this.getJsonInputValue().trim();
                if (!raw) return;
                try {
                    this.data = JSON.parse(raw);
                    this.focusPath = '';
                    this.nestedStates = {};
                    this.columnStates = {};
                    this.render();
                    this.setStatus('JSON 已加载');
                } catch (e) {
                    this.setStatus('JSON 解析错误: ' + e.message, true);
                }
            },

            sendToInputPanel() {
                if (this.data === null) return this.setStatus('没有数据', true);
                const json = JSON.stringify(this.data, null, 2);
                this.setJsonInputValue(json, { focus: false });
                if (this.inputPanelMode === 'hidden') this.openInputPanel('normal', false);
                else this.applyInputPanelLayout();
                this.setStatus('JSON 已发送到输入面板');
            },

            // ===== Actions =====
            formatJSON() {
                if (this.data === null) return this.setStatus('没有数据', true);
                const formatted = JSON.stringify(this.data, null, 2);
                this.setJsonInputValue(formatted, { focus: false });
                if (this.inputPanelMode === 'hidden') this.openInputPanel('normal', false);
                else this.applyInputPanelLayout();
                this.setStatus('JSON 已格式化');
            },

            minifyJSON() {
                if (this.data === null) return this.setStatus('没有数据', true);
                const minified = JSON.stringify(this.data);
                this.setJsonInputValue(minified, { focus: false });
                if (this.inputPanelMode === 'hidden') this.openInputPanel('normal', false);
                else this.applyInputPanelLayout();
                this.setStatus('JSON 已压缩');
            },

            copyJSON() {
                if (this.data === null) return this.setStatus('没有数据', true);
                navigator.clipboard.writeText(JSON.stringify(this.data, null, 2)).then(() => {
                    this.setStatus('JSON 已复制到剪贴板');
                });
            },

            downloadJSON() {
                if (this.data === null) return this.setStatus('没有数据', true);
                const json = JSON.stringify(this.data, null, 2);
                const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `wysJSON-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
                this.setStatus('JSON 已下载');
            },

            loadSample() {
                const sample = {
                    "employees": [
                        {
                            "name": "张三",
                            "age": 30,
                            "email": "zhangsan@example.com",
                            "skills": ["Java", "Python", "Go"],
                            "address": {
                                "city": "北京",
                                "district": "海淀区",
                                "street": "中关村大街1号"
                            },
                            "projects": [
                                { "name": "Project Alpha", "role": "Leader", "hours": 160 },
                                { "name": "Project Beta", "role": "Developer", "hours": 120 }
                            ]
                        },
                        {
                            "name": "李四",
                            "age": 28,
                            "email": "lisi@example.com",
                            "skills": ["JavaScript", "React", "Node.js"],
                            "address": {
                                "city": "上海",
                                "district": "浦东新区",
                                "street": "张江路99号"
                            },
                            "projects": [
                                { "name": "Project Gamma", "role": "Developer", "hours": 200 }
                            ]
                        }
                    ],
                    "company": {
                        "name": "科技有限公司",
                        "founded": 2020,
                        "public": false,
                        "departments": {
                            "engineering": { "head": "王五", "count": 50 },
                            "design": { "head": "赵六", "count": 15 }
                        }
                    }
                };
                this.data = sample;
                this.focusPath = '';
                this.setJsonInputValue(JSON.stringify(sample, null, 2), { focus: false });
                this.nestedStates = {};
                this.columnStates = {};
                this.render();
                this.setStatus('示例数据已加载');
            },

            // ===== Breadcrumb =====
            normalizePath(path) {
                return path || '';
            },

            getPathDepth(path) {
                return this.getPathSegments(path).length;
            },

            getVisibleDepthLimit() {
                return Number.isFinite(this.visibleDepthLimit) && this.visibleDepthLimit > 0 ? this.visibleDepthLimit : Infinity;
            },

            canExpandNestedPath(path) {
                return this.getPathDepth(path) < this.getVisibleDepthLimit();
            },

            getPaginationKey(path) {
                return path || '__root_array__';
            },

            shouldPaginateCount(totalItems) {
                return Number(totalItems) > this.paginationThreshold;
            },

            getPaginationState(path, totalItems) {
                const enabled = this.shouldPaginateCount(totalItems);
                const key = this.getPaginationKey(path);
                if (!enabled) {
                    delete this.paginationStates[key];
                    return {
                        enabled: false,
                        currentPage: 1,
                        pageSize: totalItems,
                        totalItems,
                        totalPages: 1,
                        startIndex: 0,
                        endIndex: totalItems,
                    };
                }

                const existing = this.paginationStates[key] || {};
                const requestedPageSize = this.paginationPageSizes.includes(existing.pageSize) ? existing.pageSize : 50;
                const pageSize = Math.max(1, Math.min(requestedPageSize, totalItems));
                const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
                const currentPage = Math.min(Math.max(1, existing.currentPage || 1), totalPages);
                const startIndex = (currentPage - 1) * pageSize;
                const endIndex = Math.min(totalItems, startIndex + pageSize);
                this.paginationStates[key] = { currentPage, pageSize };
                return {
                    enabled: true,
                    currentPage,
                    pageSize,
                    totalItems,
                    totalPages,
                    startIndex,
                    endIndex,
                };
            },

            updatePaginationState(path, partialState = {}) {
                const key = this.getPaginationKey(path);
                const existing = this.paginationStates[key] || { currentPage: 1, pageSize: 50 };
                this.paginationStates[key] = { ...existing, ...partialState };
            },

            ensurePaginationIncludesIndex(path, index, totalItems) {
                if (!Number.isInteger(index) || index < 0) return false;
                const paginationState = this.getPaginationState(path, totalItems);
                if (!paginationState.enabled) return false;
                const nextPage = Math.floor(index / paginationState.pageSize) + 1;
                if (nextPage === paginationState.currentPage) return false;
                this.updatePaginationState(path, { currentPage: nextPage, pageSize: paginationState.pageSize });
                return true;
            },

            getInnermostArrayPathInfo(path) {
                if (!path) return null;
                const parts = this.parsePath(path);
                let currentPath = '';
                let candidate = null;
                for (const part of parts) {
                    if (typeof part === 'number') {
                        candidate = { arrayPath: currentPath, index: part };
                        currentPath = `${currentPath}[${part}]`;
                    } else {
                        currentPath = currentPath ? `${currentPath}.${part}` : part;
                    }
                }
                return candidate;
            },

            createPaginationBar(path, paginationState) {
                if (!paginationState?.enabled) return null;
                const wrapper = document.createElement('div');
                wrapper.className = 'table-pagination';

                const left = document.createElement('div');
                left.className = 'table-pagination-group';
                const summary = document.createElement('span');
                summary.textContent = `第 ${paginationState.currentPage} / ${paginationState.totalPages} 页，共 ${paginationState.totalItems} 行`;
                left.appendChild(summary);

                const right = document.createElement('div');
                right.className = 'table-pagination-group';

                const prevBtn = document.createElement('button');
                prevBtn.type = 'button';
                prevBtn.textContent = '上一页';
                prevBtn.disabled = paginationState.currentPage <= 1;
                prevBtn.addEventListener('click', () => {
                    this.updatePaginationState(path, { currentPage: paginationState.currentPage - 1, pageSize: paginationState.pageSize });
                    this.render();
                });
                right.appendChild(prevBtn);

                const pageSelect = document.createElement('select');
                for (let pageIndex = 1; pageIndex <= paginationState.totalPages; pageIndex++) {
                    const option = document.createElement('option');
                    option.value = String(pageIndex);
                    option.textContent = String(pageIndex);
                    option.selected = pageIndex === paginationState.currentPage;
                    pageSelect.appendChild(option);
                }
                pageSelect.addEventListener('change', (e) => {
                    this.updatePaginationState(path, { currentPage: Math.max(1, Number(e.target.value) || 1), pageSize: paginationState.pageSize });
                    this.render();
                });
                right.appendChild(pageSelect);

                const nextBtn = document.createElement('button');
                nextBtn.type = 'button';
                nextBtn.textContent = '下一页';
                nextBtn.disabled = paginationState.currentPage >= paginationState.totalPages;
                nextBtn.addEventListener('click', () => {
                    this.updatePaginationState(path, { currentPage: paginationState.currentPage + 1, pageSize: paginationState.pageSize });
                    this.render();
                });
                right.appendChild(nextBtn);

                const pageSizeSelect = document.createElement('select');
                for (const pageSize of this.paginationPageSizes) {
                    const option = document.createElement('option');
                    option.value = String(pageSize);
                    option.textContent = `${pageSize} / 页`;
                    option.selected = pageSize === paginationState.pageSize;
                    pageSizeSelect.appendChild(option);
                }
                pageSizeSelect.addEventListener('change', (e) => {
                    const nextPageSize = Math.max(1, Number(e.target.value) || paginationState.pageSize);
                    this.updatePaginationState(path, { currentPage: 1, pageSize: nextPageSize });
                    this.render();
                });
                right.appendChild(pageSizeSelect);

                wrapper.appendChild(left);
                wrapper.appendChild(right);
                return wrapper;
            },

            syncVisibleDepthSelect() {
                const depthSelect = document.getElementById('selVisibleDepth');
                if (depthSelect) depthSelect.value = this.visibleDepthLimit === null ? 'all' : String(this.visibleDepthLimit);
            },

            revealNestedPath(path, key) {
                const targetPath = key !== undefined ? (path ? `${path}.${key}` : key) : path;
                const colStateKey = key !== undefined ? this.getColumnStateKey(path, key) : this.getColumnStateKey(path);
                if (!this.canExpandNestedPath(targetPath)) {
                    this.visibleDepthLimit = Math.max(this.getPathDepth(targetPath) + 1, 1);
                    this.syncVisibleDepthSelect();
                }
                if (colStateKey) this.columnStates[colStateKey] = true;
                this.saveUIState();
                this.render();
            },

            createNestedHintButton({ title, text = '展开', onClick, className = '' }) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = className;
                button.textContent = text;
                button.title = title;
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClick?.();
                });
                return button;
            },

            getFocusedData() {
                if (!this.focusPath) return this.data;
                return this.getValueAtPath(this.data, this.focusPath);
            },

            getPathSegments(path) {
                if (!path) return [];
                const segments = [];
                const regex = /([^\.\[\]]+)|(\[(\d+)\])/g;
                let match;
                let currentPath = '';
                while ((match = regex.exec(path)) !== null) {
                    if (match[1] !== undefined) {
                        currentPath = currentPath ? `${currentPath}.${match[1]}` : match[1];
                        segments.push({ label: match[1], path: currentPath });
                    } else if (match[3] !== undefined) {
                        currentPath = `${currentPath}[${match[3]}]`;
                        segments.push({ label: `[${match[3]}]`, path: currentPath });
                    }
                }
                return segments;
            },

            setFocusPath(path, options = {}) {
                const nextPath = this.normalizePath(path);
                if (nextPath && this.getValueAtPath(this.data, nextPath) === undefined) {
                    return this.setStatus(this.getTranslation('notFoundToFocus'), true);
                }
                this.focusPath = nextPath;
                this.pendingCellSelection = options.selectPath || null;
                this.render();
                this.setStatus(nextPath ? this.getTranslation('focusedToNode', { path: nextPath }) : this.getTranslation('returnedToRoot'));
            },

            updateBreadcrumb() {
                const bc = document.getElementById('breadcrumb');
                const segments = this.getPathSegments(this.focusPath);
                const parts = [`<span class="${segments.length === 0 ? 'current' : ''}" data-path="">📄 root</span>`];
                for (const segment of segments) {
                    parts.push('<span class="sep">/</span>');
                    parts.push(`<span class="${segment.path === this.focusPath ? 'current' : ''}" data-path="${segment.path}">${segment.label}</span>`);
                }
                if (this.focusPath) {
                    parts.push('<span class="focus-badge">' + this.getTranslation('focusBadge') + '</span>');
                }
                bc.innerHTML = parts.join('');
            },

            handleBreadcrumbClick(e) {
                const crumb = e.target.closest('[data-path]');
                if (!crumb) return;
                this.setFocusPath(crumb.dataset.path || '');
            },

            collectMiniMapNodes(value, basePath, depth = 0, bucket = []) {
                const currentType = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
                bucket.push({ path: basePath || '', label: basePath || 'root', type: currentType, depth, valuePreview: this.getValuePreview(value) });
                if (depth >= this.getVisibleDepthLimit() || value === null || value === undefined) return bucket;
                if (Array.isArray(value)) {
                    for (let index = 0; index < value.length; index++) {
                        this.collectMiniMapNodes(value[index], `${basePath}[${index}]`, depth + 1, bucket);
                    }
                    return bucket;
                }
                if (typeof value === 'object') {
                    for (const key of Object.keys(value)) {
                        const nextPath = basePath ? `${basePath}.${key}` : key;
                        this.collectMiniMapNodes(value[key], nextPath, depth + 1, bucket);
                    }
                }
                return bucket;
            },

            escapeHtml(value) {
                return String(value ?? '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            },

            getValuePreview(value) {
                if (value === null) return 'null';
                if (value === undefined) return 'undefined';
                if (typeof value === 'string') return value.length > 80 ? `${value.slice(0, 80)}...` : value;
                if (typeof value === 'number' || typeof value === 'boolean') return String(value);
                if (Array.isArray(value)) return `[${value.length}]`;
                if (typeof value === 'object') return `{${Object.keys(value).slice(0, 4).join(', ')}}`;
                return String(value);
            },

            getPathKey(path) {
                if (!path) return 'root';
                const segments = this.getPathSegments(path);
                return segments[segments.length - 1]?.label?.replace(/^\[|\]$/g, '') || path;
            },

            getMiniMapTreeNodes(focusValue) {
                const nodes = [];
                if (this.focusPath) {
                    nodes.push({ path: '', label: 'root', type: Array.isArray(this.data) ? 'array' : this.data === null ? 'null' : typeof this.data, depth: 0, valuePreview: this.getValuePreview(this.data) });
                    const segments = this.getPathSegments(this.focusPath);
                    for (const segment of segments) {
                        if (segment.path === this.focusPath) break;
                        const value = this.getValueAtPath(this.data, segment.path);
                        nodes.push({ path: segment.path, label: segment.path, type: Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value, depth: 0, valuePreview: this.getValuePreview(value) });
                    }
                }
                return this.collectMiniMapNodes(focusValue, this.focusPath || '', 0, nodes);
            },

            collectSearchableNodes(value = this.data, basePath = '', depth = 0, bucket = [], limit = 6000) {
                if (bucket.length >= limit) return bucket;
                const type = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
                const key = this.getPathKey(basePath);
                const parentPath = this.getParentPath(basePath);
                bucket.push({
                    path: basePath || '',
                    label: basePath || 'root',
                    key,
                    type,
                    valuePreview: this.getValuePreview(value),
                    parentPath,
                    depth,
                    withinCurrentFocus: this.isPathAtOrInside(basePath || '', this.focusPath || ''),
                    isVisibleNow: !!(basePath && this.findCellByPath(basePath)),
                });
                if (bucket.length >= limit || value === null || value === undefined) return bucket;
                if (Array.isArray(value)) {
                    for (let index = 0; index < value.length && bucket.length < limit; index += 1) {
                        this.collectSearchableNodes(value[index], `${basePath}[${index}]`, depth + 1, bucket, limit);
                    }
                    return bucket;
                }
                if (typeof value === 'object') {
                    for (const childKey of Object.keys(value)) {
                        if (bucket.length >= limit) break;
                        const nextPath = basePath ? `${basePath}.${childKey}` : childKey;
                        this.collectSearchableNodes(value[childKey], nextPath, depth + 1, bucket, limit);
                    }
                }
                return bucket;
            },

            getMiniMapSearchResults() {
                const query = (this.miniMapSearchQuery || '').trim().toLowerCase();
                if (!query || this.data === null || this.data === undefined) return { results: [], total: 0, limited: false };
                const mode = this.miniMapSearchMode || 'all';
                const nodes = this.collectSearchableNodes();
                const scored = [];
                for (const node of nodes) {
                    const pathText = node.path.toLowerCase();
                    const keyText = node.key.toLowerCase();
                    const valueText = String(node.valuePreview || '').toLowerCase();
                    const keyHit = keyText.includes(query) || pathText.includes(query);
                    const valueHit = valueText.includes(query);
                    if (mode === 'key' && !keyHit) continue;
                    if (mode === 'value' && !valueHit) continue;
                    if (mode === 'all' && !keyHit && !valueHit) continue;
                    let score = 0;
                    if (node.withinCurrentFocus) score += 40;
                    if (node.isVisibleNow) score += 30;
                    if (keyText === query || pathText === query) score += 100;
                    else if (keyText.startsWith(query) || pathText.startsWith(query)) score += 70;
                    else if (keyHit) score += 45;
                    if (valueText === query) score += 55;
                    else if (valueText.startsWith(query)) score += 35;
                    else if (valueHit) score += 20;
                    score -= Math.min(node.depth, 20);
                    scored.push({ ...node, hitKind: keyHit ? 'key' : 'value', score });
                }
                scored.sort((a, b) => b.score - a.score || a.depth - b.depth || a.path.localeCompare(b.path));
                return { results: scored.slice(0, 80), total: scored.length, limited: scored.length > 80 };
            },

            highlightSearchText(text) {
                const raw = String(text ?? '');
                const query = (this.miniMapSearchQuery || '').trim();
                if (!query) return this.escapeHtml(raw);
                const lower = raw.toLowerCase();
                const index = lower.indexOf(query.toLowerCase());
                if (index < 0) return this.escapeHtml(raw);
                return `${this.escapeHtml(raw.slice(0, index))}<span class="mini-map-result-hit">${this.escapeHtml(raw.slice(index, index + query.length))}</span>${this.escapeHtml(raw.slice(index + query.length))}`;
            },

            getMiniMapSearchDisplayQuery() {
                return this.miniMapSearchDraftQuery === null ? this.miniMapSearchQuery : this.miniMapSearchDraftQuery;
            },

            renderMiniMapSearchBox(searchState) {
                const displayQuery = this.getMiniMapSearchDisplayQuery() || '';
                const query = this.escapeHtml(displayQuery);
                const mode = this.miniMapSearchMode || 'all';
                const isPending = this.miniMapSearchDraftQuery !== null && this.miniMapSearchDraftQuery !== this.miniMapSearchQuery;
                const meta = isPending
                    ? this.getTranslation('quickJumpSearchWaiting')
                    : this.miniMapSearchQuery.trim()
                        ? `${this.getTranslation('quickJumpSearchResults', { count: searchState.total })}${searchState.limited ? ` · ${this.getTranslation('quickJumpSearchLimited', { count: searchState.results.length })}` : ''}`
                        : this.getTranslation('quickJumpSearchPlaceholder');
                return `<div class="mini-map-search">
                    <div class="mini-map-search-row">
                        <input class="mini-map-search-input" type="search" value="${query}" placeholder="${this.escapeHtml(this.getTranslation('quickJumpSearchPlaceholder'))}" autocomplete="off" spellcheck="false">
                        <select class="mini-map-search-mode" title="Search mode">
                            <option value="all" ${mode === 'all' ? 'selected' : ''}>${this.escapeHtml(this.getTranslation('quickJumpSearchAll'))}</option>
                            <option value="key" ${mode === 'key' ? 'selected' : ''}>${this.escapeHtml(this.getTranslation('quickJumpSearchKey'))}</option>
                            <option value="value" ${mode === 'value' ? 'selected' : ''}>${this.escapeHtml(this.getTranslation('quickJumpSearchValue'))}</option>
                        </select>
                        <button type="button" class="mini-map-search-clear" title="Clear">×</button>
                    </div>
                    <div class="mini-map-search-meta">${this.escapeHtml(meta)}</div>
                </div>`;
            },

            renderMiniMapSearchResults(searchState, activePath) {
                if (!this.miniMapSearchQuery.trim()) return null;
                if (searchState.results.length === 0) {
                    return `<div class="mini-map-empty">${this.escapeHtml(this.getTranslation('quickJumpSearchEmpty'))}</div>`;
                }
                const activeIndex = Math.min(Math.max(this.miniMapSearchActiveIndex || 0, 0), searchState.results.length - 1);
                this.miniMapSearchActiveIndex = activeIndex;
                return searchState.results.map((node, index) => `
            <button class="mini-map-item mini-map-search-result ${activePath === node.path || index === activeIndex ? 'active' : ''}" title="${this.escapeHtml(node.path || 'root')} (${node.type})" data-path="${this.escapeHtml(node.path)}" data-search-index="${index}">
                <span class="mini-map-result-kv"><span class="mini-map-result-key"><span class="mini-map-result-token">key</span><span class="mini-map-result-key-text">${this.highlightSearchText(node.key || node.label || 'root')}</span></span><span class="mini-map-result-value"><span class="mini-map-result-token">value</span><span class="mini-map-result-value-text">${this.highlightSearchText(node.valuePreview)}</span></span></span>
                <span class="mini-map-result-path">${this.highlightSearchText(node.path || 'root')}<span class="mini-map-type">${this.escapeHtml(node.hitKind)} · ${this.escapeHtml(node.type)}</span></span>
            </button>`).join('');
            },

            collectThumbnailBlocks() {
                const tableView = document.getElementById('tableView');
                const canvas = document.getElementById('editorCanvas');
                if (!tableView || !canvas || !this.data) return '';
                const tableRect = tableView.getBoundingClientRect();
                const totalWidth = Math.max(tableView.scrollWidth, 1);
                const totalHeight = Math.max(tableView.scrollHeight, 1);
                const overviewWidth = Math.max(180, this.thumbnailWidth - 32);
                const overviewHeight = 168;
                const activePath = this.selectedCell?.dataset?.path || this.focusPath || '';
                const elements = Array.from(canvas.querySelectorAll('.json-table-wrapper, .nested-content, .nested-preview'));
                return elements.map((element) => {
                    const rect = element.getBoundingClientRect();
                    const contentX = tableView.scrollLeft + rect.left - tableRect.left;
                    const contentY = tableView.scrollTop + rect.top - tableRect.top;
                    const width = Math.max(6, (rect.width / totalWidth) * overviewWidth);
                    const height = Math.max(4, (rect.height / totalHeight) * overviewHeight);
                    const left = (contentX / totalWidth) * overviewWidth;
                    const top = (contentY / totalHeight) * overviewHeight;
                    const blockType = element.classList.contains('nested-preview') ? 'preview' : element.classList.contains('nested-content') ? 'nested' : 'table';
                    const path = element.closest('[data-path]')?.dataset?.path || '';
                    const activeClass = activePath && path && activePath.startsWith(path) ? 'active' : '';
                    return `<div class="thumbnail-block ${blockType} ${activeClass}" style="left:${left}px;top:${top}px;width:${width}px;height:${height}px"></div>`;
                }).join('');
            },

            updateThumbnail() {
                const panel = document.getElementById('thumbnailPanel');
                if (!panel) return;
                console.log('updateThumbnail start:', 'thumbnailEnabled=', this.thumbnailEnabled, 'dataExists=', !!this.data, 'focusPath=', this.focusPath);
                panel.classList.toggle('hidden', !this.thumbnailEnabled || this.data === null || this.data === undefined);
                if (!this.thumbnailEnabled || this.data === null || this.data === undefined) {
                    panel.innerHTML = '';
                    window.__lastThumbnailDebug = { stage: 'hidden', thumbnailEnabled: !!this.thumbnailEnabled, dataNull: this.data === null };
                    console.log('updateThumbnail: hidden or no data (thumbnailEnabled=', this.thumbnailEnabled, 'dataNull=', this.data === null, ')');
                    return;
                }
                // 优化：当 JSON 非常大时，避免执行大量 DOM 查询/计算以生成缩略图
                // 标注：此处修改为解决超大型json问题
                try {
                    const rawText = typeof this.getJsonInputValue === 'function' ? this.getJsonInputValue() : (this.data ? JSON.stringify(this.data) : '');
                    const LARGE_JSON_THRESHOLD = 200000; // 字符数阈值（约 200KB）
                    const canvas = document.getElementById('editorCanvas');
                    const cheapElementsCount = canvas ? (canvas.querySelectorAll('.json-table-wrapper, .nested-content, .nested-preview')?.length || 0) : 0;
                    console.log('updateThumbnail: rawText length=', rawText ? rawText.length : 0, 'threshold=', LARGE_JSON_THRESHOLD, 'cheapElementsCount=', cheapElementsCount);
                    // 双重条件：仅当文本非常大并且页面中元素数量也很多时，才触发轻量回退。
                    if (rawText && rawText.length > LARGE_JSON_THRESHOLD && cheapElementsCount > 250) {
                        // 渲染轻量占位缩略图，避免遍历/计算所有表格节点导致卡顿或失败
                        console.log('updateThumbnail: large JSON fallback applied (len=', rawText.length, 'elements=', cheapElementsCount, ')');
                        window.__lastThumbnailDebug = { stage: 'fallback', rawLen: rawText.length, cheapElementsCount };
                        const placeholder = `<div class="thumbnail-canvas"><div class="thumbnail-block table active" style="left:0px;top:0px;width:100%;height:100%"></div></div>`;
                        panel.innerHTML = `<div class="mini-map-resize-handle" title="${this.getTranslation('thumbnailHint')}"></div>${this.renderFloatingPanelHeader('thumbnail', 'thumbnailHint', 'thumbnail')}<div class="mini-map-overview"><div class="mini-map-overview-grid"></div>${placeholder}<div class="mini-map-viewport" id="thumbnailViewport"></div><div class="mini-map-overview-label" id="thumbnailOverviewLabel">${this.getTranslation('thumbnailOverviewLabel')}</div></div>`;
                        this.updateThumbnailViewport();
                        this.updateThumbnailPosition();
                        return;
                    }
                } catch (err) {
                    console.warn('thumbnail fallback check failed', err);
                    window.__lastThumbnailDebug = { stage: 'fallback-check-error', error: String(err) };
                }
                const blocks = this.collectThumbnailBlocks();
                try {
                    const blocksHtml = blocks || '';
                    const blocksCount = (blocksHtml.match(/class="thumbnail-block/g) || []).length;
                    window.__lastThumbnailDebug = { stage: 'collected', blocksHtmlLength: blocksHtml.length, blocksCount };
                    console.log('updateThumbnail: collected blocks length=', blocksHtml.length, 'blocksCount=', blocksCount);
                } catch (e) {
                    window.__lastThumbnailDebug = { stage: 'collected-error', error: String(e) };
                    console.log('updateThumbnail: failed to count blocks', e);
                }
                panel.innerHTML = `<div class="mini-map-resize-handle" title="${this.getTranslation('thumbnailHint')}"></div>${this.renderFloatingPanelHeader('thumbnail', 'thumbnailHint', 'thumbnail')}<div class="mini-map-overview"><div class="mini-map-overview-grid"></div><div class="thumbnail-canvas">${blocks}</div><div class="mini-map-viewport" id="thumbnailViewport"></div><div class="mini-map-overview-label" id="thumbnailOverviewLabel">${this.getTranslation('thumbnailOverviewLabel')}</div></div>`;
                this.updateThumbnailViewport();
                this.updateThumbnailPosition();
            },

            renderFloatingPanelHeader(titleKey, hintKey, panelName) {
                const title = this.getTranslation(titleKey);
                const hint = this.getTranslation(hintKey);
                const closeTitle = this.getTranslation('closePanel');
                return `<div class="mini-map-header"><div class="mini-map-header-main"><div class="mini-map-title">${title}</div><div class="mini-map-hint" title="${hint}">${hint}</div></div><button type="button" class="mini-map-close" data-panel="${panelName}" title="${closeTitle}" aria-label="${closeTitle}">×</button></div>`;
            },

            updateMiniMap() {
                const miniMap = document.getElementById('miniMap');
                if (!miniMap) return;
                miniMap.classList.toggle('hidden', !this.miniMapEnabled || this.data === null || this.data === undefined);
                if (!this.miniMapEnabled || this.data === null || this.data === undefined) {
                    miniMap.innerHTML = '';
                    return;
                }
                let focusValue = this.getFocusedData();
                if (this.focusPath && focusValue === undefined) {
                    this.focusPath = '';
                    focusValue = this.data;
                }
                if (focusValue === undefined) {
                    miniMap.innerHTML = '';
                    return;
                }
                const nodes = this.getMiniMapTreeNodes(focusValue);
                const activePath = this.selectedCell?.dataset?.path || this.focusPath || '';
                const searchState = this.getMiniMapSearchResults();
                const searchBox = this.renderMiniMapSearchBox(searchState);
                const searchResults = this.renderMiniMapSearchResults(searchState, activePath);
                const treeItems = nodes.map((node) => `
            <button class="mini-map-item ${activePath === node.path ? 'active' : ''}" title="${node.label || 'root'} (${node.type})" data-path="${node.path}" style="padding-left:${6 + node.depth * 12}px">
                <span class="mini-map-path">${node.label || 'root'}<span class="mini-map-type">${node.type}</span></span>
                <span class="mini-map-value-preview">${this.escapeHtml(node.valuePreview)}</span>
            </button>`).join('');
                miniMap.innerHTML = `<div class="mini-map-resize-handle" title="${this.getTranslation('quickJumpHint')}"></div>${this.renderFloatingPanelHeader('quickJump', 'quickJumpHint', 'quickJump')}${searchBox}${searchResults ?? treeItems}`;
                this.updateMiniMapPosition();
            },

            updateThumbnailPosition() {
                const panel = document.getElementById('thumbnailPanel');
                const tableView = document.getElementById('tableView');
                if (!panel || !tableView || panel.classList.contains('hidden')) return;
                panel.style.width = `${this.thumbnailWidth}px`;
                const tableRect = tableView.getBoundingClientRect();
                const defaultX = Math.max(8, tableRect.right - panel.offsetWidth - 12);
                const defaultY = Math.max(8, tableRect.top + 12);
                const position = this.clampFloatingPanelPosition(
                    this.thumbnailCustomOffset?.x ?? defaultX,
                    this.thumbnailCustomOffset?.y ?? defaultY,
                    panel
                );
                if (this.thumbnailCustomOffset) this.thumbnailCustomOffset = position;
                panel.style.right = 'auto';
                panel.style.left = `${position.x}px`;
                panel.style.top = `${position.y}px`;
            },

            updateMiniMapPosition() {
                const miniMap = document.getElementById('miniMap');
                const tableView = document.getElementById('tableView');
                if (!miniMap || !tableView || miniMap.classList.contains('hidden')) return;
                miniMap.style.width = `${this.miniMapWidth}px`;
                const tableRect = tableView.getBoundingClientRect();
                const defaultX = Math.max(8, tableRect.right - miniMap.offsetWidth - 12);
                const defaultY = Math.max(8, tableRect.top + 196);
                const position = this.clampFloatingPanelPosition(
                    this.miniMapCustomOffset?.x ?? defaultX,
                    this.miniMapCustomOffset?.y ?? defaultY,
                    miniMap
                );
                if (this.miniMapCustomOffset) this.miniMapCustomOffset = position;
                miniMap.style.right = 'auto';
                miniMap.style.left = `${position.x}px`;
                miniMap.style.top = `${position.y}px`;
            },

            clampFloatingPanelPosition(x, y, panel) {
                const margin = 8;
                const panelWidth = panel?.offsetWidth || 0;
                const panelHeight = panel?.offsetHeight || 0;
                const maxX = Math.max(margin, window.innerWidth - panelWidth - margin);
                const maxY = Math.max(margin, window.innerHeight - panelHeight - margin);
                return {
                    x: Math.min(Math.max(margin, Number(x) || margin), maxX),
                    y: Math.min(Math.max(margin, Number(y) || margin), maxY),
                };
            },

            updateThumbnailViewport() {
                const panel = document.getElementById('thumbnailPanel');
                const viewport = document.getElementById('thumbnailViewport');
                const label = document.getElementById('thumbnailOverviewLabel');
                const tableView = document.getElementById('tableView');
                const overview = panel?.querySelector('.mini-map-overview');
                if (!panel || panel.classList.contains('hidden') || !viewport || !label || !tableView || !overview) return;
                const trackWidth = overview.clientWidth;
                const totalHeight = Math.max(tableView.scrollHeight, 1);
                const visibleHeight = Math.max(tableView.clientHeight, 1);
                const totalWidth = Math.max(tableView.scrollWidth, 1);
                const visibleWidth = Math.max(tableView.clientWidth, 1);
                const trackHeight = overview.clientHeight;
                const hasHorizontalScroll = totalWidth > visibleWidth + 1;
                const hasVerticalScroll = totalHeight > visibleHeight + 1;
                if (!hasHorizontalScroll && !hasVerticalScroll) {
                    viewport.style.transform = 'translate3d(0, 0, 0)';
                    viewport.style.width = `${trackWidth}px`;
                    viewport.style.height = `${trackHeight}px`;
                    label.textContent = '全部';
                    return;
                }
                const viewportWidth = hasHorizontalScroll
                    ? Math.max(10, Math.round((visibleWidth / totalWidth) * trackWidth))
                    : Math.min(trackWidth, Math.max(18, Math.round(trackWidth * 0.32)));
                const viewportHeight = hasVerticalScroll
                    ? Math.max(8, Math.round((visibleHeight / totalHeight) * trackHeight))
                    : Math.min(trackHeight, Math.max(16, Math.round(trackHeight * 0.22)));
                const maxScrollLeft = Math.max(tableView.scrollWidth - tableView.clientWidth, 1);
                const maxScroll = Math.max(tableView.scrollHeight - tableView.clientHeight, 1);
                const left = !hasHorizontalScroll
                    ? Math.round((trackWidth - viewportWidth) / 2)
                    : Math.round((tableView.scrollLeft / maxScrollLeft) * Math.max(trackWidth - viewportWidth, 0));
                const top = !hasVerticalScroll
                    ? Math.round((trackHeight - viewportHeight) / 2)
                    : Math.round((tableView.scrollTop / maxScroll) * Math.max(trackHeight - viewportHeight, 0));
                viewport.style.transform = `translate3d(${left}px, ${top}px, 0)`;
                viewport.style.width = `${Math.min(viewportWidth, trackWidth)}px`;
                viewport.style.height = `${Math.min(viewportHeight, trackHeight)}px`;
                const scrollLeftPercent = !hasHorizontalScroll ? 0 : Math.round((tableView.scrollLeft / maxScrollLeft) * 100);
                const scrollTopPercent = !hasVerticalScroll ? 0 : Math.round((tableView.scrollTop / maxScroll) * 100);
                label.textContent = `x${scrollLeftPercent} y${scrollTopPercent}`;
            },

            resolveThumbnailOverviewTarget(clientX, clientY, options = {}) {
                const dragMetrics = options.dragMetrics;
                const tableView = dragMetrics?.tableView || document.getElementById('tableView');
                const panel = dragMetrics ? null : document.getElementById('thumbnailPanel');
                const overview = dragMetrics?.overview || panel?.querySelector('.mini-map-overview');
                const viewport = dragMetrics?.viewport || document.getElementById('thumbnailViewport');
                if (!tableView || !overview || !viewport) return null;
                const rect = dragMetrics?.rect || overview.getBoundingClientRect();
                const viewportWidth = dragMetrics?.viewportWidth ?? viewport.offsetWidth;
                const viewportHeight = dragMetrics?.viewportHeight ?? viewport.offsetHeight;
                const offsetX = options.offsetX ?? viewportWidth / 2;
                const offsetY = options.offsetY ?? viewportHeight / 2;
                const desiredLeft = Math.min(Math.max(0, clientX - rect.left - offsetX), Math.max(rect.width - viewportWidth, 0));
                const desiredTop = Math.min(Math.max(0, clientY - rect.top - offsetY), Math.max(rect.height - viewportHeight, 0));
                const maxScrollLeft = dragMetrics?.maxScrollLeft ?? Math.max(tableView.scrollWidth - tableView.clientWidth, 0);
                const maxScrollTop = dragMetrics?.maxScrollTop ?? Math.max(tableView.scrollHeight - tableView.clientHeight, 0);
                const scrollLeft = rect.width <= viewportWidth || maxScrollLeft === 0
                    ? 0
                    : (desiredLeft / Math.max(rect.width - viewportWidth, 1)) * maxScrollLeft;
                const scrollTop = rect.height <= viewportHeight || maxScrollTop === 0
                    ? 0
                    : (desiredTop / Math.max(rect.height - viewportHeight, 1)) * maxScrollTop;
                return {
                    tableView,
                    viewport,
                    desiredLeft,
                    desiredTop,
                    scrollLeft,
                    scrollTop,
                    maxScrollLeft,
                    maxScrollTop,
                };
            },

            applyThumbnailViewportTarget(target) {
                if (!target?.viewport) return;
                target.viewport.style.transform = `translate3d(${Math.round(target.desiredLeft)}px, ${Math.round(target.desiredTop)}px, 0)`;
                const label = document.getElementById('thumbnailOverviewLabel');
                if (!label) return;
                const scrollLeftPercent = target.maxScrollLeft === 0 ? 0 : Math.round((target.scrollLeft / target.maxScrollLeft) * 100);
                const scrollTopPercent = target.maxScrollTop === 0 ? 0 : Math.round((target.scrollTop / target.maxScrollTop) * 100);
                label.textContent = `x${scrollLeftPercent} y${scrollTopPercent}`;
            },

            flushThumbnailViewportDrag() {
                this.thumbnailViewportFrame = 0;
                const pending = this.thumbnailViewportPending;
                this.thumbnailViewportPending = null;
                if (!pending) return;
                const target = this.resolveThumbnailOverviewTarget(pending.clientX, pending.clientY, pending.options);
                if (!target) return;
                this.thumbnailViewportLastTarget = target;
                this.applyThumbnailViewportTarget(target);
            },

            requestThumbnailViewportDrag(clientX, clientY, options = {}) {
                this.thumbnailViewportPending = { clientX, clientY, options };
                if (this.thumbnailViewportFrame) return;
                this.thumbnailViewportFrame = requestAnimationFrame(() => this.flushThumbnailViewportDrag());
            },

            scrollThumbnailOverviewTo(clientX, clientY, options = {}) {
                const target = this.resolveThumbnailOverviewTarget(clientX, clientY, options);
                if (!target) return;
                target.tableView.scrollTo({
                    left: target.scrollLeft,
                    top: target.scrollTop,
                    behavior: options.smooth === false ? 'auto' : 'smooth'
                });
            },

            handleThumbnailClick(e) {
                const closeButton = e.target.closest('.mini-map-close[data-panel="thumbnail"]');
                if (closeButton) {
                    this.closeFloatingPanel('thumbnail');
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                if (e.target.closest('#thumbnailViewport')) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                const overview = e.target.closest('.mini-map-overview');
                if (!overview) return;
                if (this.thumbnailSuppressClick) {
                    this.thumbnailSuppressClick = false;
                    return;
                }
                this.scrollThumbnailOverviewTo(e.clientX, e.clientY, { smooth: true });
                this.setStatus('已通过缩略图定位视区');
            },

            centerCellInView(cell) {
                const tableView = document.getElementById('tableView');
                if (!tableView || !cell) return;
                const containerRect = tableView.getBoundingClientRect();
                const cellRect = cell.getBoundingClientRect();
                const deltaTop = cellRect.top - containerRect.top;
                const deltaLeft = cellRect.left - containerRect.left;
                const targetTop = tableView.scrollTop + deltaTop - (tableView.clientHeight / 2) + (cellRect.height / 2);
                const targetLeft = tableView.scrollLeft + deltaLeft - (tableView.clientWidth / 2) + (cellRect.width / 2);
                tableView.scrollTo({
                    top: Math.max(0, targetTop),
                    left: Math.max(0, targetLeft),
                    behavior: 'smooth'
                });
            },

            focusMiniMapSearchInput() {
                requestAnimationFrame(() => {
                    const nextInput = document.querySelector('#miniMap .mini-map-search-input');
                    if (!nextInput) return;
                    nextInput.focus();
                    const end = nextInput.value.length;
                    nextInput.setSelectionRange(end, end);
                });
            },

            clearMiniMapSearchDebounce() {
                if (!this.miniMapSearchDebounceTimer) return;
                window.clearTimeout(this.miniMapSearchDebounceTimer);
                this.miniMapSearchDebounceTimer = null;
            },

            flushMiniMapSearchDebounce(options = {}) {
                if (this.miniMapSearchComposing) return false;
                const hasDraft = this.miniMapSearchDraftQuery !== null;
                this.clearMiniMapSearchDebounce();
                if (!hasDraft) return false;
                this.miniMapSearchQuery = this.miniMapSearchDraftQuery || '';
                this.miniMapSearchDraftQuery = null;
                this.miniMapSearchActiveIndex = 0;
                if (options.render !== false) this.updateMiniMap();
                if (options.focus) this.focusMiniMapSearchInput();
                return true;
            },

            scheduleMiniMapSearch(query) {
                this.clearMiniMapSearchDebounce();
                this.miniMapSearchDraftQuery = query || '';
                this.miniMapSearchActiveIndex = 0;
                this.miniMapSearchDebounceTimer = window.setTimeout(() => {
                    this.miniMapSearchDebounceTimer = null;
                    if (this.miniMapSearchComposing) return;
                    this.flushMiniMapSearchDebounce({ focus: true });
                }, this.miniMapSearchDebounceDelay);
            },

            handleMiniMapSearchCompositionStart(e) {
                const input = e.target.closest('.mini-map-search-input');
                if (!input) return;
                this.miniMapSearchComposing = true;
                this.clearMiniMapSearchDebounce();
            },

            handleMiniMapSearchCompositionEnd(e) {
                const input = e.target.closest('.mini-map-search-input');
                if (!input) return;
                this.miniMapSearchComposing = false;
                this.scheduleMiniMapSearch(input.value || '');
            },

            closeFloatingPanel(panelName) {
                if (panelName === 'thumbnail') {
                    this.thumbnailEnabled = false;
                    const checkbox = document.getElementById('chkThumbnail');
                    if (checkbox) checkbox.checked = false;
                    this.saveUIState();
                    this.updateThumbnail();
                    return;
                }
                if (panelName === 'quickJump') {
                    this.miniMapEnabled = false;
                    const checkbox = document.getElementById('chkQuickJump');
                    if (checkbox) checkbox.checked = false;
                    this.saveUIState();
                    this.updateMiniMap();
                }
            },

            handleMiniMapClick(e) {
                const closeButton = e.target.closest('.mini-map-close[data-panel="quickJump"]');
                if (closeButton) {
                    this.closeFloatingPanel('quickJump');
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                if (e.target.closest('.mini-map-search-clear')) {
                    this.clearMiniMapSearchDebounce();
                    this.miniMapSearchComposing = false;
                    this.miniMapSearchQuery = '';
                    this.miniMapSearchDraftQuery = null;
                    this.miniMapSearchActiveIndex = 0;
                    this.updateMiniMap();
                    this.focusMiniMapSearchInput();
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                const item = e.target.closest('.mini-map-item[data-path]');
                if (!item) return;
                const path = item.dataset.path || '';
                this.miniMapSearchActiveIndex = Number(item.dataset.searchIndex || this.miniMapSearchActiveIndex || 0);
                this.locateQuickJumpPath(path, { focus: e.ctrlKey, search: item.classList.contains('mini-map-search-result') });
                e.preventDefault();
                e.stopPropagation();
            },

            handleMiniMapSearchInput(e) {
                const input = e.target.closest('.mini-map-search-input');
                if (!input) return;
                if (this.miniMapSearchComposing || e.isComposing) {
                    this.clearMiniMapSearchDebounce();
                    return;
                }
                this.scheduleMiniMapSearch(input.value || '');
            },

            handleMiniMapSearchChange(e) {
                const select = e.target.closest('.mini-map-search-mode');
                if (!select) return;
                this.flushMiniMapSearchDebounce({ render: false });
                this.miniMapSearchMode = select.value || 'all';
                this.miniMapSearchActiveIndex = 0;
                this.updateMiniMap();
                this.focusMiniMapSearchInput();
            },

            handleMiniMapSearchKeydown(e) {
                if (!e.target.closest('.mini-map-search-input, .mini-map-search-mode')) return;
                if (this.miniMapSearchComposing || e.isComposing) return;
                if (e.key === 'Escape') {
                    this.clearMiniMapSearchDebounce();
                    this.miniMapSearchComposing = false;
                    this.miniMapSearchQuery = '';
                    this.miniMapSearchDraftQuery = null;
                    this.miniMapSearchActiveIndex = 0;
                    this.updateMiniMap();
                    e.preventDefault();
                    return;
                }
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                    this.flushMiniMapSearchDebounce({ render: false });
                }
                const searchState = this.getMiniMapSearchResults();
                if (!this.miniMapSearchQuery.trim() || searchState.results.length === 0) return;
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    const delta = e.key === 'ArrowDown' ? 1 : -1;
                    this.miniMapSearchActiveIndex = (this.miniMapSearchActiveIndex + delta + searchState.results.length) % searchState.results.length;
                    this.updateMiniMap();
                    this.focusMiniMapSearchInput();
                    e.preventDefault();
                    return;
                }
                if (e.key === 'Enter') {
                    const result = searchState.results[Math.min(this.miniMapSearchActiveIndex || 0, searchState.results.length - 1)];
                    if (result) this.locateQuickJumpPath(result.path, { focus: e.ctrlKey, search: true });
                    e.preventDefault();
                }
            },

            getQuickJumpFocusPath(path) {
                if (!path) return '';
                if (this.focusPath && this.isPathAtOrInside(path, this.focusPath)) return this.focusPath;
                const value = this.getValueAtPath(this.data, path);
                const parentPath = this.getParentPath(path);
                if (value && typeof value === 'object') return parentPath;
                return parentPath;
            },

            locateQuickJumpPath(path, options = {}) {
                const value = path ? this.getValueAtPath(this.data, path) : this.data;
                if (options.focus && value && typeof value === 'object') {
                    this.setFocusPath(path);
                    return;
                }
                if (!options.search) {
                    if (!path) {
                        this.setFocusPath('');
                        return;
                    }
                    const directCell = this.selectCellByPath(path);
                    if (directCell) {
                        this.centerCellInView(directCell);
                        this.setStatus(`已定位到节点 ${path || 'root'}`);
                        this.updateMiniMap();
                        return;
                    }
                    this.pendingCellSelection = path;
                    this.render();
                    requestAnimationFrame(() => {
                        const cell = this.findCellByPath(path);
                        if (cell) this.centerCellInView(cell);
                    });
                    this.setStatus(`已定位到节点 ${path || 'root'}`);
                    return;
                }
                const focusPath = this.getQuickJumpFocusPath(path);
                if (this.focusPath === focusPath) {
                    const directCell = path ? this.selectCellByPath(path) : null;
                    if (directCell) {
                        this.centerCellInView(directCell);
                        this.setStatus(`已定位到节点 ${path || 'root'}`);
                        this.updateMiniMap();
                        return;
                    }
                }
                this.setFocusPath(focusPath, { selectPath: path });
                if (path) {
                    requestAnimationFrame(() => {
                        const cell = this.selectCellByPath(path) || this.findVisibleZoomAnchorElement(path, focusPath);
                        if (cell) this.centerCellInView(cell);
                    });
                }
                this.setStatus(`已定位到节点 ${path || 'root'}`);
            },

            handleThumbnailMouseDown(e) {
                const panel = document.getElementById('thumbnailPanel');
                if (!panel) return;
                if (e.target.closest('.mini-map-close')) {
                    e.stopPropagation();
                    return;
                }
                const resizeHandle = e.target.closest('.mini-map-resize-handle');
                if (resizeHandle) {
                    const rect = panel.getBoundingClientRect();
                    this.thumbnailResizeDrag = {
                        startX: e.clientX,
                        startWidth: this.thumbnailWidth,
                        startOffsetX: rect.left,
                        startOffsetY: rect.top,
                    };
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                const viewport = e.target.closest('#thumbnailViewport');
                if (viewport) {
                    const tableView = document.getElementById('tableView');
                    const overview = panel.querySelector('.mini-map-overview');
                    const rect = viewport.getBoundingClientRect();
                    const overviewRect = overview?.getBoundingClientRect();
                    this.thumbnailViewportDrag = {
                        offsetX: e.clientX - rect.left,
                        offsetY: e.clientY - rect.top,
                        startX: e.clientX,
                        startY: e.clientY,
                        moved: false,
                        dragMetrics: tableView && overview && overviewRect ? {
                            tableView,
                            overview,
                            viewport,
                            rect: overviewRect,
                            viewportWidth: viewport.offsetWidth,
                            viewportHeight: viewport.offsetHeight,
                            maxScrollLeft: Math.max(tableView.scrollWidth - tableView.clientWidth, 0),
                            maxScrollTop: Math.max(tableView.scrollHeight - tableView.clientHeight, 0),
                        } : null,
                    };
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                if (!e.target.closest('.mini-map-header')) return;
                const rect = panel.getBoundingClientRect();
                this.thumbnailDrag = {
                    offsetX: e.clientX - rect.left,
                    offsetY: e.clientY - rect.top,
                    startX: e.clientX,
                    startY: e.clientY,
                    moved: false,
                };
                e.preventDefault();
            },

            handleMiniMapMouseDown(e) {
                const miniMap = document.getElementById('miniMap');
                if (!miniMap) return;
                if (e.target.closest('.mini-map-close')) {
                    e.stopPropagation();
                    return;
                }
                const resizeHandle = e.target.closest('.mini-map-resize-handle');
                if (resizeHandle) {
                    const rect = miniMap.getBoundingClientRect();
                    this.miniMapResizeDrag = {
                        startX: e.clientX,
                        startWidth: this.miniMapWidth,
                        startOffsetX: rect.left,
                        startOffsetY: rect.top,
                    };
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                if (!e.target.closest('.mini-map-header')) return;
                const rect = miniMap.getBoundingClientRect();
                this.miniMapDrag = {
                    offsetX: e.clientX - rect.left,
                    offsetY: e.clientY - rect.top,
                    startX: e.clientX,
                    startY: e.clientY,
                    moved: false,
                };
                e.preventDefault();
            },

            handleThumbnailMouseMove(e) {
                if (this.thumbnailResizeDrag) {
                    const maxWidth = Math.max(220, window.innerWidth - 16);
                    const nextWidth = Math.min(maxWidth, Math.max(220, this.thumbnailResizeDrag.startWidth - (e.clientX - this.thumbnailResizeDrag.startX)));
                    const rightEdge = this.thumbnailResizeDrag.startOffsetX + this.thumbnailResizeDrag.startWidth;
                    this.thumbnailCustomOffset = this.clampFloatingPanelPosition(rightEdge - nextWidth, this.thumbnailResizeDrag.startOffsetY, {
                        offsetWidth: nextWidth,
                        offsetHeight: document.getElementById('thumbnailPanel')?.offsetHeight || 0,
                    });
                    this.thumbnailWidth = nextWidth;
                    this.saveUIState();
                    this.updateThumbnail();
                    return;
                }
                if (this.thumbnailViewportDrag) {
                    if (!this.thumbnailViewportDrag.moved) {
                        const deltaX = Math.abs(e.clientX - this.thumbnailViewportDrag.startX);
                        const deltaY = Math.abs(e.clientY - this.thumbnailViewportDrag.startY);
                        if (deltaX < 3 && deltaY < 3) {
                            return;
                        }
                        this.thumbnailViewportDrag.moved = true;
                    }
                    this.requestThumbnailViewportDrag(e.clientX, e.clientY, {
                        offsetX: this.thumbnailViewportDrag.offsetX,
                        offsetY: this.thumbnailViewportDrag.offsetY,
                        dragMetrics: this.thumbnailViewportDrag.dragMetrics,
                    });
                    return;
                }
                if (!this.thumbnailDrag) return;
                const panel = document.getElementById('thumbnailPanel');
                if (!panel) return;
                if (!this.thumbnailDrag.moved) {
                    const deltaX = Math.abs(e.clientX - this.thumbnailDrag.startX);
                    const deltaY = Math.abs(e.clientY - this.thumbnailDrag.startY);
                    if (deltaX < 3 && deltaY < 3) {
                        return;
                    }
                    this.thumbnailDrag.moved = true;
                }
                this.thumbnailCustomOffset = this.clampFloatingPanelPosition(
                    e.clientX - this.thumbnailDrag.offsetX,
                    e.clientY - this.thumbnailDrag.offsetY,
                    panel
                );
                this.saveUIState();
                this.updateThumbnailPosition();
            },

            handleMiniMapMouseMove(e) {
                if (this.miniMapResizeDrag) {
                    const maxWidth = Math.max(220, window.innerWidth - 16);
                    const nextWidth = Math.min(maxWidth, Math.max(220, this.miniMapResizeDrag.startWidth - (e.clientX - this.miniMapResizeDrag.startX)));
                    const rightEdge = this.miniMapResizeDrag.startOffsetX + this.miniMapResizeDrag.startWidth;
                    this.miniMapCustomOffset = this.clampFloatingPanelPosition(rightEdge - nextWidth, this.miniMapResizeDrag.startOffsetY, {
                        offsetWidth: nextWidth,
                        offsetHeight: document.getElementById('miniMap')?.offsetHeight || 0,
                    });
                    this.miniMapWidth = nextWidth;
                    this.saveUIState();
                    this.updateMiniMap();
                    return;
                }
                if (!this.miniMapDrag) return;
                const miniMap = document.getElementById('miniMap');
                if (!miniMap) return;
                if (!this.miniMapDrag.moved) {
                    const deltaX = Math.abs(e.clientX - this.miniMapDrag.startX);
                    const deltaY = Math.abs(e.clientY - this.miniMapDrag.startY);
                    if (deltaX < 3 && deltaY < 3) {
                        return;
                    }
                    this.miniMapDrag.moved = true;
                }
                this.miniMapCustomOffset = this.clampFloatingPanelPosition(
                    e.clientX - this.miniMapDrag.offsetX,
                    e.clientY - this.miniMapDrag.offsetY,
                    miniMap
                );
                this.saveUIState();
                this.updateMiniMapPosition();
            },

            handleThumbnailMouseUp() {
                if (this.thumbnailViewportPending) {
                    this.flushThumbnailViewportDrag();
                }
                if (this.thumbnailViewportDrag?.moved && this.thumbnailViewportLastTarget?.tableView) {
                    this.thumbnailViewportLastTarget.tableView.scrollTo({
                        left: this.thumbnailViewportLastTarget.scrollLeft,
                        top: this.thumbnailViewportLastTarget.scrollTop,
                        behavior: 'auto'
                    });
                }
                if (this.thumbnailViewportDrag?.moved) {
                    this.thumbnailSuppressClick = true;
                }
                if (this.thumbnailViewportFrame) {
                    cancelAnimationFrame(this.thumbnailViewportFrame);
                    this.thumbnailViewportFrame = 0;
                }
                this.thumbnailViewportPending = null;
                this.thumbnailViewportLastTarget = null;
                this.thumbnailResizeDrag = null;
                this.thumbnailViewportDrag = null;
                this.thumbnailDrag = null;
            },

            handleMiniMapMouseUp() {
                this.miniMapResizeDrag = null;
                this.miniMapDrag = null;
            },

            getNodePathFromPoint(clientX, clientY) {
                const candidates = [];
                const seen = new Set();
                const addCell = (cell) => {
                    const path = cell?.dataset?.path || '';
                    if (!path || seen.has(path)) return;
                    const rect = cell.getBoundingClientRect();
                    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
                    seen.add(path);
                    candidates.push({ path, area: Math.max(rect.width * rect.height, 1) });
                };

                document.elementsFromPoint(clientX, clientY)
                    .forEach((element) => addCell(element?.closest?.('td[data-path]')));
                document.querySelectorAll('td[data-path]').forEach(addCell);

                candidates.sort((a, b) => b.path.length - a.path.length || a.area - b.area);
                return candidates[0]?.path || null;
            },

            getParentPath(path) {
                if (!path) return '';
                const segments = this.getPathSegments(path);
                if (segments.length <= 1) return '';
                return segments[segments.length - 2].path;
            },

            getSemanticZoomTargetPath(path) {
                let candidatePath = path;
                while (candidatePath) {
                    const value = this.getValueAtPath(this.data, candidatePath);
                    if (value && typeof value === 'object') {
                        return candidatePath;
                    }
                    candidatePath = this.getParentPath(candidatePath);
                }
                return null;
            },

            getSemanticZoomOutTargetPath(pointerPath) {
                if (!this.focusPath) return '';
                const pointerTarget = this.getSemanticZoomTargetPath(pointerPath || '');
                if (pointerTarget && this.isPathAtOrInside(pointerTarget, this.focusPath) && pointerTarget !== this.focusPath) {
                    const parentPath = this.getParentPath(pointerTarget);
                    if (parentPath && parentPath !== pointerTarget) return parentPath;
                }
                return this.getParentPath(this.focusPath);
            },

            isPathAtOrInside(path, basePath) {
                if (!basePath) return true;
                return path === basePath || path.startsWith(`${basePath}.`) || path.startsWith(`${basePath}[`);
            },

            getTopLevelTableForPath(path) {
                const selector = `table.json-table[data-path="${CSS.escape(path || '')}"]`;
                return document.querySelector(`#editorCanvas > .json-table-wrapper > .json-table-layout ${selector}`)
                    || document.querySelector(`#editorCanvas ${selector}`)
                    || document.querySelector('#editorCanvas table.json-table');
            },

            findVisibleZoomAnchorElement(anchorPath, targetPath) {
                if (anchorPath) {
                    const exactCell = this.findCellByPath(anchorPath);
                    if (exactCell) return exactCell;

                    const descendant = Array.from(document.querySelectorAll('td[data-path]'))
                        .filter((cell) => this.isPathAtOrInside(cell.dataset.path || '', anchorPath))
                        .sort((a, b) => (a.dataset.path || '').length - (b.dataset.path || '').length)[0];
                    if (descendant) return descendant;

                    let parentPath = this.getParentPath(anchorPath);
                    while (parentPath) {
                        const parentCell = this.findCellByPath(parentPath);
                        if (parentCell) return parentCell;
                        parentPath = this.getParentPath(parentPath);
                    }
                }

                const table = this.getTopLevelTableForPath(targetPath || '');
                return table?.querySelector('td[data-path]') || table || null;
            },

            captureSemanticZoomAnchor(clientX, clientY, pointerPath, targetPath) {
                const tableView = document.getElementById('tableView');
                const pointedPath = this.getNodePathFromPoint(clientX, clientY) || pointerPath || '';
                const pointedCell = this.findCellByPath(pointedPath) || this.getSelectableCellFromTarget(document.elementFromPoint(clientX, clientY)) || this.findCellByPath(pointerPath || '');
                const element = pointedCell || this.getTopLevelTableForPath(this.focusPath || '') || tableView;
                const rect = element?.getBoundingClientRect?.();
                const safeWidth = Math.max(rect?.width || 1, 1);
                const safeHeight = Math.max(rect?.height || 1, 1);
                return {
                    path: pointedCell?.dataset?.path || pointedPath || pointerPath || targetPath || '',
                    targetPath: targetPath || '',
                    clientX,
                    clientY,
                    ratioX: Math.min(1, Math.max(0, (clientX - (rect?.left || 0)) / safeWidth)),
                    ratioY: Math.min(1, Math.max(0, (clientY - (rect?.top || 0)) / safeHeight)),
                };
            },

            restoreSemanticZoomAnchor(anchor) {
                const tableView = document.getElementById('tableView');
                if (!tableView || !anchor) return;
                this.applyCanvasVirtualPadding();
                for (let attempt = 0; attempt < 3; attempt += 1) {
                    const element = this.findVisibleZoomAnchorElement(anchor.path, anchor.targetPath);
                    const rect = element?.getBoundingClientRect?.();
                    if (!rect) return;
                    const anchorX = rect.left + rect.width * anchor.ratioX;
                    const anchorY = rect.top + rect.height * anchor.ratioY;
                    const desiredLeft = tableView.scrollLeft + anchorX - anchor.clientX;
                    const desiredTop = tableView.scrollTop + anchorY - anchor.clientY;
                    const maxLeft = Math.max(tableView.scrollWidth - tableView.clientWidth, 0);
                    const maxTop = Math.max(tableView.scrollHeight - tableView.clientHeight, 0);
                    let grew = false;
                    if (desiredLeft < 0) grew = this.growCanvasVirtualPadding('left', (this.canvasVirtualPadding.left || 0) + Math.abs(desiredLeft) + 24) || grew;
                    if (desiredTop < 0) grew = this.growCanvasVirtualPadding('top', (this.canvasVirtualPadding.top || 0) + Math.abs(desiredTop) + 24) || grew;
                    if (desiredLeft > maxLeft) grew = this.growCanvasVirtualPadding('right', (this.canvasVirtualPadding.right || 0) + desiredLeft - maxLeft + 24) || grew;
                    if (desiredTop > maxTop) grew = this.growCanvasVirtualPadding('bottom', (this.canvasVirtualPadding.bottom || 0) + desiredTop - maxTop + 24) || grew;
                    if (grew) continue;
                    tableView.scrollLeft = Math.min(Math.max(0, desiredLeft), maxLeft);
                    tableView.scrollTop = Math.min(Math.max(0, desiredTop), maxTop);
                    break;
                }
                this.updateThumbnailViewport();
                this.updateThumbnailPosition();
                this.updateMiniMapPosition();
            },

            setFocusPathAroundPointer(targetPath, pointerPath, clientX, clientY) {
                const anchor = this.captureSemanticZoomAnchor(clientX, clientY, pointerPath, targetPath);
                const targetSelectPath = pointerPath && this.isPathAtOrInside(pointerPath, targetPath || '') ? pointerPath : targetPath;
                this.editorScale = 1;
                this.applyEditorScale();
                this.setFocusPath(targetPath, { selectPath: targetSelectPath });
                requestAnimationFrame(() => {
                    this.restoreSemanticZoomAnchor(anchor);
                });
            },

            handleEditorWheel(e) {
                if (!e.ctrlKey) return;
                e.preventDefault();
                const previousScale = this.editorScale;
                const nextScale = this.editorScale + (e.deltaY < 0 ? 0.1 : -0.1);
                this.editorScale = Math.min(2, Math.max(0.5, Number(nextScale.toFixed(2))));
                const pointerPath = this.getNodePathFromPoint(e.clientX, e.clientY) || this.hoveredCell?.dataset?.path || null;
                if (e.deltaY < 0 && previousScale < 1.35 && this.editorScale >= 1.35 && pointerPath) {
                    const targetPath = this.getSemanticZoomTargetPath(pointerPath);
                    if (targetPath) {
                        this.setFocusPathAroundPointer(targetPath, pointerPath, e.clientX, e.clientY);
                        return;
                    }
                }
                if (e.deltaY > 0 && previousScale > 0.75 && this.editorScale <= 0.75 && this.focusPath) {
                    const parentPath = this.getSemanticZoomOutTargetPath(pointerPath);
                    this.setFocusPathAroundPointer(parentPath, pointerPath || this.focusPath, e.clientX, e.clientY);
                    return;
                }
                this.applyEditorScaleAroundPoint(previousScale, e.clientX, e.clientY);
                this.setStatus(`编辑区缩放 ${Math.round(this.editorScale * 100)}%`);
            },

            getColumnStateKey(path, key) {
                const fullPath = key !== undefined
                    ? (path ? `${path}.${key}` : key)
                    : path;
                return fullPath.replace(/\[\d+\](?=(\.[^.]+)$)/, '').replace(/^\./, '');
            },

            getColumnWidthKey(path, key) {
                return this.getColumnStateKey(path, key);
            },

            rememberColumnWidth(path, key, width) {
                if (!key || !Number.isFinite(width) || width <= 0) return;
                this.columnWidthCache[this.getColumnWidthKey(path, key)] = Math.ceil(width);
            },

            getRememberedColumnWidth(path, key) {
                return this.columnWidthCache[this.getColumnWidthKey(path, key)] || null;
            },

            lockHeaderWidth(th) {
                if (!th) return 0;
                const width = Math.ceil(th.getBoundingClientRect().width || th.offsetWidth || 0);
                if (width > 0) {
                    th.style.width = `${width}px`;
                    th.style.minWidth = `${width}px`;
                }
                return width;
            },

            // ===== Rendering =====
            render() {
                const container = document.getElementById('editorCanvas');
                const empty = document.getElementById('emptyState');
                const focusValue = this.getFocusedData();
                this.selectedCell = null;
                this.editingCell = null;
                this.hoveredCell = null;
                this.selectionAnchorCell = null;
                this.selectedRangeCells = [];
                this.isMouseSelecting = false;
                this.mouseSelectionMoved = false;
                this.suppressNextClickSelection = false;
                this.isFillDragging = false;
                this.fillSourceMatrix = null;
                this.fillSourceRect = null;
                this.editingHeader = null;
                this.contextMenuState = null;

                if (this.data === null || this.data === undefined || focusValue === undefined) {
                    container.innerHTML = '';
                    if (empty) {
                        empty.style.display = 'flex';
                    }
                    this.updateThumbnail();
                    this.updateMiniMap();
                    return;
                }

                if (empty) empty.style.display = 'none';
                container.innerHTML = '';

                const wrapper = document.createElement('div');
                wrapper.className = 'json-table-wrapper';

                let tableNode;
                if (Array.isArray(focusValue) && this.isMatrixArrayNode(focusValue)) {
                    tableNode = this.createMatrixTable(focusValue, this.focusPath || '');
                } else {
                    tableNode = this.createTable(focusValue, this.focusPath || '');
                }
                wrapper.appendChild(tableNode);
                container.appendChild(wrapper);

                if (this.pendingHeaderEdit) {
                    const { path: pendingPath, key: pendingKey } = this.pendingHeaderEdit;
                    this.pendingHeaderEdit = null;
                    requestAnimationFrame(() => {
                        const tryFind = () => {
                            const header = this.findHeaderByPath(pendingPath, pendingKey);
                            if (header) {
                                this.beginHeaderEdit(header, { selectAll: true });
                            } else {
                                // Retry once after a short delay to handle nested rendering timing
                                setTimeout(() => {
                                    const header2 = this.findHeaderByPath(pendingPath, pendingKey);
                                    if (header2) this.beginHeaderEdit(header2, { selectAll: true });
                                    else console.log('WYSDEBUG pendingHeaderEdit: header not found', { pendingPath, pendingKey });
                                }, 40);
                            }
                        };
                        tryFind();
                    });
                }

                if (this.pendingCellSelection) {
                    const pendingPath = this.pendingCellSelection;
                    this.pendingCellSelection = null;
                    requestAnimationFrame(() => {
                        this.selectCellByPath(pendingPath);
                    });
                }

                this.updateBreadcrumb();
                this.updateThumbnail();
                this.updateMiniMap();
                this.applyEditorScale();
            },

            createTable(data, path) {
                const wrapper = document.createElement('div');
                wrapper.className = 'json-table-layout';
                wrapper.style.marginBottom = '8px';

                const tableContainer = document.createElement('div');
                tableContainer.style.display = 'inline-block';

                // Determine if data is array or object
                const isArray = Array.isArray(data);
                const rows = isArray ? data : [data];
                const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
                const isPureObjectArray = isArray && rows.length > 0 && rows.every((row) => isPlainObject(row));

                // Mixed arrays must render row-by-row so each element can recurse independently.
                if (isArray && !isPureObjectArray) {
                    return this.createSimpleView(data, path, true);
                }

                // Collect all keys across all rows
                const allKeys = [];
                const seenKeys = new Set();
                for (const row of rows) {
                    if (isPlainObject(row)) {
                        for (const key of Object.keys(row)) {
                            if (!seenKeys.has(key)) {
                                seenKeys.add(key);
                                allKeys.push(key);
                            }
                        }
                    }
                }

                // If no keys (empty array / primitive / empty object), render simple view.
                if (allKeys.length === 0) {
                    return this.createSimpleView(data, path, isArray);
                }

                const table = document.createElement('table');
                table.className = 'json-table';
                table.setAttribute('data-path', path);
                table.setAttribute('data-is-array', isArray);

                // Header
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');

                // Row number column (show for arrays and objects — objects get a single row index)
                const thRowNum = document.createElement('th');
                thRowNum.className = 'row-num-header';
                const typeBadge = document.createElement('span');
                typeBadge.className = 'table-type-badge';
                typeBadge.textContent = isArray ? '[]' : '{}';
                typeBadge.title = isArray ? '当前表格节点类型：Array' : '当前表格节点类型：Object';
                thRowNum.appendChild(typeBadge);
                headerRow.appendChild(thRowNum);

                for (const key of allKeys) {
                    const th = document.createElement('th');
                    th.setAttribute('data-header-path', path);
                    th.setAttribute('data-header-key', key);
                    th.setAttribute('data-header-editable', 'true');
                    th.title = '双击修改列标题';
                    const rememberedWidth = this.getRememberedColumnWidth(path, key);
                    if (rememberedWidth) {
                        th.style.width = `${rememberedWidth}px`;
                        th.style.minWidth = `${rememberedWidth}px`;
                    }

                    // Check if column has any nested values
                    const sample = rows.find(r => r && typeof r === 'object' && !Array.isArray(r) && r[key] !== undefined);
                    const sampleVal = sample ? sample[key] : undefined;
                    const isNested = sampleVal !== null && sampleVal !== undefined && typeof sampleVal === 'object';
                    const colStateKey = this.getColumnStateKey(path, key);

                    // Add nested toggle to column header
                    if (isNested) {
                        const toggle = document.createElement('span');
                        toggle.className = 'nested-toggle';
                        const isArray = Array.isArray(sampleVal);
                        const targetPath = path ? `${path}.${key}` : key;
                        const canExpandNested = this.canExpandNestedPath(targetPath);
                        const isExpanded = this.columnStates[colStateKey] !== false && canExpandNested;
                        if (isExpanded) toggle.classList.add('expanded');
                        toggle.innerHTML = `<span class="arrow">▶</span><span class="summary">${isArray ? `[${sampleVal.length}]` : `{${Object.keys(sampleVal).length}}`}</span>`;
                        toggle.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.columnStates[colStateKey] = this.columnStates[colStateKey] === false;
                            this.render();
                        });
                        th.appendChild(toggle);
                        if (!isExpanded) {
                            const hintBtn = this.createNestedHintButton({
                                title: canExpandNested ? '当前列还有未展开的下级节点，点击展开' : '当前列因层级限制未完全显示，点击显示下一层',
                                text: canExpandNested ? '+' : '层+',
                                className: 'nested-hint-btn',
                                onClick: () => this.revealNestedPath(path || '', key),
                            });
                            th.appendChild(hintBtn);
                        }
                    }

                    const label = document.createElement('span');
                    label.className = 'header-label';
                    label.textContent = key;
                    th.appendChild(label);

                    // Type tag
                    if (sampleVal !== null && sampleVal !== undefined && !(typeof sampleVal === 'object')) {
                        const tag = document.createElement('span');
                        tag.className = 'type-tag';
                        tag.textContent = typeof sampleVal;
                        th.appendChild(tag);
                    }

                    const dragHandle = document.createElement('span');
                    dragHandle.className = 'drag-handle';
                    dragHandle.textContent = '⋮⋮';
                    dragHandle.title = '拖拽调整字段顺序';
                    dragHandle.draggable = true;
                    dragHandle.addEventListener('click', (e) => e.stopPropagation());
                    dragHandle.addEventListener('mousedown', (e) => e.stopPropagation());
                    dragHandle.addEventListener('dragstart', (e) => {
                        e.stopPropagation();
                        this.beginStructureDrag({ type: 'column', path: path || '', key }, th, e);
                    });
                    dragHandle.addEventListener('dragend', () => this.finishStructureDrag());
                    th.appendChild(dragHandle);
                    th.addEventListener('dragover', (e) => {
                        const dragState = this.dragState;
                        if (!dragState || dragState.type !== 'column' || dragState.path !== (path || '') || dragState.key === key) return;
                        e.preventDefault();
                        const rect = th.getBoundingClientRect();
                        const position = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
                        this.dragState.position = position;
                        this.dragState.targetKey = key;
                        this.updateDragTarget(th, position);
                    });
                    th.addEventListener('drop', (e) => {
                        const dragState = this.dragState;
                        if (!dragState || dragState.type !== 'column' || dragState.path !== (path || '') || dragState.key === key) return;
                        e.preventDefault();
                        const position = dragState.position || 'after';
                        const sourceKey = dragState.key;
                        this.finishStructureDrag();
                        this.moveColumn(path || '', sourceKey, key, position);
                    });

                    // Resize handle
                    const resizer = document.createElement('div');
                    resizer.className = 'col-resizer';
                    th.appendChild(resizer);
                    resizer.addEventListener('mousedown', (e) => {
                        e.preventDefault(); e.stopPropagation();
                        const startX = e.clientX, startW = th.offsetWidth;
                        const move = (ev) => { const w = Math.max(40, startW + ev.clientX - startX); th.style.width = w + 'px'; th.style.minWidth = w + 'px'; };
                        const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
                        document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
                        document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
                    });

                    headerRow.appendChild(th);
                }

                thead.appendChild(headerRow);
                table.appendChild(thead);

                const paginationState = isArray ? this.getPaginationState(path || '', rows.length) : null;
                const visibleRows = paginationState?.enabled ? rows.slice(paginationState.startIndex, paginationState.endIndex) : rows;
                const startRowIndex = paginationState?.enabled ? paginationState.startIndex : 0;

                // Body
                const tbody = document.createElement('tbody');

                for (let visibleIndex = 0; visibleIndex < visibleRows.length; visibleIndex++) {
                    const actualIndex = startRowIndex + visibleIndex;
                    const row = visibleRows[visibleIndex];
                    const rowPath = isArray ? `${path}[${actualIndex}]` : path;
                    const tr = document.createElement('tr');
                    tr.setAttribute('data-path', rowPath);

                    // Row number (Excel-style) — show for arrays and objects
                    const td = document.createElement('td');
                    td.className = 'row-num';
                    td.textContent = actualIndex + 1;
                    td.title = isArray ? '点击选中当前整行，拖拽调整顺序，右键打开行菜单' : '点击选中当前整行，右键打开对象菜单';
                    td.setAttribute('data-row-index', actualIndex);
                    td.setAttribute('data-array-path', path);
                    if (isArray && !paginationState?.enabled) {
                        td.classList.add('is-row-draggable');
                        td.draggable = true;
                        td.addEventListener('dragstart', (e) => {
                            this.beginStructureDrag({ type: 'row', arrayPath: path || '', rowIndex: actualIndex }, td, e);
                        });
                        td.addEventListener('dragend', () => this.finishStructureDrag());
                        td.addEventListener('dragover', (e) => {
                            const dragState = this.dragState;
                            if (!dragState || dragState.type !== 'row' || dragState.arrayPath !== (path || '') || dragState.rowIndex === actualIndex) return;
                            e.preventDefault();
                            const rect = td.getBoundingClientRect();
                            const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                            this.dragState.position = position;
                            this.dragState.targetRowIndex = actualIndex;
                            this.updateDragTarget(td, position);
                        });
                        td.addEventListener('drop', (e) => {
                            const dragState = this.dragState;
                            if (!dragState || dragState.type !== 'row' || dragState.arrayPath !== (path || '') || dragState.rowIndex === actualIndex) return;
                            e.preventDefault();
                            const position = dragState.position || 'after';
                            const insertIndex = position === 'before' ? actualIndex : actualIndex + 1;
                            const targetIndex = dragState.rowIndex < insertIndex ? insertIndex - 1 : insertIndex;
                            const sourceIndex = dragState.rowIndex;
                            this.finishStructureDrag();
                            this.moveRow(path || '', sourceIndex, targetIndex);
                        });
                    }
                    td.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectRowByNumberCell(td, e);
                    });
                    td.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showContextMenu(e.clientX, e.clientY, {
                            type: 'row',
                            path: rowPath,
                            arrayPath: path,
                            rowIndex: actualIndex,
                            isArrayRow: isArray,
                            value: row,
                        });
                    });
                    tr.appendChild(td);

                    for (const key of allKeys) {
                        const td = document.createElement('td');
                        td.setAttribute('data-col', key);
                        const val = row && typeof row === 'object' && !Array.isArray(row) ? row[key] : undefined;
                        const cellPath = rowPath ? `${rowPath}.${key}` : key;

                        this.renderCell(td, val, cellPath, key);
                        tr.appendChild(td);
                    }

                    tbody.appendChild(tr);
                }

                table.appendChild(tbody);
                tableContainer.appendChild(table);
                const paginationBar = isArray ? this.createPaginationBar(path || '', paginationState) : null;
                if (paginationBar) tableContainer.appendChild(paginationBar);

                if (isArray) {
                    // Insert column-level add button into the header so it's clearly a column action
                    try {
                        // Insert a table-wide action bar (spans the whole table region) instead
                        const actionBar = document.createElement('div');
                        actionBar.className = 'table-action-bar';
                        const addColumnBtn = document.createElement('button');
                        addColumnBtn.className = 'add-column-btn';
                        addColumnBtn.textContent = '+ 添加列';
                        addColumnBtn.title = '为当前数组对象添加列';
                        addColumnBtn.addEventListener('click', (e) => { e.stopPropagation(); try { if (this.editingHeader) this.finishHeaderEdit(true); } catch (err) {} this.addColumn(path); });
                        actionBar.appendChild(addColumnBtn);
                        // Insert the action bar before the table container so it visually spans the table area
                        wrapper.insertBefore(actionBar, tableContainer);
                    } catch (err) { console.log('WYSDEBUG add-column action-bar injection failed', err && err.message); }

                    const addBtn = document.createElement('button');
                    addBtn.className = 'add-row-btn';
                    addBtn.textContent = '+ 添加行';
                    addBtn.addEventListener('click', () => this.addRow(path));
                    tableContainer.appendChild(addBtn);
                    wrapper.appendChild(tableContainer);
                    return wrapper;
                } else {
                    const sideActions = document.createElement('div');
                    sideActions.className = 'table-side-actions';
                    const addColumnBtn = document.createElement('button');
                    addColumnBtn.className = 'add-column-btn';
                    addColumnBtn.textContent = '+ 添加列';
                    addColumnBtn.title = '为当前对象添加列';
                    addColumnBtn.addEventListener('click', () => this.addColumn(path));
                    sideActions.appendChild(addColumnBtn);
                    wrapper.appendChild(tableContainer);
                    wrapper.appendChild(sideActions);
                    return wrapper;
                }

                wrapper.appendChild(tableContainer);

                return wrapper;
            },

            createMatrixTable(data, path) {
                return this.createSimpleView(data, path, true);
            },

            createSimpleView(data, path, isArray) {
                // If this is a matrix-like array, render it as a true grid here
                if (isArray && this.isMatrixArrayNode(data)) {
                    const wrapper = document.createElement('div');
                    wrapper.style.display = 'inline-block';

                    const table = document.createElement('table');
                    table.className = 'json-table';
                    table.setAttribute('data-path', path || '');
                    table.setAttribute('data-is-array', 'true');

                    // Header
                    const thead = document.createElement('thead');
                    const headerRow = document.createElement('tr');
                    const thRowNum = document.createElement('th');
                    thRowNum.className = 'row-num-header';
                    const typeBadge = document.createElement('span');
                    typeBadge.className = 'table-type-badge';
                    typeBadge.textContent = '[][]';
                    typeBadge.title = '当前表格节点类型：Matrix Array';
                    thRowNum.appendChild(typeBadge);
                    headerRow.appendChild(thRowNum);

                    const colCount = data[0]?.length || 0;
                    for (let c = 0; c < colCount; c++) {
                        const th = document.createElement('th');
                        th.setAttribute('data-header-path', path);
                        th.setAttribute('data-header-key', String(c));
                        const label = document.createElement('span');
                        label.className = 'header-label';
                        label.textContent = String(c + 1);
                        th.appendChild(label);
                        headerRow.appendChild(th);
                    }
                    thead.appendChild(headerRow);
                    table.appendChild(thead);

                    const tbody = document.createElement('tbody');
                    const paginationState = this.getPaginationState(path || '', data.length);
                    const visibleRows = paginationState.enabled ? data.slice(paginationState.startIndex, paginationState.endIndex) : data;
                    const startRowIndex = paginationState.enabled ? paginationState.startIndex : 0;

                    for (let visibleIndex = 0; visibleIndex < visibleRows.length; visibleIndex++) {
                        const actualIndex = startRowIndex + visibleIndex;
                        const rowArr = visibleRows[visibleIndex];
                        const rowPath = `${path}[${actualIndex}]`;
                        const tr = document.createElement('tr');
                        tr.setAttribute('data-path', rowPath);

                        const tdRowNum = document.createElement('td');
                        tdRowNum.className = 'row-num';
                        tdRowNum.textContent = actualIndex + 1;
                        tdRowNum.title = '点击选中当前整行，拖拽调整顺序，右键打开行菜单';
                        tdRowNum.setAttribute('data-row-index', actualIndex);
                        tdRowNum.setAttribute('data-array-path', path);
                        if (!paginationState.enabled) {
                            tdRowNum.classList.add('is-row-draggable');
                            tdRowNum.draggable = true;
                            tdRowNum.addEventListener('dragstart', (e) => {
                                this.beginStructureDrag({ type: 'row', arrayPath: path || '', rowIndex: actualIndex }, tdRowNum, e);
                            });
                            tdRowNum.addEventListener('dragend', () => this.finishStructureDrag());
                            tdRowNum.addEventListener('dragover', (e) => {
                                const dragState = this.dragState;
                                if (!dragState || dragState.type !== 'row' || dragState.arrayPath !== (path || '') || dragState.rowIndex === actualIndex) return;
                                e.preventDefault();
                                const rect = tdRowNum.getBoundingClientRect();
                                const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                                this.dragState.position = position;
                                this.dragState.targetRowIndex = actualIndex;
                                this.updateDragTarget(tdRowNum, position);
                            });
                            tdRowNum.addEventListener('drop', (e) => {
                                const dragState = this.dragState;
                                if (!dragState || dragState.type !== 'row' || dragState.arrayPath !== (path || '') || dragState.rowIndex === actualIndex) return;
                                e.preventDefault();
                                const position = dragState.position || 'after';
                                const insertIndex = position === 'before' ? actualIndex : actualIndex + 1;
                                const targetIndex = dragState.rowIndex < insertIndex ? insertIndex - 1 : insertIndex;
                                const sourceIndex = dragState.rowIndex;
                                this.finishStructureDrag();
                                this.moveRow(path || '', sourceIndex, targetIndex);
                            });
                        }
                        tdRowNum.addEventListener('click', (e) => { e.stopPropagation(); this.selectRowByNumberCell(tdRowNum, e); });
                        tdRowNum.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); this.showContextMenu(e.clientX, e.clientY, { type: 'row', arrayPath: path, rowIndex: actualIndex, isArrayRow: true, path: rowPath, value: rowArr, }); });
                        tr.appendChild(tdRowNum);

                        for (let c = 0; c < colCount; c++) {
                            const tdCell = document.createElement('td');
                            const cellPath = `${rowPath}[${c}]`;
                            const cellVal = Array.isArray(rowArr) ? rowArr[c] : undefined;
                            this.renderCell(tdCell, cellVal, cellPath, String(c));
                            tr.appendChild(tdCell);
                        }

                        tbody.appendChild(tr);
                    }

                    table.appendChild(tbody);
                    wrapper.appendChild(table);
                    const paginationBar = this.createPaginationBar(path || '', paginationState);
                    if (paginationBar) wrapper.appendChild(paginationBar);

                    const sideActions = document.createElement('div');
                    sideActions.className = 'table-side-actions';
                    // If this array contains only primitive single values, show a "+ 添加列" button
                    // as a column-level action in the table header so it's clearly a column operation.
                    try {
                        const isSingleValueArray = Array.isArray(data) && data.length > 0 && data.every((it) => it === null || typeof it !== 'object');
                        if (isSingleValueArray) {
                            try {
                                const actionBar = document.createElement('div');
                                actionBar.className = 'table-action-bar';
                                const addColumnBtn = document.createElement('button');
                                addColumnBtn.className = 'add-column-btn';
                                addColumnBtn.textContent = '+ 添加列';
                                addColumnBtn.title = '将单值数组转换为对象（原值存入默认列）';
                                addColumnBtn.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    try { if (this.editingHeader) this.finishHeaderEdit(true); } catch (err) { }
                                    try { if (this.editingCell) this.finishEdit(this.editingCell); } catch (err) { }
                                    try { if (window.__WYS_DOM_LOGS) window.__WYS_DOM_LOGS.push({ t: Date.now(), text: `clicked add-column-btn ${path}` }); } catch (err) {}
                                    this.convertSingleValueArrayToObjects(path);
                                });
                                actionBar.appendChild(addColumnBtn);
                                // Insert the action bar above the table so it spans the whole nested region
                                wrapper.insertBefore(actionBar, table);
                            } catch (err) { console.log('WYSDEBUG createSimpleView (matrix) add-column injection failed', err && err.message); }
                        }
                    } catch (err) { console.log('WYSDEBUG createSimpleView addColumn error', err && err.message); }

                    const addBtn = document.createElement('button');
                    addBtn.className = 'add-row-btn';
                    addBtn.textContent = '+ 添加项';
                    addBtn.addEventListener('click', () => this.addRow(path));

                    wrapper.appendChild(addBtn);
                    if (sideActions.childNodes.length) wrapper.appendChild(sideActions);

                    return wrapper;
                }

                const wrapper = document.createElement('div');
                wrapper.style.display = 'inline-block';
                const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

                const table = document.createElement('table');
                table.className = 'json-table';
                table.setAttribute('data-path', path || '');
                table.setAttribute('data-is-array', isArray ? 'true' : 'false');

                if (isArray) {
                    const paginationState = this.getPaginationState(path || '', data.length);
                    const visibleRows = paginationState.enabled ? data.slice(paginationState.startIndex, paginationState.endIndex) : data;
                    const startRowIndex = paginationState.enabled ? paginationState.startIndex : 0;
                    // Array rendered row-by-row. Supports primitives, objects, arrays, and mixed content.
                    const thead = document.createElement('thead');
                    const thRow = document.createElement('tr');
                    const thIdx = document.createElement('th');
                    thIdx.className = 'row-num-header';
                    const typeBadge = document.createElement('span');
                    typeBadge.className = 'table-type-badge';
                    typeBadge.textContent = '[]';
                    typeBadge.title = '当前表格节点类型：Array';
                    thIdx.appendChild(typeBadge);
                    thIdx.style.width = '48px';
                    thIdx.style.textAlign = 'center';
                    thRow.appendChild(thIdx);
                    const thVal = document.createElement('th');
                    thVal.textContent = '值';
                    thRow.appendChild(thVal);
                    thead.appendChild(thRow);
                    table.appendChild(thead);

                    const tbody = document.createElement('tbody');
                    for (let visibleIndex = 0; visibleIndex < visibleRows.length; visibleIndex++) {
                        const actualIndex = startRowIndex + visibleIndex;
                        const tr = document.createElement('tr');
                        const tdIdx = document.createElement('td');
                        tdIdx.className = 'row-num';
                        tdIdx.style.textAlign = 'center';
                        tdIdx.style.color = 'var(--text-muted)';
                        tdIdx.style.fontSize = '11px';
                        tdIdx.textContent = actualIndex + 1;
                        tdIdx.title = '点击选中当前整行，拖拽调整顺序，右键打开行菜单';
                        tdIdx.setAttribute('data-row-index', actualIndex);
                        tdIdx.setAttribute('data-array-path', path);
                        if (!paginationState.enabled) {
                            tdIdx.classList.add('is-row-draggable');
                            tdIdx.draggable = true;
                            tdIdx.addEventListener('dragstart', (e) => {
                                this.beginStructureDrag({ type: 'row', arrayPath: path || '', rowIndex: actualIndex }, tdIdx, e);
                            });
                            tdIdx.addEventListener('dragend', () => this.finishStructureDrag());
                            tdIdx.addEventListener('dragover', (e) => {
                                const dragState = this.dragState;
                                if (!dragState || dragState.type !== 'row' || dragState.arrayPath !== (path || '') || dragState.rowIndex === actualIndex) return;
                                e.preventDefault();
                                const rect = tdIdx.getBoundingClientRect();
                                const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                                this.dragState.position = position;
                                this.dragState.targetRowIndex = actualIndex;
                                this.updateDragTarget(tdIdx, position);
                            });
                            tdIdx.addEventListener('drop', (e) => {
                                const dragState = this.dragState;
                                if (!dragState || dragState.type !== 'row' || dragState.arrayPath !== (path || '') || dragState.rowIndex === actualIndex) return;
                                e.preventDefault();
                                const position = dragState.position || 'after';
                                const insertIndex = position === 'before' ? actualIndex : actualIndex + 1;
                                const targetIndex = dragState.rowIndex < insertIndex ? insertIndex - 1 : insertIndex;
                                const sourceIndex = dragState.rowIndex;
                                this.finishStructureDrag();
                                this.moveRow(path || '', sourceIndex, targetIndex);
                            });
                        }
                        tdIdx.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.selectRowByNumberCell(tdIdx, e);
                        });
                        tdIdx.addEventListener('contextmenu', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            this.showContextMenu(e.clientX, e.clientY, {
                                type: 'row',
                                arrayPath: path,
                                rowIndex: actualIndex,
                                isArrayRow: true,
                                path: `${path}[${actualIndex}]`,
                                value: visibleRows[visibleIndex],
                            });
                        });
                        tr.appendChild(tdIdx);

                        const tdVal = document.createElement('td');
                        this.renderCell(tdVal, visibleRows[visibleIndex], `${path}[${actualIndex}]`, `[${actualIndex}]`);
                        tr.appendChild(tdVal);
                        tbody.appendChild(tr);
                    }
                    table.appendChild(tbody);
                    wrapper.appendChild(table);
                    const paginationBar = this.createPaginationBar(path || '', paginationState);
                    if (paginationBar) wrapper.appendChild(paginationBar);

                    const addBtn = document.createElement('button');
                    addBtn.className = 'add-row-btn';
                    addBtn.textContent = '+ 添加项';
                    addBtn.addEventListener('click', () => this.addRow(path));
                    // If this is a single-value array (primitives only), show a "+ 添加列" button
                    // as a column-level action in the table header (not as a row-side action).
                    try {
                        if (Array.isArray(data) && data.length > 0 && data.every(it => it === null || typeof it !== 'object')) {
                            try {
                                const theadRow = table.querySelector('thead tr');
                                if (theadRow) {
                                    // replace header injection with table-wide action bar
                                    const actionBar = document.createElement('div');
                                    actionBar.className = 'table-action-bar';
                                    const abBtn = document.createElement('button');
                                    abBtn.className = 'add-column-btn';
                                    abBtn.textContent = '+ 添加列';
                                    abBtn.title = '将单值数组转换为对象（原值存入默认列）';
                                    abBtn.addEventListener('click', (e) => {
                                        e.stopPropagation();
                                        try { if (this.editingHeader) this.finishHeaderEdit(true); } catch (err) { }
                                        try { if (this.editingCell) this.finishEdit(this.editingCell); } catch (err) { }
                                        try { if (window.__WYS_DOM_LOGS) window.__WYS_DOM_LOGS.push({ t: Date.now(), text: `clicked add-column-btn ${path}` }); } catch (err) {}
                                        this.convertSingleValueArrayToObjects(path);
                                    });
                                    actionBar.appendChild(abBtn);
                                    wrapper.insertBefore(actionBar, table);
                                }
                            } catch (innerErr) { /* ignore inner injection errors */ }
                        }
                    } catch (err) { console.log('WYSDEBUG add-column-btn injection error', err && err.message); }
                    wrapper.appendChild(addBtn);
                } else if (isPlainObject(data) && Object.keys(data).length === 0) {
                    const tbody = document.createElement('tbody');
                    const tr = document.createElement('tr');
                    const td = document.createElement('td');
                    td.className = 'cell-nested';
                    td.setAttribute('data-path', path || '');
                    td.setAttribute('data-editable', 'false');
                    td.style.minWidth = '140px';

                    const placeholder = document.createElement('div');
                    placeholder.className = 'nested-preview';

                    const badge = document.createElement('span');
                    badge.className = 'nested-badge';
                    badge.textContent = '{}';
                    placeholder.appendChild(badge);

                    const summary = document.createElement('span');
                    summary.className = 'nested-summary-text';
                    summary.textContent = '空对象';
                    placeholder.appendChild(summary);

                    td.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showContextMenu(e.clientX, e.clientY, {
                            type: 'cell',
                            path,
                            value: data,
                        });
                    });

                    td.appendChild(placeholder);
                    tr.appendChild(td);
                    tbody.appendChild(tr);
                    table.appendChild(tbody);
                    wrapper.appendChild(table);

                    const sideActions = document.createElement('div');
                    sideActions.className = 'table-side-actions';
                    const addColumnBtn = document.createElement('button');
                    addColumnBtn.className = 'add-column-btn';
                    addColumnBtn.textContent = '+ 添加列';
                    addColumnBtn.title = '为当前空对象添加列';
                    addColumnBtn.addEventListener('click', () => this.addColumn(path));
                    sideActions.appendChild(addColumnBtn);
                    wrapper.appendChild(sideActions);
                } else {
                    // Single primitive or empty object
                    const tbody = document.createElement('tbody');
                    const tr = document.createElement('tr');
                    const td = document.createElement('td');
                    this.renderCell(td, data, path, 'value');
                    tr.appendChild(td);
                    tbody.appendChild(tr);
                    table.appendChild(tbody);
                    wrapper.appendChild(table);
                }

                return wrapper;
            },

            renderCell(td, val, path, key) {
                // 通用属性
                td.setAttribute('data-path', path);
                td.setAttribute('data-key', key);
                td.classList.add('cell-value-wrapper');
                td.setAttribute('tabindex', '-1');
                // 右键菜单
                td.addEventListener('contextmenu', (e) => {
                    // If the right-click originated inside an editable header (e.g. nested table header),
                    // allow the event to bubble so the header context menu can be shown instead.
                    try {
                        if (e.target && e.target.closest && e.target.closest('th[data-header-editable="true"]')) {
                            return;
                        }
                    } catch (err) { /* ignore */ }
                    e.preventDefault();
                    e.stopPropagation();
                    this.showContextMenu(e.clientX, e.clientY, {
                        type: 'cell',
                        path,
                        value: val
                    });
                });
                if (path) {
                    const menuBtn = document.createElement('button');
                    menuBtn.className = 'node-focus-menu-btn';
                    menuBtn.type = 'button';
                    menuBtn.title = '节点菜单';
                    menuBtn.textContent = '⋯';
                    menuBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const rect = menuBtn.getBoundingClientRect();
                        this.showContextMenu(rect.right - 8, rect.bottom + 4, {
                            type: 'cell',
                            path,
                            value: val,
                            fromNodeMenu: true,
                        });
                    });
                    td.appendChild(menuBtn);
                }
                if (val === null || val === undefined) {
                    td.setAttribute('data-editable', 'true');
                    const span = document.createElement('span');
                    span.className = 'cell-value null';
                    span.setAttribute('data-path', path);
                    span.setAttribute('data-key', key);
                    span.setAttribute('data-type', 'null');
                    span.setAttribute('contenteditable', 'false');
                    span.setAttribute('spellcheck', 'false');
                    span.textContent = 'null';
                    td.appendChild(span);
                } else if (typeof val === 'object') {
                    // Nested object/array — controlled by column header toggle
                    td.setAttribute('data-editable', 'false');
                    td.classList.add('cell-nested');
                    const collKey = this.getColumnStateKey(path);
                    const canExpandNested = this.canExpandNestedPath(path);
                    const isExpanded = this.columnStates[collKey] !== false && canExpandNested;
                    if (isExpanded) {
                        const nestedContainer = document.createElement('div');
                        nestedContainer.className = 'nested-content';
                        nestedContainer.appendChild(this.createTable(val, path));
                        td.appendChild(nestedContainer);
                    } else {
                        td.classList.add('is-collapsed');
                        td.dataset.hiddenReason = canExpandNested ? 'collapsed' : 'depth-limit';
                        const preview = document.createElement('div');
                        preview.className = 'nested-preview';
                        const badge = document.createElement('span');
                        badge.className = 'nested-badge';
                        badge.textContent = Array.isArray(val) ? `[${val.length}]` : `{${Object.keys(val).length}}`;
                        preview.appendChild(badge);
                        const summary = document.createElement('span');
                        summary.className = 'nested-summary-text';
                        const summaryPreview = this.summarize(val);
                        summary.textContent = summaryPreview.displayText;
                        summary.title = summaryPreview.titleText;
                        preview.appendChild(summary);
                        if (val !== null) {
                            const hintTitle = canExpandNested ? '当前节点还有未展开的下级，点击继续展开' : '当前节点因层级限制未完全显示，点击显示下一层';
                            const hintText = canExpandNested ? '展开下级' : '显示下一层';
                            const hintButton = this.createNestedHintButton({
                                title: hintTitle,
                                text: hintText,
                                className: 'nested-expand-hint',
                                onClick: () => this.revealNestedPath(path),
                            });
                            preview.appendChild(hintButton);
                        }
                        td.appendChild(preview);
                    }
                } else {
                    // Primitive value
                    td.setAttribute('data-editable', 'true');
                    const span = document.createElement('span');
                    const type = typeof val;
                    span.className = `cell-value ${type}`;
                    span.setAttribute('data-path', path);
                    span.setAttribute('data-key', key);
                    span.setAttribute('data-type', type);
                    span.setAttribute('contenteditable', 'false');
                    span.setAttribute('spellcheck', 'false');
                    span.textContent = String(val);
                    td.appendChild(span);
                }
            },

            summarize(val) {
                if (Array.isArray(val) || (typeof val === 'object' && val !== null)) {
                    try {
                        const fullText = JSON.stringify(val);
                        const maxCharsPerLine = 150;
                        const maxLines = 9;
                        const lines = [];

                        for (let index = 0; index < fullText.length; index += maxCharsPerLine) {
                            lines.push(fullText.slice(index, index + maxCharsPerLine));
                            if (lines.length > maxLines) {
                                return {
                                    displayText: '...',
                                    titleText: fullText,
                                };
                            }
                        }

                        return {
                            displayText: lines.join('\n'),
                            titleText: fullText,
                        };
                    } catch (error) {
                        const fallback = Array.isArray(val) ? '[]' : '{}';
                        return {
                            displayText: fallback,
                            titleText: fallback,
                        };
                    }
                }
                return {
                    displayText: '',
                    titleText: '',
                };
            },

            isEditableHeader(th) {
                return !!th && th.matches('th[data-header-editable="true"]');
            },

            getHeaderFromTarget(target) {
                return target?.closest?.('th[data-header-editable="true"]') || null;
            },

            getSelectableColumnHeaderFromTarget(target) {
                const header = target?.closest?.('th') || null;
                if (!header || header.classList.contains('row-num-header')) return null;
                const table = header.closest('table.json-table');
                if (!table || !table.tHead?.rows?.[0]?.contains(header)) return null;
                if (!header.matches('th[data-header-editable="true"]') && !header.textContent.trim()) return null;
                return header;
            },

            findHeaderByPath(path, key) {
                const headers = Array.from(document.querySelectorAll('th[data-header-editable="true"]'));
                return headers.find((header) => (header.dataset.headerPath || '') === (path || '') && header.dataset.headerKey === key) || null;
            },

            clearDragVisuals() {
                document.querySelectorAll('.drag-source, .drag-over-before, .drag-over-after').forEach((element) => {
                    element.classList.remove('drag-source', 'drag-over-before', 'drag-over-after');
                });
            },

            finishStructureDrag() {
                this.clearDragVisuals();
                this.dragState = null;
            },

            beginStructureDrag(payload, sourceElement, event) {
                if (!event.dataTransfer) return;
                if (this.editingCell) this.finishEdit(this.editingCell);
                this.finishStructureDrag();
                this.dragState = { ...payload };
                sourceElement?.classList.add('drag-source');
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', `${payload.type}:${payload.path || payload.arrayPath || ''}`);
            },

            updateDragTarget(targetElement, position) {
                document.querySelectorAll('.drag-over-before, .drag-over-after').forEach((element) => {
                    if (element !== targetElement) {
                        element.classList.remove('drag-over-before', 'drag-over-after');
                    }
                });
                if (!targetElement) return;
                targetElement.classList.remove('drag-over-before', 'drag-over-after');
                targetElement.classList.add(position === 'before' ? 'drag-over-before' : 'drag-over-after');
            },

            getColumnKeys(target) {
                if (Array.isArray(target)) {
                    const keys = [];
                    const seen = new Set();
                    for (const row of target) {
                        if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
                        for (const key of Object.keys(row)) {
                            if (!seen.has(key)) {
                                seen.add(key);
                                keys.push(key);
                            }
                        }
                    }
                    return keys;
                }
                if (target && typeof target === 'object') {
                    return Object.keys(target);
                }
                return [];
            },

            reorderList(items, sourceItem, targetItem, position = 'after') {
                const nextItems = [...items];
                const sourceIndex = nextItems.indexOf(sourceItem);
                const targetIndex = nextItems.indexOf(targetItem);
                if (sourceIndex === -1 || targetIndex === -1 || sourceItem === targetItem) return items;
                nextItems.splice(sourceIndex, 1);
                const adjustedTargetIndex = nextItems.indexOf(targetItem);
                const insertIndex = position === 'before' ? adjustedTargetIndex : adjustedTargetIndex + 1;
                nextItems.splice(insertIndex, 0, sourceItem);
                return nextItems;
            },

            rebuildObjectWithKeyOrder(target, orderedKeys) {
                const nextObject = {};
                for (const key of orderedKeys) {
                    if (Object.prototype.hasOwnProperty.call(target, key)) {
                        nextObject[key] = target[key];
                    }
                }
                for (const key of Object.keys(target)) {
                    if (!Object.prototype.hasOwnProperty.call(nextObject, key)) {
                        nextObject[key] = target[key];
                    }
                }
                for (const key of Object.keys(target)) {
                    delete target[key];
                }
                Object.assign(target, nextObject);
            },

            moveColumn(path, sourceKey, targetKey, position = 'after') {
                const target = this.getValueAtPath(this.data, path);
                if (target === undefined || target === null) {
                    return this.setStatus('未找到列所在对象', true);
                }
                const currentOrder = this.getColumnKeys(target);
                if (!currentOrder.includes(sourceKey) || !currentOrder.includes(targetKey) || sourceKey === targetKey) return;
                const nextOrder = this.reorderList(currentOrder, sourceKey, targetKey, position);
                if (nextOrder.join('|') === currentOrder.join('|')) return;

                const selectedPath = this.selectedCell?.dataset?.path || this.selectedRangeCells[0]?.dataset?.path || null;
                this.pushUndo();
                if (Array.isArray(target)) {
                    for (const row of target) {
                        if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
                        this.rebuildObjectWithKeyOrder(row, nextOrder);
                    }
                } else {
                    this.rebuildObjectWithKeyOrder(target, nextOrder);
                }
                this.applyModelColumnChange(path, (node) => this.rebuildModelObjectWithKeyOrder(node, nextOrder));
                this.pendingCellSelection = selectedPath;
                this.render();
                this.setStatus(`已调整列顺序：${sourceKey}`);
            },

            moveRow(arrayPath, sourceIndex, targetIndex) {
                const arr = this.getValueAtPath(this.data, arrayPath);
                if (!Array.isArray(arr)) return this.setStatus(this.getTranslation('pathNotArray'), true);
                if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0 || sourceIndex >= arr.length || targetIndex >= arr.length) return;
                this.pushUndo();
                const [movedItem] = arr.splice(sourceIndex, 1);
                arr.splice(targetIndex, 0, movedItem);
                this.pendingCellSelection = this.getArrayItemFocusPath(arrayPath, targetIndex, movedItem);
                this.nestedStates = {};
                this.render();
                this.setStatus(`已调整行顺序到第 ${targetIndex + 1} 行`);
            },

            selectColumnByHeader(header) {
                const table = header?.closest('table.json-table');
                const headerRow = header?.closest('tr');
                if (!table || !headerRow || !table.tBodies?.[0]) return;
                const headerCells = Array.from(headerRow.children).filter((th) => !th.classList.contains('row-num-header'));
                const columnIndex = headerCells.indexOf(header);
                try {
                    const headerKeys = headerCells.map((th) => th.dataset.headerKey || (th.textContent || '').trim());
                    console.log('WYSDEBUG selectColumnByHeader', { headerKey: header.dataset.headerKey || null, columnIndex, headerKeys });
                } catch (err) {
                    console.log('WYSDEBUG selectColumnByHeader: log error', err && err.message);
                }
                if (columnIndex < 0) return;

                const cells = Array.from(table.tBodies[0].rows)
                    .map((row) => this.getRowSelectableCells(row)[columnIndex])
                    .filter(Boolean);
                if (cells.length === 0) return;

                // Remember last header anchor in case selectionAnchorCell gets overwritten
                try {
                    this._lastHeaderAnchor = { table, colIndex: columnIndex, timestamp: Date.now(), anchorCell: cells[0] };
                    console.log('WYSDEBUG selectColumnByHeader saved lastHeaderAnchor', { colIndex: columnIndex });
                } catch (err) { }

                if (this.editingCell && !cells.includes(this.editingCell)) {
                    this.finishEdit(this.editingCell);
                }

                this.selectRange(cells[0], cells[cells.length - 1]);
                this.clearHeaderRowHighlights();
                header.classList.add('header-highlight');
            },

            selectHeaderText(input) {
                input.focus();
                input.setSelectionRange(0, input.value.length);
            },

            // Place caret inside a text input based on clientX coordinate
            setInputCaretFromPoint(input, clientX) {
                if (!input) return;
                const rect = input.getBoundingClientRect();
                const style = window.getComputedStyle(input);
                const paddingLeft = parseFloat(style.paddingLeft || 0);
                const x = clientX - rect.left - paddingLeft;
                const text = input.value || '';
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                ctx.font = style.font || `${style.fontSize} ${style.fontFamily}`;

                // Binary search character index by measured width
                let low = 0, high = text.length;
                while (low < high) {
                    const mid = Math.floor((low + high) / 2);
                    const w = ctx.measureText(text.slice(0, mid)).width;
                    if (w < x) low = mid + 1; else high = mid;
                }
                let idx = Math.max(0, low - 1);
                // refine: if next char is closer, use it
                const w1 = ctx.measureText(text.slice(0, idx)).width;
                const w2 = ctx.measureText(text.slice(0, idx + 1)).width;
                if (Math.abs(w2 - x) < Math.abs(w1 - x)) idx = idx + 1;
                input.setSelectionRange(idx, idx);
            },

            beginHeaderEdit(th, options = {}) {
                if (!this.isEditableHeader(th)) return;
                if (this.editingHeader && this.editingHeader !== th) {
                    this.commitHeaderEdit(this.editingHeader);
                }
                if (this.editingHeader === th) {
                    const existingInput = th.querySelector('.header-editor');
                    if (existingInput && options.selectAll) this.selectHeaderText(existingInput);
                    return;
                }

                const label = th.querySelector('.header-label');
                const originalValue = th.dataset.headerKey || label?.textContent || '';
                const currentWidth = this.lockHeaderWidth(th);
                this.rememberColumnWidth(th.dataset.headerPath || '', originalValue, currentWidth);
                th.classList.add('header-editing');
                th.innerHTML = '';

                const input = document.createElement('input');
                input.className = 'header-editor';
                input.type = 'text';
                input.value = originalValue;
                input.dataset.originalValue = originalValue;
                th.appendChild(input);
                this.editingHeader = th;
                input.addEventListener('mousedown', (e) => e.stopPropagation());
                input.addEventListener('pointerdown', (e) => e.stopPropagation());
                input.addEventListener('click', (e) => e.stopPropagation());
                input.addEventListener('dblclick', (e) => e.stopPropagation());
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.commitHeaderEdit(th);
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        this.cancelHeaderEdit(th);
                    }
                });
                input.addEventListener('blur', () => {
                    if (this.editingHeader === th) this.commitHeaderEdit(th);
                });

                if (options.selectAll) {
                    requestAnimationFrame(() => this.selectHeaderText(input));
                } else if (typeof options.clientX === 'number') {
                    requestAnimationFrame(() => {
                        input.focus();
                        this.setInputCaretFromPoint(input, options.clientX);
                    });
                } else {
                    requestAnimationFrame(() => input.focus());
                }
            },

            finishHeaderEdit(commit = true) {
                if (!this.editingHeader) return;
                if (commit) {
                    this.commitHeaderEdit(this.editingHeader);
                } else {
                    this.cancelHeaderEdit(this.editingHeader);
                }
            },

            commitHeaderEdit(th) {
                if (!th || this.editingHeader !== th) return;
                const input = th.querySelector('.header-editor');
                const nextKey = input?.value?.trim() || '';
                const headerPath = th.dataset.headerPath || '';
                const originalKey = th.dataset.headerKey || input?.dataset.originalValue || '';
                const headerWidth = this.lockHeaderWidth(th);
                this.editingHeader = null;

                this.rememberColumnWidth(headerPath, nextKey || originalKey, headerWidth);

                if (!nextKey) {
                    this.render();
                    this.setStatus(this.getTranslation('columnTitleCannotBeEmpty'), true);
                    return;
                }

                if (nextKey === originalKey) {
                    this.render();
                    this.setStatus(this.getTranslation('columnTitleNotModified'));
                    return;
                }

                this.renameColumn(th.dataset.headerPath || '', originalKey, nextKey);
            },

            cancelHeaderEdit(th) {
                if (!th || this.editingHeader !== th) return;
                const originalKey = th.dataset.headerKey || '';
                const headerWidth = this.lockHeaderWidth(th);
                this.editingHeader = null;
                this.rememberColumnWidth(th.dataset.headerPath || '', originalKey, headerWidth);
                this.render();
                this.setStatus(this.getTranslation('columnTitleEditCancelled'));
            },

            renameObjectKey(target, oldKey, newKey) {
                const nextObject = {};
                for (const key of Object.keys(target)) {
                    if (key === oldKey) {
                        nextObject[newKey] = target[key];
                    } else {
                        nextObject[key] = target[key];
                    }
                }
                for (const key of Object.keys(target)) {
                    delete target[key];
                }
                Object.assign(target, nextObject);
            },

            renameModelObjectKey(node, oldKey, newKey) {
                if (!node || node.kind !== 'object' || !node.children) return;
                if (!Object.prototype.hasOwnProperty.call(node.children, oldKey)) return;
                const nextChildren = {};
                for (const key of Object.keys(node.children)) {
                    if (key === oldKey) {
                        nextChildren[newKey] = node.children[key];
                    } else {
                        nextChildren[key] = node.children[key];
                    }
                }
                node.children = nextChildren;
            },

            renameModelColumn(path, oldKey, newKey) {
                if (!this.model) return;
                const modelNode = this.getModelNodeByPath(path);
                if (!modelNode) return;

                if (modelNode.kind === 'array' && Array.isArray(modelNode.items)) {
                    for (const item of modelNode.items) {
                        this.renameModelObjectKey(item, oldKey, newKey);
                    }
                } else if (modelNode.kind === 'object') {
                    this.renameModelObjectKey(modelNode, oldKey, newKey);
                }

                this.modelNodeMap = {};
                this.buildModelNodeMap(this.model, '');
            },

            createDefaultColumnModelNode() {
                const defaultValue = this.nullAsString ? '' : null;
                if (defaultValue === null) {
                    return {
                        kind: 'null',
                        value: null,
                        raw: 'null',
                        editable: true,
                        writeMode: 'json',
                    };
                }
                return {
                    kind: 'string',
                    value: defaultValue,
                    raw: JSON.stringify(defaultValue),
                    editable: true,
                    writeMode: 'json',
                };
            },

            insertModelObjectKey(node, anchorKey, newKey, position = 'after') {
                if (!node || node.kind !== 'object') return;
                const children = node.children || {};
                const nextChildren = {};
                let inserted = false;
                for (const key of Object.keys(children)) {
                    if (key === anchorKey && position === 'before' && !inserted) {
                        nextChildren[newKey] = this.createDefaultColumnModelNode();
                        inserted = true;
                    }
                    nextChildren[key] = children[key];
                    if (key === anchorKey && position === 'after' && !inserted) {
                        nextChildren[newKey] = this.createDefaultColumnModelNode();
                        inserted = true;
                    }
                }
                if (!inserted) {
                    nextChildren[newKey] = this.createDefaultColumnModelNode();
                }
                node.children = nextChildren;
            },

            deleteModelObjectKey(node, keyToDelete) {
                if (!node || node.kind !== 'object' || !node.children) return;
                if (!Object.prototype.hasOwnProperty.call(node.children, keyToDelete)) return;
                const nextChildren = {};
                for (const key of Object.keys(node.children)) {
                    if (key !== keyToDelete) {
                        nextChildren[key] = node.children[key];
                    }
                }
                node.children = nextChildren;
            },

            rebuildModelObjectWithKeyOrder(node, orderedKeys) {
                if (!node || node.kind !== 'object' || !node.children) return;
                const nextChildren = {};
                for (const key of orderedKeys) {
                    if (Object.prototype.hasOwnProperty.call(node.children, key)) {
                        nextChildren[key] = node.children[key];
                    }
                }
                for (const key of Object.keys(node.children)) {
                    if (!Object.prototype.hasOwnProperty.call(nextChildren, key)) {
                        nextChildren[key] = node.children[key];
                    }
                }
                node.children = nextChildren;
            },

            applyModelColumnChange(path, applyToObjectNode) {
                if (!this.model) return;
                const modelNode = this.getModelNodeByPath(path);
                if (!modelNode) return;

                if (modelNode.kind === 'array' && Array.isArray(modelNode.items)) {
                    for (const item of modelNode.items) {
                        applyToObjectNode(item);
                    }
                } else if (modelNode.kind === 'object') {
                    applyToObjectNode(modelNode);
                }

                this.modelNodeMap = {};
                this.buildModelNodeMap(this.model, '');
            },

            renameColumn(path, oldKey, newKey) {
                const target = this.getValueAtPath(this.data, path);
                if (target === undefined || target === null) {
                    this.render();
                    this.setStatus('未找到要修改的对象', true);
                    return;
                }

                try {
                    this.pushUndo();
                    if (Array.isArray(target)) {
                        const rows = target.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
                        if (rows.some((row) => Object.prototype.hasOwnProperty.call(row, newKey) && newKey !== oldKey)) {
                            throw new Error('新列标题已存在');
                        }
                        for (const row of rows) {
                            if (Object.prototype.hasOwnProperty.call(row, oldKey)) {
                                this.renameObjectKey(row, oldKey, newKey);
                            }
                        }
                    } else if (typeof target === 'object') {
                        if (Object.prototype.hasOwnProperty.call(target, newKey) && newKey !== oldKey) {
                            throw new Error('新列标题已存在');
                        }
                        this.renameObjectKey(target, oldKey, newKey);
                    } else {
                        throw new Error('当前节点不支持修改列标题');
                    }

                    this.renameModelColumn(path, oldKey, newKey);

                    this.render();
                    this.setStatus(`已将列标题修改为 ${newKey}`);
                } catch (error) {
                    this.render();
                    this.setStatus(error.message || '列标题修改失败', true);
                }
            },

            getNextColumnName(target, baseName = '新列') {
                if (!target || typeof target !== 'object' || Array.isArray(target)) return baseName;
                if (!Object.prototype.hasOwnProperty.call(target, baseName)) return baseName;
                let index = 2;
                while (Object.prototype.hasOwnProperty.call(target, `${baseName}${index}`)) {
                    index += 1;
                }
                return `${baseName}${index}`;
            },

            getNextColumnNameFromKeys(existingKeys, baseName = '新列') {
                const keySet = new Set(existingKeys || []);
                if (!keySet.has(baseName)) return baseName;
                let index = 2;
                while (keySet.has(`${baseName}${index}`)) {
                    index += 1;
                }
                return `${baseName}${index}`;
            },

            insertObjectKey(target, anchorKey, newKey, position = 'after', defaultValue = null) {
                const nextObject = {};
                let inserted = false;
                for (const key of Object.keys(target)) {
                    if (key === anchorKey && position === 'before' && !inserted) {
                        nextObject[newKey] = defaultValue;
                        inserted = true;
                    }
                    nextObject[key] = target[key];
                    if (key === anchorKey && position === 'after' && !inserted) {
                        nextObject[newKey] = defaultValue;
                        inserted = true;
                    }
                }
                if (!inserted) nextObject[newKey] = defaultValue;
                for (const key of Object.keys(target)) {
                    delete target[key];
                }
                Object.assign(target, nextObject);
            },

            // ===== Editing =====
            handleCellEdit(e) {
                const cellValue = e.target.closest('.cell-value');
                if (!cellValue) return;
                const td = cellValue.closest('td.cell-value-wrapper');
                if (!td || this.editingCell === td) return;
                this.selectCell(td);
            },

            activateEditable(span, enabled) {
                span.setAttribute('contenteditable', enabled ? 'plaintext-only' : 'false');
            },

            isSelectableCell(td) {
                return !!td && td.matches('td.cell-value-wrapper, td.cell-nested');
            },

            isEditableCell(td) {
                return !!td && td.matches('td.cell-value-wrapper[data-editable="true"]');
            },

            getSelectableCellFromTarget(target) {
                return target?.closest?.('td.cell-value-wrapper, td.cell-nested') || null;
            },

            setHoveredCell(td) {
                if (this.hoveredCell === td) return;
                if (this.hoveredCell) this.hoveredCell.classList.remove('is-hover-target');
                this.hoveredCell = this.isSelectableCell(td) ? td : null;
                if (this.hoveredCell && this.hoveredCell !== this.selectedCell && this.hoveredCell !== this.editingCell && !this.hoveredCell.classList.contains('is-range-selected')) {
                    this.hoveredCell.classList.add('is-hover-target');
                }
            },

            clearRangeSelection() {
                for (const cell of this.selectedRangeCells) {
                    if (!cell) continue;
                    cell.classList.remove('is-range-selected', 'range-edge-top', 'range-edge-right', 'range-edge-bottom', 'range-edge-left');
                    const handle = cell.querySelector(':scope > .selection-fill-handle');
                    if (handle) handle.remove();
                }
                this.selectedRangeCells = [];
            },

            updateRangeVisuals() {
                const cells = this.getSelectedCells();
                if (cells.length === 0) return;

                for (const cell of cells) {
                    cell.classList.remove('range-edge-top', 'range-edge-right', 'range-edge-bottom', 'range-edge-left');
                    const handle = cell.querySelector(':scope > .selection-fill-handle');
                    if (handle) handle.remove();
                }

                const coordinates = cells.map((cell) => ({ cell, ...this.getCellCoordinates(cell) })).filter((entry) => entry.table);
                if (coordinates.length === 0) return;

                const rowStart = Math.min(...coordinates.map((entry) => entry.rowIndex));
                const rowEnd = Math.max(...coordinates.map((entry) => entry.rowIndex));
                const colStart = Math.min(...coordinates.map((entry) => entry.colIndex));
                const colEnd = Math.max(...coordinates.map((entry) => entry.colIndex));

                for (const entry of coordinates) {
                    entry.cell.classList.add('is-range-selected');
                    if (entry.rowIndex === rowStart) entry.cell.classList.add('range-edge-top');
                    if (entry.rowIndex === rowEnd) entry.cell.classList.add('range-edge-bottom');
                    if (entry.colIndex === colStart) entry.cell.classList.add('range-edge-left');
                    if (entry.colIndex === colEnd) entry.cell.classList.add('range-edge-right');
                }

                const handleCell = coordinates.find((entry) => entry.rowIndex === rowEnd && entry.colIndex === colEnd)?.cell;
                if (handleCell) {
                    const handle = document.createElement('div');
                    handle.className = 'selection-fill-handle';
                    handle.title = '拖拽填充';
                    handleCell.appendChild(handle);
                }
            },

            selectRowByNumberCell(rowNumberCell, evt) {
                const tr = rowNumberCell?.closest('tr');
                if (!tr) return;
                const rowCells = this.getRowSelectableCells(tr);
                if (rowCells.length === 0) return;

                try { console.log('WYSDEBUG selectRowByNumberCell start', { rowIndexClicked: Number(rowNumberCell.dataset.rowIndex), shift: !!(evt && evt.shiftKey), selectionAnchor: this.selectionAnchorCell ? { path: this.selectionAnchorCell.dataset?.path || null } : null }); } catch (err) { }

                if (this.editingCell && !tr.contains(this.editingCell)) {
                    this.finishEdit(this.editingCell);
                }

                // Shift+Click: expand selection to include rows between anchor and clicked row.
                if (evt && evt.shiftKey && this.selectionAnchorCell) {
                    let anchorCoords = this.getCellCoordinates(this.selectionAnchorCell);
                    const table = tr.closest('table.json-table');
                    console.log && console.log('WYSDEBUG selectRowByNumberCell anchorCoordsBefore', anchorCoords ? { tablePath: anchorCoords.table?.dataset?.path || '', rowIndex: anchorCoords.rowIndex, colIndex: anchorCoords.colIndex } : null);

                    // If the anchor belongs to a different table (nested), try to normalize it into the clicked table
                    if (anchorCoords && anchorCoords.table !== table) {
                        try {
                            const anchorCell = this.selectionAnchorCell;
                            if (anchorCell && anchorCell.dataset && anchorCell.dataset.path) {
                                const anchorParentPath = anchorCell.dataset.path;
                                const rows = Array.from(table.tBodies[0]?.rows || []);
                                let found = null;
                                for (const r of rows) {
                                    const cells = this.getRowSelectableCells(r);
                                    for (const c of cells) {
                                        const p = c.dataset?.path || '';
                                        if (p && p.indexOf(anchorParentPath + '[') === 0) {
                                            found = c;
                                            break;
                                        }
                                    }
                                    if (found) break;
                                }
                                if (found) {
                                    const fcoords = this.getCellCoordinates(found);
                                    if (fcoords && fcoords.table === table) {
                                        anchorCoords = fcoords;
                                        try { console.log('WYSDEBUG selectRowByNumberCell anchorNormalizedFromParentPath', { anchorParentPath, anchorColIndex: fcoords.colIndex, foundPath: found.dataset.path }); } catch (err) { }
                                    }
                                }
                            }
                        } catch (err) { console.log('WYSDEBUG selectRowByNumberCell anchorNormalizationError', err && err.message); }
                    }

                    const clickedRowIndex = Number(rowNumberCell.dataset.rowIndex);
                    const selRect = this.getRangeRectFromCells(this.getSelectedCells());
                    let colStart, colEnd;
                    if (selRect && selRect.table === table) {
                        colStart = selRect.colStart;
                        colEnd = selRect.colEnd;
                    } else if (anchorCoords && anchorCoords.table === table) {
                        colStart = anchorCoords.colIndex;
                        colEnd = anchorCoords.colIndex;
                    } else {
                        // Fallback: choose full row across all selectable columns
                        colStart = 0;
                        colEnd = rowCells.length - 1;
                    }

                    const startRow = Math.min(anchorCoords?.rowIndex ?? clickedRowIndex, clickedRowIndex);
                    const endRow = Math.max(anchorCoords?.rowIndex ?? clickedRowIndex, clickedRowIndex);
                    const startCell = this.getCellByCoordinates(table, startRow, colStart);
                    const endCell = this.getCellByCoordinates(table, endRow, colEnd);
                    try { console.log('WYSDEBUG selectRowByNumberCell compute', { tablePath: table?.dataset?.path || '', startRow, endRow, colStart, colEnd, startCellPath: startCell?.dataset?.path || null, endCellPath: endCell?.dataset?.path || null }); } catch (err) { }
                    if (startCell && endCell) {
                        this.selectRange(startCell, endCell);
                        this.clearHeaderRowHighlights();
                        const rowNumCell = tr.querySelector('td.row-num');
                        if (rowNumCell) rowNumCell.classList.add('row-highlight');
                        return;
                    } else {
                        console.log('WYSDEBUG selectRowByNumberCell failedToLocateRangeCells', { startRow, endRow, colStart, colEnd });
                    }
                }

                // default: select the whole row
                this.selectRange(rowCells[0], rowCells[rowCells.length - 1]);
                this.clearHeaderRowHighlights();
                rowNumberCell.classList.add('row-highlight');
            },

            selectCell(td, options = {}) {
                if (!this.isSelectableCell(td)) return;
                if (!options.keepRange) {
                    this.clearRangeSelection();
                }
                if (this.selectedCell && this.selectedCell !== td) {
                    this.selectedCell.classList.remove('is-selected');
                }
                this.selectedCell = td;
                if (!options.keepAnchor) {
                    this.selectionAnchorCell = td;
                    try { console.log('WYSDEBUG selectCell set anchor', { path: td.dataset?.path || null, dataset: { ...td.dataset } }); } catch (err) { }
                }
                if (!options.keepRange) {
                    this.selectedRangeCells = [td];
                }
                td.classList.remove('is-hover-target');
                td.classList.add('is-selected');
                this.updateRangeVisuals();

                // Highlight matching header and row number when a single cell is selected
                this.clearHeaderRowHighlights();
                const selectedCells = this.getSelectedCells();
                if (selectedCells.length === 1) {
                    const coords = this.getCellCoordinates(selectedCells[0]);
                    if (coords && coords.table) {
                        const table = coords.table;
                        const { rowIndex, colIndex } = coords;
                        const isArray = table.dataset.isArray === 'true';
                        if (table.tHead && table.tHead.rows.length > 0) {
                            const thRow = table.tHead.rows[0];
                            const headerCells = Array.from(thRow.children).filter((th) => !th.classList.contains('row-num-header'));
                            const th = headerCells[colIndex];
                            if (th) th.classList.add('header-highlight');
                        }
                        if (isArray) {
                            const rowEl = table.tBodies[0].rows[rowIndex];
                            if (rowEl) {
                                const rowNumCell = rowEl.querySelector('td.row-num');
                                if (rowNumCell) rowNumCell.classList.add('row-highlight');
                            }
                        }
                    }
                }

                td.focus({ preventScroll: true });
            },

            clearSelection() {
                this.clearRangeSelection();
                if (this.selectedCell) this.selectedCell.classList.remove('is-selected');
                this.selectedCell = null;
                this.selectionAnchorCell = null;
                this.clearHeaderRowHighlights();
            },

            clearHeaderRowHighlights() {
                document.querySelectorAll('th.header-highlight').forEach((th) => th.classList.remove('header-highlight'));
                document.querySelectorAll('td.row-num.row-highlight').forEach((td) => td.classList.remove('row-highlight'));
            },

            getCellCoordinates(td) {
                if (!this.isSelectableCell(td)) return null;
                const table = td.closest('table.json-table');
                const tr = td.closest('tr');
                if (!table || !tr || !table.tBodies[0]) return null;

                const rows = Array.from(table.tBodies[0].rows);
                const rowIndex = rows.indexOf(tr);
                if (rowIndex === -1) return null;

                const cells = this.getRowSelectableCells(tr);
                const colIndex = cells.indexOf(td);
                if (colIndex === -1) return null;

                return { table, rows, rowIndex, colIndex };
            },

            getCellByCoordinates(table, rowIndex, colIndex) {
                if (!table?.tBodies?.[0]) return null;
                const row = table.tBodies[0].rows[rowIndex];
                if (!row) return null;
                const cells = this.getRowSelectableCells(row);
                return cells[colIndex] || null;
            },

            selectRange(anchorCell, endCell) {
                try { console.log('WYSDEBUG selectRange start', { anchorPath: anchorCell?.dataset?.path || null, endPath: endCell?.dataset?.path || null }); } catch (err) { }
                if (!this.isSelectableCell(anchorCell) || !this.isSelectableCell(endCell)) return;
                const anchor = this.getCellCoordinates(anchorCell);
                const end = this.getCellCoordinates(endCell);
                if (!anchor || !end || anchor.table !== end.table) {
                    this.selectCell(endCell);
                    return;
                }

                this.clearRangeSelection();

                const rowStart = Math.min(anchor.rowIndex, end.rowIndex);
                const rowEnd = Math.max(anchor.rowIndex, end.rowIndex);
                const colStart = Math.min(anchor.colIndex, end.colIndex);
                const colEnd = Math.max(anchor.colIndex, end.colIndex);
                const rangeCells = [];

                for (let row = rowStart; row <= rowEnd; row++) {
                    for (let col = colStart; col <= colEnd; col++) {
                        const cell = this.getCellByCoordinates(anchor.table, row, col);
                        if (!cell) continue;
                        rangeCells.push(cell);
                        cell.classList.remove('is-hover-target');
                    }
                }
                try {
                    const headerRow = anchor.table?.tHead?.rows?.[0];
                    const headerNames = headerRow ? Array.from(headerRow.children).filter(th => !th.classList.contains('row-num-header')).map(th => (th.textContent || '').trim()) : null;
                    console.log('WYSDEBUG selectRange computed', { rowStart, rowEnd, colStart, colEnd, count: rangeCells.length, headerNames });
                } catch (err) { console.log('WYSDEBUG selectRange log error', err && err.message); }

                this.selectedRangeCells = rangeCells;
                this.selectionAnchorCell = anchorCell;
                this.selectCell(endCell, { keepRange: true, keepAnchor: true });
                this.updateRangeVisuals();
            },

            getSelectedCells() {
                if (this.selectedRangeCells.length > 0) return this.selectedRangeCells;
                return this.selectedCell ? [this.selectedCell] : [];
            },

            hasRangeSelection() {
                return this.selectedRangeCells.length > 1;
            },

            placeCaretAtEnd(element) {
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(element);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            },

            placeCaretFromPoint(element, clientX, clientY) {
                let range = null;

                if (document.caretPositionFromPoint) {
                    const position = document.caretPositionFromPoint(clientX, clientY);
                    if (position) {
                        range = document.createRange();
                        range.setStart(position.offsetNode, position.offset);
                        range.collapse(true);
                    }
                } else if (document.caretRangeFromPoint) {
                    range = document.caretRangeFromPoint(clientX, clientY);
                }

                if (!range || !element.contains(range.startContainer)) {
                    this.placeCaretAtEnd(element);
                    return;
                }

                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            },

            selectionInsideElement(element) {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return false;
                const range = selection.getRangeAt(0);
                return element.contains(range.startContainer) && element.contains(range.endContainer);
            },

            insertLineBreakAtCaret(element) {
                if (!this.selectionInsideElement(element)) {
                    this.placeCaretAtEnd(element);
                }

                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) {
                    this.placeCaretAtEnd(element);
                    return;
                }

                let range = selection.getRangeAt(0);
                range.deleteContents();
                const lineBreak = document.createTextNode('\n');
                range.insertNode(lineBreak);

                range = document.createRange();
                range.setStartAfter(lineBreak);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            },

            beginEdit(td, options = {}) {
                if (!this.isEditableCell(td)) return;
                if (this.editingCell === td) {
                    const activeSpan = td.querySelector('.cell-value');
                    if (activeSpan && typeof options.clientX === 'number' && typeof options.clientY === 'number') {
                        activeSpan.focus();
                        this.placeCaretFromPoint(activeSpan, options.clientX, options.clientY);
                    }
                    return;
                }

                if (this.editingCell && this.editingCell !== td) {
                    this.finishEdit(this.editingCell);
                }

                const span = td.querySelector('.cell-value');
                if (!span) return;

                this.selectCell(td);
                this.editingCell = td;
                td.classList.add('is-editing');
                span.dataset.originalValue = span.textContent;
                this.activateEditable(span, true);
                if (options.replaceText !== undefined) {
                    span.textContent = options.replaceText;
                }
                span.focus();

                if (options.replaceText !== undefined) {
                    this.placeCaretAtEnd(span);
                } else if (typeof options.clientX === 'number' && typeof options.clientY === 'number') {
                    this.placeCaretFromPoint(span, options.clientX, options.clientY);
                } else {
                    this.placeCaretAtEnd(span);
                }
            },

            commitEdit(td, moveDirection = null) {
                if (!this.isEditableCell(td)) return;
                const span = td.querySelector('.cell-value');
                if (!span) return;

                const path = td.dataset.path || span.dataset.path || '';
                const originalValue = span.dataset.originalValue ?? span.textContent;
                const raw = span.textContent.replace(/\r\n?/g, '\n');
                const nextPath = moveDirection ? this.findAdjacentCellPath(td, moveDirection) : null;
                this.activateEditable(span, false);
                td.classList.remove('is-editing');
                this.editingCell = null;

                if (raw === originalValue) {
                    this.selectCell(td);
                    if (nextPath) this.selectCellByPath(nextPath);
                    return;
                }

                const newVal = this.parseValue(raw);
                if (newVal.error) {
                    span.textContent = originalValue;
                    this.setStatus('值格式错误: ' + newVal.error, true);
                    this.selectCell(td);
                    return;
                }

                try {
                    this.pushUndo();
                    this.setValueAtPath(this.data, path, newVal.value);
                    this.setStatus('已更新: ' + path);
                    this.render();
                    this.selectCellByPath(nextPath || path);
                } catch (err) {
                    this.setStatus('更新失败: ' + err.message, true);
                }
            },

            finishEdit(td, moveDirection = null) {
                if (!td || this.editingCell !== td) return;
                this.commitEdit(td, moveDirection);
            },

            cancelEdit(td) {
                if (!td || this.editingCell !== td) return;
                const span = td.querySelector('.cell-value');
                if (!span) return;
                span.textContent = span.dataset.originalValue ?? span.textContent;
                this.activateEditable(span, false);
                td.classList.remove('is-editing');
                this.editingCell = null;
                this.selectCell(td);
            },

            normalizeClipboardRows(text) {
                return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((row, index, rows) => row.length > 0 || index < rows.length - 1);
            },

            parseClipboardMatrix(text) {
                const rows = this.normalizeClipboardRows(text);
                if (rows.length === 0) return [[]];
                return rows.map((row) => row.split('\t'));
            },

            serializeValueForClipboard(val) {
                if (val === null || val === undefined) return '';
                if (typeof val === 'object') {
                    try {
                        return JSON.stringify(val);
                    } catch (error) {
                        return '';
                    }
                }
                return String(val);
            },

            getCellClipboardValue(td) {
                const path = td?.dataset?.path;
                if (!path) return '';
                return this.serializeValueForClipboard(this.getValueAtPath(this.data, path));
            },

            getSelectionMatrix() {
                const cells = this.getSelectedCells();
                if (cells.length === 0) return [];
                if (cells.length === 1) return [[this.getCellClipboardValue(cells[0])]];

                const coordinates = cells.map((cell) => ({ cell, ...this.getCellCoordinates(cell) })).filter((entry) => entry.table);
                if (coordinates.length === 0) return [];

                const table = coordinates[0].table;
                const rowStart = Math.min(...coordinates.map((entry) => entry.rowIndex));
                const rowEnd = Math.max(...coordinates.map((entry) => entry.rowIndex));
                const colStart = Math.min(...coordinates.map((entry) => entry.colIndex));
                const colEnd = Math.max(...coordinates.map((entry) => entry.colIndex));

                const matrix = [];
                for (let row = rowStart; row <= rowEnd; row++) {
                    const values = [];
                    for (let col = colStart; col <= colEnd; col++) {
                        const cell = this.getCellByCoordinates(table, row, col);
                        values.push(cell ? this.getCellClipboardValue(cell) : '');
                    }
                    matrix.push(values);
                }
                return matrix;
            },

            captureSelectionState() {
                const paths = this.getSelectedCells().map((cell) => cell?.dataset?.path).filter(Boolean);
                return {
                    paths,
                    activePath: this.selectedCell?.dataset?.path || null,
                    anchorPath: this.selectionAnchorCell?.dataset?.path || null,
                };
            },

            restoreSelectionState(state) {
                if (!state?.paths?.length) return;
                const cells = state.paths.map((path) => this.findCellByPath(path)).filter(Boolean);
                const activeCell = state.activePath ? this.findCellByPath(state.activePath) : cells[cells.length - 1];
                const anchorCell = state.anchorPath ? this.findCellByPath(state.anchorPath) : cells[0];
                if (!activeCell) return;

                this.clearRangeSelection();
                this.selectedRangeCells = cells;
                this.selectionAnchorCell = anchorCell || activeCell;
                if (this.selectedCell && this.selectedCell !== activeCell) {
                    this.selectedCell.classList.remove('is-selected');
                }
                this.selectedCell = activeCell;
                this.selectedCell.classList.add('is-selected');
                this.updateRangeVisuals();
                this.selectedCell.focus({ preventScroll: true });
            },

            getRangeRectFromCells(cells) {
                const coordinates = cells.map((cell) => ({ cell, ...this.getCellCoordinates(cell) })).filter((entry) => entry.table);
                if (coordinates.length === 0) return null;
                return {
                    table: coordinates[0].table,
                    rowStart: Math.min(...coordinates.map((entry) => entry.rowIndex)),
                    rowEnd: Math.max(...coordinates.map((entry) => entry.rowIndex)),
                    colStart: Math.min(...coordinates.map((entry) => entry.colIndex)),
                    colEnd: Math.max(...coordinates.map((entry) => entry.colIndex)),
                };
            },

            applyMatrixToSelection(matrix, options = {}) {
                const startCell = this.selectedCell;
                if (!startCell || matrix.length === 0) return false;

                const anchor = this.getCellCoordinates(startCell);
                if (!anchor) return false;

                const updates = [];
                const fillRange = matrix.length === 1 && matrix[0].length === 1 && this.hasRangeSelection();

                if (fillRange) {
                    const value = matrix[0][0];
                    for (const cell of this.getSelectedCells()) {
                        if (!this.isEditableCell(cell)) continue;
                        updates.push({ path: cell.dataset.path, raw: value });
                    }
                } else {
                    for (let rowOffset = 0; rowOffset < matrix.length; rowOffset++) {
                        for (let colOffset = 0; colOffset < matrix[rowOffset].length; colOffset++) {
                            const cell = this.getCellByCoordinates(anchor.table, anchor.rowIndex + rowOffset, anchor.colIndex + colOffset);
                            if (!cell || !this.isEditableCell(cell)) continue;
                            updates.push({ path: cell.dataset.path, raw: matrix[rowOffset][colOffset] });
                        }
                    }
                }

                if (updates.length === 0) return false;

                const parsedUpdates = [];
                for (const update of updates) {
                    const parsed = this.parseValue(update.raw);
                    if (parsed.error) {
                        this.setStatus('值格式错误: ' + parsed.error, true);
                        return false;
                    }
                    parsedUpdates.push({ path: update.path, value: parsed.value });
                }

                const selectionState = options.selectionState || this.captureSelectionState();

                this.pushUndo();
                for (const update of parsedUpdates) {
                    this.setValueAtPath(this.data, update.path, update.value);
                }

                this.render();
                this.restoreSelectionState(options.preserveSelection ? selectionState : {
                    paths: parsedUpdates.map((update) => update.path),
                    activePath: options.activePath || parsedUpdates[parsedUpdates.length - 1].path,
                    anchorPath: options.anchorPath || parsedUpdates[0].path,
                });
                this.setStatus(options.statusMessage || `已粘贴 ${parsedUpdates.length} 个单元格`);
                return true;
            },

            applyFillDrag() {
                if (!this.fillSourceRect || !this.fillSourceMatrix) return false;
                const targetRect = this.getRangeRectFromCells(this.getSelectedCells());
                if (!targetRect || targetRect.table !== this.fillSourceRect.table) return false;

                const updates = [];
                for (let row = targetRect.rowStart; row <= targetRect.rowEnd; row++) {
                    for (let col = targetRect.colStart; col <= targetRect.colEnd; col++) {
                        const inSourceRect = row >= this.fillSourceRect.rowStart && row <= this.fillSourceRect.rowEnd && col >= this.fillSourceRect.colStart && col <= this.fillSourceRect.colEnd;
                        if (inSourceRect) continue;
                        const cell = this.getCellByCoordinates(targetRect.table, row, col);
                        if (!cell || !this.isEditableCell(cell)) continue;
                        const sourceRow = ((row - this.fillSourceRect.rowStart) % this.fillSourceMatrix.length + this.fillSourceMatrix.length) % this.fillSourceMatrix.length;
                        const sourceCol = ((col - this.fillSourceRect.colStart) % this.fillSourceMatrix[0].length + this.fillSourceMatrix[0].length) % this.fillSourceMatrix[0].length;
                        updates.push({ path: cell.dataset.path, raw: this.fillSourceMatrix[sourceRow][sourceCol] });
                    }
                }

                if (updates.length === 0) return false;

                const parsed = updates.map((update) => ({ ...update, parsed: this.parseValue(update.raw) }));
                const error = parsed.find((item) => item.parsed.error);
                if (error) {
                    this.setStatus('值格式错误: ' + error.parsed.error, true);
                    return false;
                }

                const selectionState = this.captureSelectionState();
                this.pushUndo();
                for (const item of parsed) {
                    this.setValueAtPath(this.data, item.path, item.parsed.value);
                }
                this.render();
                this.restoreSelectionState(selectionState);
                this.setStatus(`已填充 ${updates.length} 个单元格`);
                return true;
            },

            parseValue(raw) {
                const trimmed = raw.trim();
                if (trimmed === 'null' || trimmed === '') return { value: null };
                if (trimmed === 'true') return { value: true };
                if (trimmed === 'false') return { value: false };

                // Try number
                if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
                    return { value: Number(trimmed) };
                }

                // Try JSON parse (for objects/arrays typed inline)
                if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                    (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                    try {
                        return { value: JSON.parse(trimmed) };
                    } catch (e) {
                        return { error: e.message };
                    }
                }

                // Return as string
                return { value: raw };
            },

            setValueAtPath(obj, path, value) {
                if (!path) {
                    // Replacing root
                    this.data = value;
                    return;
                }

                // Parse path like "employees[0].name" or "employees[0].projects[1].name"
                const parts = this.parsePath(path);
                let current = obj;
                for (let i = 0; i < parts.length - 1; i++) {
                    current = current[parts[i]];
                }
                current[parts[parts.length - 1]] = value;
            },

            parsePath(path) {
                const parts = [];
                const regex = /([^\.\[\]]+)|\[(\d+)\]/g;
                let match;
                while ((match = regex.exec(path)) !== null) {
                    if (match[1] !== undefined) {
                        parts.push(match[1]);
                    } else if (match[2] !== undefined) {
                        parts.push(parseInt(match[2], 10));
                    }
                }
                return parts;
            },

            getValueAtPath(obj, path) {
                if (!path) return obj;
                const parts = this.parsePath(path);
                let current = obj;
                for (const part of parts) {
                    if (current === null || current === undefined) return undefined;
                    if (typeof part === 'number') {
                        current = current[part];
                    } else {
                        current = current[part];
                    }
                }
                return current;
            },

            parseJsonStringValue(value) {
                if (typeof value !== 'string') return null;
                const text = value.trim();
                if (!text) return null;
                const first = text[0];
                if (first !== '{' && first !== '[') return null;
                try {
                    const parsed = JSON.parse(text);
                    if (parsed === null || typeof parsed !== 'object') return null;
                    return parsed;
                } catch (error) {
                    return null;
                }
            },

            canOpenAsJson(value) {
                return this.parseJsonStringValue(value) !== null;
            },

            canConvertJsonString(value) {
                return value !== null && typeof value === 'object';
            },

            convertNodeToJson(value) {
                return this.parseJsonStringValue(value);
            },

            convertNodeToJsonString(value) {
                if (!this.canConvertJsonString(value)) return null;
                try {
                    return JSON.stringify(value);
                } catch (error) {
                    return null;
                }
            },

            openJsonStringInNewPage(value, sourcePath = '') {
                const parsed = this.parseJsonStringValue(value);
                if (parsed === null) {
                    this.setStatus(this.getTranslation('openAsJsonFailed'), true);
                    return;
                }
                const payloadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const storageKey = `wysjson.openAsJson.${payloadId}`;
                localStorage.setItem(storageKey, JSON.stringify({ data: parsed, sourcePath }));
                const url = new URL(window.location.href);
                url.searchParams.set('wysjsonOpenPayload', payloadId);
                const opened = window.open(url.href, '_blank');
                if (!opened) {
                    localStorage.removeItem(storageKey);
                    this.setStatus(this.getTranslation('openAsJsonPopupBlocked'), true);
                    return;
                }
                this.setStatus(this.getTranslation('openAsJsonOpened'));
            },

            // ===== Row Operations =====
            createArrayItemTemplate(arr) {
                const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
                const isPureObjectArray = arr.length > 0 && arr.every((item) => isPlainObject(item));

                if (arr.length === 0) {
                    return this.nullAsString ? '' : null;
                }

                if (isPureObjectArray) {
                    const template = {};
                    for (const key of Object.keys(arr[0])) {
                        template[key] = this.nullAsString ? '' : null;
                    }
                    return template;
                }

                return this.nullAsString ? '' : null;
            },

            cloneJsonValue(value) {
                if (value === undefined) return value;
                try {
                    return JSON.parse(JSON.stringify(value));
                } catch (error) {
                    return value;
                }
            },

            createGrid3x3Node(value) {
                const isPrimitive = value === null || (typeof value !== 'object' && typeof value !== 'function');
                return Array.from({ length: 3 }, (_, rowIndex) => Array.from({ length: 3 }, (_, colIndex) => {
                    if (rowIndex === 0 && colIndex === 0) return this.cloneJsonValue(value);
                    return isPrimitive ? this.cloneJsonValue(value) : '';
                }));
            },

            isMatrixArrayNode(value) {
                return Array.isArray(value) && value.length > 0 && value.every((row) => Array.isArray(row)) && value.every((row) => row.length === value[0].length);
            },

            getMatrixCellDefaultValue(matrix) {
                const sourceValue = matrix?.[0]?.[0];
                const isPrimitive = sourceValue === null || (typeof sourceValue !== 'object' && typeof sourceValue !== 'function');
                return isPrimitive ? this.cloneJsonValue(sourceValue) : '';
            },

            wrapNodeInGrid3x3(path, value) {
                if (this.editingCell) this.finishEdit(this.editingCell);
                const targetPath = this.normalizePath(path);
                const currentValue = targetPath ? this.getValueAtPath(this.data, targetPath) : this.data;
                if (currentValue === undefined) return this.setStatus(this.getTranslation('notFoundToFocus'), true);

                this.pushUndo();
                const wrapped = this.createGrid3x3Node(currentValue);
                if (targetPath) {
                    this.setValueAtPath(this.data, targetPath, wrapped);
                    this.pendingCellSelection = `${targetPath}[0][0]`;
                } else {
                    this.data = wrapped;
                    this.focusPath = '';
                    this.pendingCellSelection = '[0][0]';
                }
                this.nestedStates = {};
                this.columnStates = {};
                this.render();
                this.setStatus('已包裹为 9 宫格 array');
            },

            getArrayItemFocusPath(arrayPath, index, itemValue) {
                const itemPath = `${arrayPath}[${index}]`;
                if (itemValue && typeof itemValue === 'object' && !Array.isArray(itemValue)) {
                    const keys = Object.keys(itemValue);
                    if (keys.length > 0) return `${itemPath}.${keys[0]}`;
                }
                return itemPath;
            },

            getColumnFocusPath(path, target, deletedKey) {
                const selectedPath = this.selectedCell?.dataset?.path || null;
                let currentKeys = [];

                if (Array.isArray(target)) {
                    const firstObjectRow = target.find((item) => item && typeof item === 'object' && !Array.isArray(item));
                    currentKeys = firstObjectRow ? Object.keys(firstObjectRow) : [];
                } else if (target && typeof target === 'object') {
                    currentKeys = Object.keys(target);
                }

                const deletedIndex = currentKeys.indexOf(deletedKey);
                const remainingKeys = currentKeys.filter((key) => key !== deletedKey);
                if (remainingKeys.length === 0) return null;

                const focusKey = remainingKeys[Math.min(Math.max(deletedIndex, 0), remainingKeys.length - 1)];

                if (Array.isArray(target)) {
                    let rowBase = null;
                    if (selectedPath && selectedPath.startsWith(`${path}[`)) {
                        const lastDot = selectedPath.lastIndexOf('.');
                        if (lastDot > path.length) {
                            rowBase = selectedPath.slice(0, lastDot);
                        }
                    }
                    if (!rowBase && target.length > 0) {
                        rowBase = `${path}[0]`;
                    }
                    return rowBase ? `${rowBase}.${focusKey}` : null;
                }

                return path ? `${path}.${focusKey}` : focusKey;
            },

            addRow(arrayPath) {
                if (this.editingCell) this.finishEdit(this.editingCell);
                const arr = this.getValueAtPath(this.data, arrayPath);
                if (!Array.isArray(arr)) return this.setStatus(this.getTranslation('pathNotArray'), true);
                // Support matrix-like arrays (rows are arrays with equal length)
                if (this.isMatrixArrayNode(arr)) {
                    this.pushUndo();
                    const fillValue = this.getMatrixCellDefaultValue(arr);
                    const colCount = arr[0]?.length || 0;
                    const newRow = Array.from({ length: colCount }, () => this.cloneJsonValue(fillValue));
                    arr.push(newRow);
                    this.ensurePaginationIncludesIndex(arrayPath || '', arr.length - 1, arr.length);
                    this.pendingCellSelection = this.getArrayItemFocusPath(arrayPath, arr.length - 1, newRow);
                    this.nestedStates = {}; // reset collapse states
                    this.render();
                    this.setStatus(this.getTranslation('addedNewRow'));
                    return;
                }

                this.pushUndo();
                const newItem = this.createArrayItemTemplate(arr);
                arr.push(newItem);
                this.ensurePaginationIncludesIndex(arrayPath || '', arr.length - 1, arr.length);
                this.pendingCellSelection = this.getArrayItemFocusPath(arrayPath, arr.length - 1, newItem);
                this.nestedStates = {}; // reset collapse states
                this.render();
                this.setStatus(this.getTranslation('addedNewRow'));
            },

            insertRow(arrayPath, index, position = 'after') {
                const arr = this.getValueAtPath(this.data, arrayPath);
                if (!Array.isArray(arr)) return this.setStatus(this.getTranslation('pathNotArray'), true);
                const insertIndex = position === 'before' ? index : index + 1;
                // Matrix-array insert support
                if (this.isMatrixArrayNode(arr)) {
                    this.pushUndo();
                    const fillValue = this.getMatrixCellDefaultValue(arr);
                    const colCount = arr[0]?.length || 0;
                    const newRow = Array.from({ length: colCount }, () => this.cloneJsonValue(fillValue));
                    arr.splice(insertIndex, 0, newRow);
                    this.ensurePaginationIncludesIndex(arrayPath || '', insertIndex, arr.length);
                    this.pendingCellSelection = this.getArrayItemFocusPath(arrayPath, insertIndex, newRow);
                    this.nestedStates = {};
                    this.render();
                    this.setStatus(position === 'before' ? this.getTranslation('insertedRowBefore', { n: index + 1 }) : this.getTranslation('insertedRowAfter', { n: index + 1 }));
                    return;
                }

                this.pushUndo();
                const newItem = this.createArrayItemTemplate(arr);
                arr.splice(insertIndex, 0, newItem);
                this.ensurePaginationIncludesIndex(arrayPath || '', insertIndex, arr.length);
                this.pendingCellSelection = this.getArrayItemFocusPath(arrayPath, insertIndex, newItem);
                this.nestedStates = {};
                this.render();
                this.setStatus(position === 'before' ? this.getTranslation('insertedRowBefore', { n: index + 1 }) : this.getTranslation('insertedRowAfter', { n: index + 1 }));
            },

            addColumn(objectPath) {
                if (this.editingCell) this.finishEdit(this.editingCell);
                // If a header is being edited, commit it so a click executes immediately
                if (this.editingHeader) this.finishHeaderEdit(true);
                const target = this.getValueAtPath(this.data, objectPath);
                if (!target || typeof target !== 'object') {
                    return this.setStatus(this.getTranslation('currentNodeNotObjectCannotAddColumn'), true);
                }

                let newKey = '新列';
                this.pushUndo();
                if (Array.isArray(target)) {
                    const rows = target.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
                    const existingKeys = rows.flatMap((row) => Object.keys(row));
                    newKey = this.getNextColumnNameFromKeys(existingKeys);
                    for (const row of rows) {
                        row[newKey] = this.nullAsString ? '' : null;
                    }
                } else {
                    newKey = this.getNextColumnName(target);
                    target[newKey] = this.nullAsString ? '' : null;
                }
                this.applyModelColumnChange(objectPath, (node) => {
                    if (!node || node.kind !== 'object') return;
                    if (!node.children) node.children = {};
                    node.children[newKey] = this.createDefaultColumnModelNode();
                });
                this.pendingHeaderEdit = { path: objectPath || '', key: newKey };
                this.render();
                this.setStatus(this.getTranslation('addedNewColumnPleaseEdit'));
            },

            convertSingleValueArrayToObjects(arrayPath) {
                console.log('WYSDEBUG convertSingleValueArrayToObjects start', { arrayPath });
                try {
                    if (this.editingCell) this.finishEdit(this.editingCell);
                    const arr = this.getValueAtPath(this.data, arrayPath);
                    console.log('WYSDEBUG convertSingleValueArrayToObjects currentArraySample', { sample: Array.isArray(arr) ? arr.slice(0, 5) : arr });
                    if (!Array.isArray(arr)) return this.setStatus(this.getTranslation('pathNotArray'), true);
                    if (arr.length === 0) {
                        return this.setStatus('空数组，无法隐式转换', true);
                    }
                    const allPrimitive = arr.every((it) => it === null || typeof it !== 'object');
                    if (!allPrimitive) return this.setStatus('数组包含对象或嵌套结构，无法隐式转换', true);

                    const baseName = '值';
                    const existingKeys = [];
                    const defaultKey = this.getNextColumnNameFromKeys(existingKeys, baseName);

                    this.pushUndo();
                    for (let i = 0; i < arr.length; i++) {
                        const v = arr[i];
                        arr[i] = { [defaultKey]: v };
                    }

                    // Update model node if present so headers and model map align
                    if (this.model) {
                        try {
                            const modelNode = this.getModelNodeByPath(arrayPath);
                            if (modelNode && modelNode.kind === 'array') {
                                if (Array.isArray(modelNode.items)) {
                                    for (let i = 0; i < modelNode.items.length; i++) {
                                        modelNode.items[i] = { kind: 'object', children: {} };
                                        modelNode.items[i].children[defaultKey] = this.createDefaultColumnModelNode();
                                    }
                                } else {
                                    modelNode.items = [{ kind: 'object', children: { [defaultKey]: this.createDefaultColumnModelNode() } }];
                                }
                            }
                            this.modelNodeMap = {};
                            this.buildModelNodeMap(this.model, '');
                        } catch (err) {
                            console.log('WYSDEBUG convertSingleValueArrayToObjects model update error', err && err.message);
                        }
                    }

                    this.pendingHeaderEdit = { path: arrayPath || '', key: defaultKey };
                    // Preserve existing nestedStates (do not reset) so nested tables remain expanded
                    try { if (window.__WYS_DOM_LOGS) window.__WYS_DOM_LOGS.push({ t: Date.now(), text: `convertSingleValueArrayToObjects ${arrayPath} -> key=${defaultKey}` }); } catch (e) { }
                    // Ensure nested table for this path is expanded so the new header exists in the DOM
                    try {
                        const colStateKey = this.getColumnStateKey(arrayPath);
                        if (colStateKey) this.columnStates[colStateKey] = true;
                    } catch (e) { /* ignore */ }
                    this.render();
                    console.log('WYSDEBUG convertSingleValueArrayToObjects done', { arrayPath, defaultKey, sampleAfter: this.getValueAtPath(this.data, arrayPath).slice ? this.getValueAtPath(this.data, arrayPath).slice(0, 5) : null });
                    this.setStatus('已将单值数组转换为对象（原值存入列：' + defaultKey + '）');
                } catch (err) {
                    console.log('WYSDEBUG convertSingleValueArrayToObjects error', err && err.message);
                    this.setStatus('单值数组转换失败: ' + (err && err.message), true);
                }
            },

            insertColumn(path, anchorKey, position = 'after') {
                const target = this.getValueAtPath(this.data, path);
                if (target === undefined || target === null) {
                    return this.setStatus(this.getTranslation('notFoundColumnObject'), true);
                }

                try {
                    this.pushUndo();
                    let newKey = '新列';
                    if (Array.isArray(target)) {
                        const rows = target.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
                        const existingKeys = rows.flatMap((row) => Object.keys(row));
                        newKey = this.getNextColumnNameFromKeys(existingKeys);
                        for (const row of rows) {
                            this.insertObjectKey(row, anchorKey, newKey, position, this.nullAsString ? '' : null);
                        }
                    } else if (typeof target === 'object') {
                        newKey = this.getNextColumnName(target);
                        this.insertObjectKey(target, anchorKey, newKey, position, this.nullAsString ? '' : null);
                    } else {
                        throw new Error(this.getTranslation('currentNodeNotObjectCannotInsertColumn'));
                    }
                    this.applyModelColumnChange(path, (node) => this.insertModelObjectKey(node, anchorKey, newKey, position));
                    this.pendingHeaderEdit = { path: path || '', key: newKey };
                    this.render();
                    this.setStatus(position === 'before' ? this.getTranslation('insertedColumnBefore', { key: anchorKey }) : this.getTranslation('insertedColumnAfter', { key: anchorKey }));
                } catch (error) {
                    this.render();
                    this.setStatus(error.message || '插入列失败', true);
                }
            },

            duplicateColumn(path, anchorKey, count = 1, position = 'after') {
                const target = this.getValueAtPath(this.data, path);
                if (target === undefined || target === null) {
                    return this.setStatus(this.getTranslation('notFoundColumnObject'), true);
                }

                try {
                    this.pushUndo();

                    for (let i = 0; i < Math.max(1, Math.floor(Number(count) || 1)); i++) {
                        let newKey = '新列';
                        if (Array.isArray(target)) {
                            const rows = target.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
                            const existingKeys = rows.flatMap((row) => Object.keys(row));
                            newKey = this.getNextColumnNameFromKeys(existingKeys);
                            for (const row of rows) {
                                const nextObject = {};
                                let inserted = false;
                                for (const k of Object.keys(row)) {
                                    if (k === anchorKey && position === 'before' && !inserted) {
                                        const valueToCopy = row && Object.prototype.hasOwnProperty.call(row, anchorKey) ? this.cloneJsonValue(row[anchorKey]) : (this.nullAsString ? '' : null);
                                        nextObject[newKey] = valueToCopy;
                                        inserted = true;
                                    }
                                    nextObject[k] = row[k];
                                    if (k === anchorKey && position === 'after' && !inserted) {
                                        const valueToCopy = row && Object.prototype.hasOwnProperty.call(row, anchorKey) ? this.cloneJsonValue(row[anchorKey]) : (this.nullAsString ? '' : null);
                                        nextObject[newKey] = valueToCopy;
                                        inserted = true;
                                    }
                                }
                                if (!inserted) {
                                    const valueToCopy = row && Object.prototype.hasOwnProperty.call(row, anchorKey) ? this.cloneJsonValue(row[anchorKey]) : (this.nullAsString ? '' : null);
                                    nextObject[newKey] = valueToCopy;
                                }
                                for (const k of Object.keys(row)) delete row[k];
                                Object.assign(row, nextObject);
                            }
                        } else if (typeof target === 'object') {
                            newKey = this.getNextColumnName(target);
                            const nextObject = {};
                            let inserted = false;
                            for (const k of Object.keys(target)) {
                                if (k === anchorKey && position === 'before' && !inserted) {
                                    const valueToCopy = Object.prototype.hasOwnProperty.call(target, anchorKey) ? this.cloneJsonValue(target[anchorKey]) : (this.nullAsString ? '' : null);
                                    nextObject[newKey] = valueToCopy;
                                    inserted = true;
                                }
                                nextObject[k] = target[k];
                                if (k === anchorKey && position === 'after' && !inserted) {
                                    const valueToCopy = Object.prototype.hasOwnProperty.call(target, anchorKey) ? this.cloneJsonValue(target[anchorKey]) : (this.nullAsString ? '' : null);
                                    nextObject[newKey] = valueToCopy;
                                    inserted = true;
                                }
                            }
                            if (!inserted) {
                                const valueToCopy = Object.prototype.hasOwnProperty.call(target, anchorKey) ? this.cloneJsonValue(target[anchorKey]) : (this.nullAsString ? '' : null);
                                nextObject[newKey] = valueToCopy;
                            }
                            for (const k of Object.keys(target)) delete target[k];
                            Object.assign(target, nextObject);
                        } else {
                            throw new Error(this.getTranslation('currentNodeNotObjectCannotInsertColumn'));
                        }

                        // Update model to include new column node
                        this.applyModelColumnChange(path, (node) => this.insertModelObjectKey(node, anchorKey, newKey, position));
                        this.pendingHeaderEdit = { path: path || '', key: newKey };
                    }

                    this.render();
                    this.setStatus(this.getTranslation('duplicatedColumn') ? this.getTranslation('duplicatedColumn') : `已复制列 ${anchorKey}`);
                } catch (error) {
                    this.render();
                    this.setStatus(error.message || '复制列失败', true);
                }
            },

            deleteColumn(path, key) {
                console.log('WYSDEBUG deleteColumn called for', { path, key });
                const target = this.getValueAtPath(this.data, path);
                console.log('WYSDEBUG deleteColumn targetSnapshot', { targetType: Array.isArray(target) ? 'array' : (target && typeof target === 'object') ? 'object' : typeof target });
                if (target === undefined || target === null) {
                    return this.setStatus('未找到列所在对象', true);
                }

                try {
                    this.pushUndo();
                    const focusPath = this.getColumnFocusPath(path, target, key);

                    // If target is an array of objects, compute unique keys across rows
                    if (Array.isArray(target)) {
                        const rows = target.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
                        const keys = new Set();
                        for (const row of rows) {
                            for (const k of Object.keys(row)) keys.add(k);
                        }
                        console.log('WYSDEBUG deleteColumn arrayRowsKeys', Array.from(keys));

                        // If removing this key would leave zero columns, replace the whole node with null/''
                        if (keys.size <= 1 && keys.has(key)) {
                            this.setValueAtPath(this.data, path || '', this.nullAsString ? '' : null);
                            this.nestedStates = {};
                            this.pendingCellSelection = null;
                            this.render();
                            this.setStatus(this.nullAsString ? `已删除列 ${key}；当前节点已置为空字符串` : `已删除列 ${key}；当前节点已置为 null`);
                            return;
                        }

                        // Otherwise just delete the key from each object row
                        console.log('WYSDEBUG deleteColumn deleting key from rows', { key });
                        for (const row of rows) {
                            delete row[key];
                        }
                    } else if (typeof target === 'object') {
                        const existingKeys = Object.keys(target);
                        console.log('WYSDEBUG deleteColumn objectExistingKeys', existingKeys);
                        if (existingKeys.length <= 1 && Object.prototype.hasOwnProperty.call(target, key)) {
                            // Replacing the entire object node with null/'' when last key removed
                            this.setValueAtPath(this.data, path || '', this.nullAsString ? '' : null);
                            this.nestedStates = {};
                            this.pendingCellSelection = null;
                            this.render();
                            this.setStatus(this.nullAsString ? `已删除列 ${key}；当前节点已置为空字符串` : `已删除列 ${key}；当前节点已置为 null`);
                            return;
                        }

                        console.log('WYSDEBUG deleteColumn deleting key from object', { key });
                        delete target[key];
                    } else {
                        throw new Error('当前节点不支持删除列');
                    }

                    console.log('WYSDEBUG deleteColumn applying model change for key', { key });
                    this.applyModelColumnChange(path, (node) => this.deleteModelObjectKey(node, key));
                    this.pendingCellSelection = focusPath;
                    this.render();
                    this.setStatus(`已删除列 ${key}`);
                } catch (error) {
                    this.render();
                    this.setStatus(error.message || '删除列失败', true);
                }
            },

            deleteRow(arrayPath, index) {
                const parentPath = arrayPath;
                const arr = this.getValueAtPath(this.data, parentPath);
                if (!Array.isArray(arr)) return;
                this.pushUndo();
                arr.splice(index, 1);
                if (arr.length > 0) {
                    const fallbackIndex = Math.min(index, arr.length - 1);
                    this.ensurePaginationIncludesIndex(parentPath || '', fallbackIndex, arr.length);
                    this.pendingCellSelection = this.getArrayItemFocusPath(parentPath, fallbackIndex, arr[fallbackIndex]);
                } else {
                    this.pendingCellSelection = null;
                }
                this.nestedStates = {};
                this.render();
                this.setStatus(`已删除行 [${index}]`);
            },

            // Delete all unique rows covered by current rectangular selection
            deleteSelectedRows() {
                const selectedCells = this.getSelectedCells();
                if (!selectedCells || selectedCells.length === 0) return this.setStatus('当前无选中行', true);
                const coords = selectedCells.map((c) => this.getCellCoordinates(c)).filter(Boolean);
                if (coords.length === 0) return this.setStatus('无法识别选区', true);
                const table = coords[0].table;
                if (!table) return this.setStatus('无法识别表格', true);
                const tablePath = table.dataset.path || '';
                if (table.dataset.isArray !== 'true') return this.setStatus('当前表格不支持删除行', true);

                const rowIndices = Array.from(new Set(coords.map((c) => c.rowIndex))).sort((a, b) => b - a);
                if (rowIndices.length === 0) return this.setStatus('当前无选中行', true);

                const arr = this.getValueAtPath(this.data, tablePath);
                if (!Array.isArray(arr)) return this.setStatus('未找到数组节点', true);

                this.pushUndo();
                for (const idx of rowIndices) {
                    if (idx >= 0 && idx < arr.length) arr.splice(idx, 1);
                }

                if (arr.length > 0) {
                    const minIdx = Math.min(...rowIndices);
                    const fallbackIndex = Math.min(minIdx, arr.length - 1);
                    this.ensurePaginationIncludesIndex(tablePath || '', fallbackIndex, arr.length);
                    this.pendingCellSelection = this.getArrayItemFocusPath(tablePath, fallbackIndex, arr[fallbackIndex]);
                } else {
                    this.pendingCellSelection = null;
                }
                this.nestedStates = {};
                this.render();
                this.setStatus(`已删除 ${rowIndices.length} 行`);
            },

            // Delete all unique columns covered by current rectangular selection
            deleteSelectedColumns() {
                const selectedCells = this.getSelectedCells();
                console.log('WYSDEBUG deleteSelectedColumns start', { selectedCount: selectedCells?.length || 0 });
                if (!selectedCells || selectedCells.length === 0) return this.setStatus('当前无选中列', true);
                const coords = selectedCells.map((c) => this.getCellCoordinates(c)).filter(Boolean);
                console.log('WYSDEBUG deleteSelectedColumns selectedCells datasets', selectedCells.map((c) => ({ path: c.dataset?.path || null, key: c.dataset?.key || c.dataset?.col || null })));
                if (coords.length === 0) return this.setStatus('无法识别选区', true);
                console.log('WYSDEBUG deleteSelectedColumns coords', coords.map((co) => ({ rowIndex: co.rowIndex, colIndex: co.colIndex, tablePath: co.table?.dataset?.path || '' })));
                const table = coords[0].table;
                if (!table) return this.setStatus('无法识别表格', true);
                const tablePath = table.dataset.path || '';
                console.log('WYSDEBUG deleteSelectedColumns tablePath', { tablePath });

                const colIndicesSet = new Set(coords.map((c) => c.colIndex));
                const colIndices = Array.from(colIndicesSet).sort((a, b) => a - b);
                console.log('WYSDEBUG deleteSelectedColumns colIndices', { colIndices });
                if (colIndices.length === 0) return this.setStatus('当前无选中列', true);

                const tableValue = this.getValueAtPath(this.data, tablePath);
                // matrix: array of arrays
                const isMatrix = Array.isArray(tableValue) && tableValue.length > 0 && Array.isArray(tableValue[0]);
                if (isMatrix) {
                    console.log('WYSDEBUG deleteSelectedColumns type=matrix');
                    const indicesDesc = colIndices.slice().sort((a, b) => b - a);
                    this.pushUndo();
                    for (const row of tableValue) {
                        if (!Array.isArray(row)) continue;
                        for (const ci of indicesDesc) {
                            if (ci >= 0 && ci < row.length) row.splice(ci, 1);
                        }
                    }
                    this.nestedStates = {};
                    this.render();
                    this.setStatus(`已删除 ${colIndices.length} 列`);
                    return;
                }

                // object / array of objects
                const headerRow = table.tHead?.rows?.[0];
                if (!headerRow) return this.setStatus('未找到表头，无法删除列', true);
                // Use the same headerCells filter as other selection logic so column index aligns
                const headerCells = Array.from(headerRow.children).filter((th) => !th.classList.contains('row-num-header'));
                const headersInfo = headerCells.map((th, idx) => ({ idx, key: th.dataset?.headerKey || (th.textContent || '').trim() }));
                console.log('WYSDEBUG deleteSelectedColumns headerCells', headersInfo);
                const keysToDelete = [];
                for (const ci of colIndices) {
                    const th = headerCells[ci];
                    const key = th?.dataset?.headerKey || (th?.textContent || '').trim();
                    if (key) keysToDelete.push(key);
                }
                console.log('WYSDEBUG deleteSelectedColumns keysToDelete', { keysToDelete });
                if (keysToDelete.length === 0) return this.setStatus('未识别到要删除的列', true);

                const target = this.getValueAtPath(this.data, tablePath);
                const existingKeys = new Set();
                if (Array.isArray(target)) {
                    for (const row of target) {
                        if (row && typeof row === 'object' && !Array.isArray(row)) {
                            for (const k of Object.keys(row)) existingKeys.add(k);
                        }
                    }
                } else if (target && typeof target === 'object') {
                    for (const k of Object.keys(target)) existingKeys.add(k);
                }
                console.log('WYSDEBUG deleteSelectedColumns existingKeys', Array.from(existingKeys));

                const remainingKeys = Array.from(existingKeys).filter((k) => !keysToDelete.includes(k));
                this.pushUndo();
                if (remainingKeys.length === 0) {
                    console.log('WYSDEBUG deleteSelectedColumns removing all keys -> set to null/empty');
                    this.setValueAtPath(this.data, tablePath, this.nullAsString ? '' : null);
                    this.nestedStates = {};
                    this.pendingCellSelection = null;
                    this.render();
                    this.setStatus(this.nullAsString ? `已删除列；当前节点已置为空字符串` : `已删除列；当前节点已置为 null`);
                    return;
                }

                try {
                    if (Array.isArray(target)) {
                        for (const row of target) {
                            if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
                            for (const k of keysToDelete) delete row[k];
                        }
                    } else if (target && typeof target === 'object') {
                        for (const k of keysToDelete) delete target[k];
                    }

                    this.applyModelColumnChange(tablePath, (node) => {
                        for (const k of keysToDelete) this.deleteModelObjectKey(node, k);
                    });
                    this.nestedStates = {};
                    this.pendingCellSelection = null;
                    this.render();
                    this.setStatus(`已删除 ${keysToDelete.length} 列`);
                } catch (err) {
                    console.log('WYSDEBUG deleteSelectedColumns error during delete', err && err.message, err && err.stack);
                    this.setStatus('删除列时出错，请查看控制台日志', true);
                }
            },

            getRowSelectableCells(tr) {
                return Array.from(tr.children).filter((cell) => this.isSelectableCell(cell));
            },

            findAdjacentCell(td, direction) {
                if (!this.isSelectableCell(td)) return null;
                const table = td.closest('table.json-table');
                const tr = td.closest('tr');
                if (!table || !tr || !table.tBodies[0]) return null;

                const rows = Array.from(table.tBodies[0].rows);
                const rowIndex = rows.indexOf(tr);
                if (rowIndex === -1) return null;

                const currentRowCells = this.getRowSelectableCells(tr);
                const colIndex = currentRowCells.indexOf(td);
                if (colIndex === -1) return null;

                if (direction === 'left') return currentRowCells[colIndex - 1] || null;
                if (direction === 'right') return currentRowCells[colIndex + 1] || null;

                const targetRow = direction === 'up' ? rows[rowIndex - 1] : rows[rowIndex + 1];
                if (!targetRow) return null;

                const targetCells = this.getRowSelectableCells(targetRow);
                if (targetCells.length === 0) return null;
                return targetCells[Math.min(colIndex, targetCells.length - 1)] || null;
            },

            getArrayItemPath(arrayPath, index) {
                return arrayPath ? `${arrayPath}[${index}]` : `[${index}]`;
            },

            getPaginatedAdjacentPath(path, direction) {
                if (!path || (direction !== 'up' && direction !== 'down')) return null;
                const arrayPathInfo = this.getInnermostArrayPathInfo(path);
                if (!arrayPathInfo) return null;
                const arr = this.getValueAtPath(this.data, arrayPathInfo.arrayPath);
                if (!Array.isArray(arr)) return null;
                const paginationState = this.getPaginationState(arrayPathInfo.arrayPath || '', arr.length);
                if (!paginationState.enabled) return null;

                const nextIndex = direction === 'up' ? arrayPathInfo.index - 1 : arrayPathInfo.index + 1;
                if (nextIndex < 0 || nextIndex >= arr.length) return null;

                const currentItemPath = this.getArrayItemPath(arrayPathInfo.arrayPath || '', arrayPathInfo.index);
                const nextItemPath = this.getArrayItemPath(arrayPathInfo.arrayPath || '', nextIndex);
                const suffix = path.startsWith(currentItemPath) ? path.slice(currentItemPath.length) : '';
                return `${nextItemPath}${suffix}`;
            },

            findAdjacentCellPath(td, direction) {
                const adjacentCell = this.findAdjacentCell(td, direction);
                if (adjacentCell?.dataset?.path) return adjacentCell.dataset.path;
                return this.getPaginatedAdjacentPath(td?.dataset?.path || '', direction);
            },

            findCellByPath(path) {
                if (!path) return null;
                return Array.from(document.querySelectorAll('td[data-path]')).find((cell) => cell.dataset.path === path) || null;
            },

            selectCellByPath(path) {
                let cell = this.findCellByPath(path);
                if (!cell) {
                    const arrayPathInfo = this.getInnermostArrayPathInfo(path);
                    if (arrayPathInfo) {
                        const arr = this.getValueAtPath(this.data, arrayPathInfo.arrayPath);
                        if (Array.isArray(arr) && this.ensurePaginationIncludesIndex(arrayPathInfo.arrayPath || '', arrayPathInfo.index, arr.length)) {
                            this.render();
                            cell = this.findCellByPath(path);
                        }
                    }
                }
                if (cell) this.selectCell(cell);
                return cell;
            },

            isPrintableKey(e) {
                return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
            },

            // ===== Keyboard =====
            handleKeydown(e) {
                if (this.isJsonEditorTarget(e.target)) return;
                const headerInput = e.target.closest('.header-editor');
                if (headerInput) return;

                const activeCell = this.editingCell || this.selectedCell || this.getSelectableCellFromTarget(e.target);
                const editingSpan = this.editingCell?.querySelector('.cell-value');

                if (this.editingCell && editingSpan && (e.target === editingSpan || editingSpan.contains(e.target))) {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        this.cancelEdit(this.editingCell);
                        return;
                    }

                    if (e.key === 'Enter' && e.altKey) {
                        e.preventDefault();
                        this.insertLineBreakAtCaret(editingSpan);
                        return;
                    }

                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.finishEdit(this.editingCell, 'down');
                        return;
                    }

                    if (e.key === 'Tab') {
                        e.preventDefault();
                        this.finishEdit(this.editingCell, e.shiftKey ? 'left' : 'right');
                    }
                    return;
                }

                if (!activeCell) return;

                const keyToDirection = {
                    ArrowUp: 'up',
                    ArrowDown: 'down',
                    ArrowLeft: 'left',
                    ArrowRight: 'right',
                };

                if (e.shiftKey && keyToDirection[e.key]) {
                    e.preventDefault();
                    const anchorCell = this.selectionAnchorCell || activeCell;
                    const nextCell = this.findAdjacentCell(activeCell, keyToDirection[e.key]);
                    if (nextCell) this.selectRange(anchorCell, nextCell);
                    return;
                }

                if (this.isPrintableKey(e) && this.isEditableCell(activeCell)) {
                    e.preventDefault();
                    this.beginEdit(activeCell, { replaceText: e.key });
                    return;
                }

                if ((e.key === 'Backspace' || e.key === 'Delete') && this.getSelectedCells().length > 0) {
                    e.preventDefault();
                    this.applyMatrixToSelection([['']], {
                        preserveSelection: true,
                        statusMessage: `已清空 ${this.getSelectedCells().length} 个单元格`,
                    });
                    return;
                }

                if (e.key === 'Enter') {
                    e.preventDefault();
                    const nextCell = this.findAdjacentCell(activeCell, 'down');
                    if (nextCell) this.selectCell(nextCell);
                    else {
                        const nextPath = this.findAdjacentCellPath(activeCell, 'down');
                        if (nextPath) this.selectCellByPath(nextPath);
                    }
                    return;
                }

                if (e.key === 'Tab') {
                    e.preventDefault();
                    const nextCell = this.findAdjacentCell(activeCell, e.shiftKey ? 'left' : 'right');
                    if (nextCell) this.selectCell(nextCell);
                    return;
                }

                const direction = keyToDirection[e.key];
                if (!direction) return;
                e.preventDefault();
                const nextCell = this.findAdjacentCell(activeCell, direction);
                if (nextCell) this.selectCell(nextCell);
                else if (direction === 'up' || direction === 'down') {
                    const nextPath = this.findAdjacentCellPath(activeCell, direction);
                    if (nextPath) this.selectCellByPath(nextPath);
                }
            },

            handleTableHover(e) {
                const cell = this.getSelectableCellFromTarget(e.target);
                if (this.isFillDragging && this.fillSourceRect && cell) {
                    const target = this.getCellCoordinates(cell);
                    if (target && target.table === this.fillSourceRect.table) {
                        const rowStart = Math.min(this.fillSourceRect.rowStart, target.rowIndex);
                        const rowEnd = Math.max(this.fillSourceRect.rowEnd, target.rowIndex);
                        const colStart = Math.min(this.fillSourceRect.colStart, target.colIndex);
                        const colEnd = Math.max(this.fillSourceRect.colEnd, target.colIndex);
                        const previewStart = this.getCellByCoordinates(this.fillSourceRect.table, rowStart, colStart);
                        const previewEnd = this.getCellByCoordinates(this.fillSourceRect.table, rowEnd, colEnd);
                        if (previewStart && previewEnd) {
                            this.selectRange(previewStart, previewEnd);
                        }
                    }
                    return;
                }
                if (this.isMouseSelecting && this.selectionAnchorCell && cell) {
                    if (cell !== this.selectionAnchorCell) {
                        this.mouseSelectionMoved = true;
                    }
                    this.selectRange(this.selectionAnchorCell, cell);
                    return;
                }
                this.setHoveredCell(cell);
            },

            updateCanvasPanReady(e) {
                this.isCtrlPressed = !!(e.ctrlKey || e.metaKey);
                const tableView = document.getElementById('tableView');
                if (!tableView) return;
                tableView.classList.toggle('ctrl-pan-ready', this.isCtrlPressed && !this.canvasPanState);
                if (!this.isCtrlPressed && this.canvasPanState) this.finishCanvasPan();
            },

            isCanvasPanTarget(target) {
                if (!target || this.editingCell || this.editingHeader) return false;
                return !target.closest('button, input, textarea, select, [contenteditable="plaintext-only"], .selection-fill-handle, .col-resizer, .drag-handle, .nested-toggle, .nested-hint-btn, .context-menu, .json-editor-shell, .monaco-editor');
            },

            startCanvasPan(e) {
                const tableView = document.getElementById('tableView');
                if (!tableView) return false;
                this.canvasPanState = {
                    startX: e.clientX,
                    startY: e.clientY,
                    startScrollLeft: tableView.scrollLeft,
                    startScrollTop: tableView.scrollTop,
                    moved: false,
                };
                tableView.classList.remove('ctrl-pan-ready');
                tableView.classList.add('is-canvas-panning');
                window.getSelection()?.removeAllRanges();
                e.preventDefault();
                return true;
            },

            handleCanvasPanMove(e) {
                if (!this.canvasPanState) return false;
                const tableView = document.getElementById('tableView');
                if (!tableView) return false;
                const deltaX = e.clientX - this.canvasPanState.startX;
                const deltaY = e.clientY - this.canvasPanState.startY;
                if (!this.canvasPanState.moved && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
                    this.canvasPanState.moved = true;
                }
                tableView.scrollLeft = this.canvasPanState.startScrollLeft - deltaX;
                tableView.scrollTop = this.canvasPanState.startScrollTop - deltaY;
                this.updateThumbnailViewport();
                this.updateThumbnailPosition();
                this.updateMiniMapPosition();
                e.preventDefault();
                return true;
            },

            finishCanvasPan() {
                const tableView = document.getElementById('tableView');
                if (this.canvasPanState?.moved) {
                    this.suppressNextClickSelection = true;
                }
                this.canvasPanState = null;
                if (tableView) {
                    tableView.classList.remove('is-canvas-panning');
                    tableView.classList.toggle('ctrl-pan-ready', this.isCtrlPressed);
                }
            },

            handleDocumentMouseMove(e) {
                if (this.canvasPanState) {
                    this.handleCanvasPanMove(e);
                    return;
                }
                if (!this.isMouseSelecting || !this.selectionAnchorCell || this.isFillDragging) return;
                const target = document.elementFromPoint(e.clientX, e.clientY);
                const cell = this.getSelectableCellFromTarget(target);
                if (!cell) return;
                e.preventDefault();
                window.getSelection()?.removeAllRanges();
                if (cell !== this.selectionAnchorCell) {
                    this.mouseSelectionMoved = true;
                    this.suppressNextClickSelection = true;
                }
                this.selectRange(this.selectionAnchorCell, cell);
            },

            handleTableMouseDown(e) {
                if (e.button !== 0) return;
                if ((e.ctrlKey || e.metaKey) && this.isCanvasPanTarget(e.target)) {
                    if (this.startCanvasPan(e)) return;
                }
                if (e.target.closest('.selection-fill-handle')) {
                    if (this.editingCell) this.finishEdit(this.editingCell);
                    if (!this.selectedCell) return;
                    e.preventDefault();
                    e.stopPropagation();
                    this.isFillDragging = true;
                    this.fillSourceMatrix = this.getSelectionMatrix();
                    this.fillSourceRect = this.getRangeRectFromCells(this.getSelectedCells());
                    return;
                }
                if (e.target.closest('button')) return;
                const cell = this.getSelectableCellFromTarget(e.target);
                if (!cell) return;

                if (this.editingCell && this.editingCell !== cell) {
                    this.finishEdit(this.editingCell);
                }

                this.isMouseSelecting = true;
                this.mouseSelectionMoved = false;
                this.selectionAnchorCell = e.shiftKey && this.selectionAnchorCell ? this.selectionAnchorCell : cell;
                if (e.shiftKey && this.selectionAnchorCell) {
                    this.selectRange(this.selectionAnchorCell, cell);
                } else {
                    this.selectCell(cell);
                }
            },

            finishMouseSelection() {
                if (this.canvasPanState) {
                    this.finishCanvasPan();
                    return;
                }
                if (this.isFillDragging) {
                    this.applyFillDrag();
                    this.isFillDragging = false;
                    this.fillSourceMatrix = null;
                    this.fillSourceRect = null;
                    return;
                }
                if (this.isMouseSelecting && this.mouseSelectionMoved) {
                    this.suppressNextClickSelection = true;
                }
                this.isMouseSelecting = false;
            },

            handleTableClickCapture(e) {
                if (!this.suppressNextClickSelection) return;
                e.preventDefault();
                e.stopPropagation();
                this.suppressNextClickSelection = false;
                this.mouseSelectionMoved = false;
            },

            handleTableDoubleClick(e) {
                const header = this.getHeaderFromTarget(e.target);
                if (header && !e.target.closest('.nested-toggle, .nested-hint-btn, .col-resizer, .drag-handle')) {
                    e.preventDefault();
                    this.beginHeaderEdit(header, { clientX: e.clientX, clientY: e.clientY });
                    return;
                }

                const cell = this.getSelectableCellFromTarget(e.target);
                if (!cell) return;
                this.selectCell(cell);
                if (this.isEditableCell(cell)) {
                    this.beginEdit(cell, { clientX: e.clientX, clientY: e.clientY });
                }
            },

            // ===== Table Click =====
            handleTableClick(e) {
                if (this.editingHeader && !e.target.closest('th.header-editing')) {
                    this.finishHeaderEdit(true);
                }

                const columnHeader = this.getSelectableColumnHeaderFromTarget(e.target);
                if (columnHeader) {
                    if (!e.target.closest('.nested-toggle, .nested-hint-btn, .col-resizer, .drag-handle')) {
                        try {
                            const hdr = { path: columnHeader.dataset.headerPath || null, key: columnHeader.dataset.headerKey || null, text: (columnHeader.textContent || '').trim() };
                            console.log('WYSDEBUG headerClick start', { shift: !!e.shiftKey, header: hdr, selectionAnchor: this.selectionAnchorCell ? { ...this.selectionAnchorCell.dataset } : null });
                        } catch (err) { console.log('WYSDEBUG headerClick log error', err && err.message); }

                        // Support Shift+Click on headers to expand column selection ranges
                        if (e.shiftKey && this.selectionAnchorCell) {
                            const table = columnHeader.closest('table.json-table');
                            const headerRow = columnHeader.closest('tr');
                            if (table && headerRow && table.tHead?.rows?.[0]?.contains(columnHeader)) {
                                const headerCells = Array.from(headerRow.children).filter((th) => !th.classList.contains('row-num-header'));
                                const clickedIndex = headerCells.indexOf(columnHeader);
                                const anchorCoords = this.getCellCoordinates(this.selectionAnchorCell);

                                try {
                                    console.log('WYSDEBUG headerShift', { clickedIndex, anchorCoords: anchorCoords ? { rowIndex: anchorCoords.rowIndex, colIndex: anchorCoords.colIndex } : null });
                                } catch (err) { console.log('WYSDEBUG headerShift log error', err && err.message); }

                                // If the anchor is in the same table, use its colIndex as before.
                                let anchorColIndex = null;
                                if (anchorCoords && anchorCoords.table === table) {
                                    anchorColIndex = anchorCoords.colIndex;
                                } else {
                                    // Try to normalize when the current anchor is a container (nested) cell.
                                    try {
                                        const anchorCell = this.selectionAnchorCell;
                                        // If the anchor cell points to a parent path (e.g., an array cell that contains this table),
                                        // try to find the corresponding inner cell inside the clicked table by matching the path prefix.
                                        if (anchorCell && anchorCell.dataset && anchorCell.dataset.path) {
                                            const anchorParentPath = anchorCell.dataset.path;
                                            const rows = Array.from(table.tBodies[0]?.rows || []);
                                            let found = null;
                                            for (const r of rows) {
                                                const cells = this.getRowSelectableCells(r);
                                                for (const c of cells) {
                                                    const p = c.dataset?.path || '';
                                                    if (p && p.indexOf(anchorParentPath + '[') === 0) {
                                                        found = c;
                                                        break;
                                                    }
                                                }
                                                if (found) break;
                                            }
                                            if (found) {
                                                const fcoords = this.getCellCoordinates(found);
                                                if (fcoords && fcoords.table === table) {
                                                    anchorColIndex = fcoords.colIndex;
                                                    console.log('WYSDEBUG anchorNormalizedFromParentPath', { anchorParentPath, anchorColIndex, foundPath: found.dataset.path });
                                                }
                                            }
                                        }

                                        // If we still don't have an anchor column, try to map via the anchor's original table header key.
                                        if (anchorColIndex === null && anchorCoords && anchorCoords.table && typeof anchorCoords.colIndex === 'number') {
                                            try {
                                                const aHeaderRow = anchorCoords.table.tHead?.rows?.[0];
                                                if (aHeaderRow) {
                                                    const aHeaderCells = Array.from(aHeaderRow.children).filter((th) => !th.classList.contains('row-num-header'));
                                                    const aHeader = aHeaderCells[anchorCoords.colIndex];
                                                    const aKey = aHeader ? (aHeader.dataset.headerKey || (aHeader.textContent || '').trim()) : null;
                                                    if (aKey) {
                                                        const matched2 = headerCells.findIndex((th) => (th.dataset.headerKey || '').toString() === aKey.toString());
                                                        if (matched2 >= 0) anchorColIndex = matched2;
                                                        console.log('WYSDEBUG anchorFromOtherTable', { anchorKeyFromOther: aKey, matched: matched2 });
                                                    }
                                                }
                                            } catch (err) {
                                                console.log('WYSDEBUG anchorFromOtherTable log error', err && err.message);
                                            }
                                        }

                                        // If still not matched, fall back to any dataset key on the anchor cell itself.
                                        if (anchorColIndex === null && this.selectionAnchorCell && this.selectionAnchorCell.dataset) {
                                            const anchorKey = this.selectionAnchorCell.dataset.col || this.selectionAnchorCell.dataset.key || this.selectionAnchorCell.dataset.headerKey || null;
                                            if (anchorKey) {
                                                const matched = headerCells.findIndex((th) => (th.dataset.headerKey || '').toString() === anchorKey.toString());
                                                if (matched >= 0) anchorColIndex = matched;
                                                try { console.log('WYSDEBUG anchorKeyMatchFallback', { anchorKey, matched }); } catch (err) { }
                                            }
                                        }

                                        // As a last-ditch fallback, use the last saved header anchor if it belongs to this table.
                                        if (anchorColIndex === null && this._lastHeaderAnchor && this._lastHeaderAnchor.table === table) {
                                            anchorColIndex = this._lastHeaderAnchor.colIndex;
                                            console.log('WYSDEBUG anchorNormalizedFromLastHeaderAnchor', { anchorColIndex });
                                        }
                                    } catch (err) {
                                        console.log('WYSDEBUG anchorNormalizationError', err && err.message);
                                    }
                                }

                                if (anchorColIndex !== null && typeof clickedIndex === 'number' && clickedIndex >= 0) {
                                    const colStart = Math.min(anchorColIndex, clickedIndex);
                                    const colEnd = Math.max(anchorColIndex, clickedIndex);
                                    const startCell = this.getCellByCoordinates(table, 0, colStart);
                                    const endCell = this.getCellByCoordinates(table, table.tBodies[0].rows.length - 1, colEnd);
                                    try { console.log('WYSDEBUG headerShiftRange', { colStart, colEnd, startCellPath: startCell?.dataset?.path || null, endCellPath: endCell?.dataset?.path || null }); } catch (err) { }
                                    if (startCell && endCell) {
                                        this.selectRange(startCell, endCell);
                                        return;
                                    }
                                }
                            }
                        }
                        this.selectColumnByHeader(columnHeader);
                    }
                    return;
                }

                const cell = this.getSelectableCellFromTarget(e.target);
                if (!cell) {
                    if (!e.target.closest('.context-menu')) this.clearSelection();
                    return;
                }

                if (this.suppressNextClickSelection) {
                    this.suppressNextClickSelection = false;
                    return;
                }

                if ((e.ctrlKey || e.metaKey) && cell?.dataset?.path !== undefined) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.selectCell(cell);
                    if (this.inputPanelMode !== 'hidden' && !this.focusJsonPath(cell.dataset.path || '')) {
                        this.setStatus('JSON 编辑器中未找到对应节点', true);
                    }
                    return;
                }

                if (this.editingCell && this.editingCell !== cell && !this.editingCell.contains(e.target)) {
                    this.finishEdit(this.editingCell);
                }

                this.selectCell(cell);
            },

            handleCopy(e) {
                if (this.isJsonEditorTarget(e.target)) return;
                if (this.editingCell) this.finishEdit(this.editingCell);
                if (this.getSelectedCells().length === 0) return;
                const matrix = this.getSelectionMatrix();
                if (matrix.length === 0) return;
                const text = matrix.map((row) => row.join('\t')).join('\n');
                e.preventDefault();
                e.clipboardData.setData('text/plain', text);
                this.setStatus(`已复制 ${matrix.length} 行 ${matrix[0]?.length || 0} 列`);
            },

            handleCut(e) {
                if (this.isJsonEditorTarget(e.target)) return;
                if (this.editingCell) this.finishEdit(this.editingCell);
                if (this.getSelectedCells().length === 0) return;
                const matrix = this.getSelectionMatrix();
                if (matrix.length === 0) return;
                const text = matrix.map((row) => row.join('\t')).join('\n');
                e.preventDefault();
                e.clipboardData.setData('text/plain', text);
                this.applyMatrixToSelection([['']], {
                    preserveSelection: true,
                    statusMessage: `已剪切 ${this.getSelectedCells().length} 个单元格`,
                });
            },

            handlePaste(e) {
                if (this.editingCell) this.finishEdit(this.editingCell);
                if (!this.selectedCell) return;
                const text = e.clipboardData?.getData('text/plain');
                if (!text) return;
                e.preventDefault();
                this.applyMatrixToSelection(this.parseClipboardMatrix(text));
            },

            handleTableContextMenu(e) {
                if (this.editingCell) this.finishEdit(this.editingCell);
                // 保持 corner、header 菜单
                const cornerTh = e.target.closest('th.row-num-header');
                if (cornerTh && cornerTh.closest('table.json-table')) {
                    e.preventDefault();
                    const table = cornerTh.closest('table.json-table');
                    this.showContextMenu(e.clientX, e.clientY, {
                        type: 'corner',
                        tablePath: table.dataset.path || '',
                        isArray: table.dataset.isArray === 'true',
                        tableId: table.dataset.path || ''
                    });
                    return;
                }
                // cell/行号右键已在renderCell和createTable里处理，这里只保留header
                const header = this.getHeaderFromTarget(e.target);
                if (header && !e.target.closest('.nested-toggle, .nested-hint-btn, .col-resizer')) {
                    e.preventDefault();
                    // Pass the actual header element in the state so context actions can deterministically
                    // identify which header/table the menu was opened for (avoids ambiguous queries).
                    const headerTable = header.closest('table.json-table');
                    this.showContextMenu(e.clientX, e.clientY, {
                        type: 'header',
                        path: header.dataset.headerPath || '',
                        key: header.dataset.headerKey || '',
                        headerEl: header,
                        tablePath: headerTable ? headerTable.dataset.path || '' : '',
                    });
                }
            },

            handleContextMenuAction(e) {
                if (this.editingCell) this.finishEdit(this.editingCell);
                const item = e.target.closest('.menu-item[data-action]');
                if (!item || !this.contextMenuState) return;
                e.stopPropagation();
                const action = item.dataset.action;
                const state = this.contextMenuState;
                this.hideContextMenu();

                // Global handler for X9 wrap action (corner or single node)
                if (action === 'wrap-grid-3x3') {
                    if (state?.type === 'corner') {
                        this.wrapNodeInGrid3x3('', this.data);
                    } else {
                        this.wrapNodeInGrid3x3(state?.path || '', state?.value);
                    }
                    return;
                }
                // Insert multiple rows (before) from context menu single-line input
                if (action === 'insert-row-before-confirm' && state.type === 'row' && state.isArrayRow) {
                    const menu = document.getElementById('contextMenu');
                    const input = menu.querySelector('.menu-insert-count[data-for="insert-row-before"]');
                    let count = 1;
                    if (input) {
                        count = Math.floor(Number(input.value) || 1);
                        if (!Number.isFinite(count) || count < 1) count = 1;
                        count = Math.min(count, 500);
                    }
                    const arrPath = state.arrayPath || '';
                    for (let i = 0; i < count; i++) {
                        this.insertRow(arrPath, state.rowIndex, 'before');
                    }
                    this.setStatus(this.getTranslation('insertedRowBefore') ? this.getTranslation('insertedRowBefore').replace('{n}', count).replace('{i}', String(state.rowIndex + 1)) : `Inserted ${count} rows before row ${state.rowIndex + 1}`);
                    return;
                }
                // Insert multiple columns (before) from header numeric input
                if (action === 'insert-column-before-confirm' && state.type === 'header') {
                    const menu = document.getElementById('contextMenu');
                    const input = menu.querySelector('.menu-insert-count[data-for="insert-column-before"]');
                    let count = 1;
                    if (input) {
                        count = Math.floor(Number(input.value) || 1);
                        if (!Number.isFinite(count) || count < 1) count = 1;
                        count = Math.min(count, 100);
                    }
                    for (let i = 0; i < count; i++) {
                        this.insertColumn(state.path || '', state.key || '', 'before');
                    }
                    this.setStatus(this.getTranslation('insertedColumnsBefore') ? this.getTranslation('insertedColumnsBefore').replace('{n}', count).replace('{key}', state.key || '') : `Inserted ${count} columns before ${state.key}`);
                    return;
                }
                // Insert after (multiple)
                if (action === 'insert-row-after-confirm' && state.type === 'row' && state.isArrayRow) {
                    const menu = document.getElementById('contextMenu');
                    const input = menu.querySelector('.menu-insert-count[data-for="insert-row-after"]');
                    let count = 1;
                    if (input) {
                        count = Math.floor(Number(input.value) || 1);
                        if (!Number.isFinite(count) || count < 1) count = 1;
                        count = Math.min(count, 500);
                    }
                    const arrPath = state.arrayPath || '';
                    for (let i = 0; i < count; i++) {
                        this.insertRow(arrPath, state.rowIndex, 'after');
                    }
                    this.setStatus(this.getTranslation('insertedRowAfter') ? this.getTranslation('insertedRowAfter').replace('{n}', count).replace('{i}', String(state.rowIndex + 1)) : `Inserted ${count} rows after row ${state.rowIndex + 1}`);
                    return;
                }
                // Insert multiple columns (after) from header numeric input
                if (action === 'insert-column-after-confirm' && state.type === 'header') {
                    const menu = document.getElementById('contextMenu');
                    const input = menu.querySelector('.menu-insert-count[data-for="insert-column-after"]');
                    let count = 1;
                    if (input) {
                        count = Math.floor(Number(input.value) || 1);
                        if (!Number.isFinite(count) || count < 1) count = 1;
                        count = Math.min(count, 100);
                    }
                    for (let i = 0; i < count; i++) {
                        this.insertColumn(state.path || '', state.key || '', 'after');
                    }
                    this.setStatus(this.getTranslation('insertedColumnsAfter') ? this.getTranslation('insertedColumnsAfter').replace('{n}', count).replace('{key}', state.key || '') : `Inserted ${count} columns after ${state.key}`);
                    return;
                }

                // Duplicate current row X times (insert copies after)
                if (action === 'duplicate-row-confirm' && state.type === 'row' && state.isArrayRow) {
                    const menu = document.getElementById('contextMenu');
                    const input = menu.querySelector('.menu-insert-count[data-for="duplicate-row"]');
                    let count = 1;
                    if (input) {
                        count = Math.floor(Number(input.value) || 1);
                        if (!Number.isFinite(count) || count < 1) count = 1;
                        count = Math.min(count, 500);
                    }
                    const arrPath = state.arrayPath || '';
                    const arr = this.getValueAtPath(this.data, arrPath);
                    if (!Array.isArray(arr)) return this.setStatus(this.getTranslation('pathNotArray'), true);
                    const src = this.cloneJsonValue(arr[state.rowIndex]);
                    this.pushUndo();
                    for (let i = 0; i < count; i++) {
                        arr.splice(state.rowIndex + 1 + i, 0, this.cloneJsonValue(src));
                    }
                    this.ensurePaginationIncludesIndex(arrPath || '', state.rowIndex + 1, arr.length);
                    this.pendingCellSelection = this.getArrayItemFocusPath(arrPath, state.rowIndex + 1, arr[state.rowIndex + 1]);
                    this.nestedStates = {};
                    this.render();
                    this.setStatus(this.getTranslation('duplicatedRow') ? this.getTranslation('duplicatedRow').replace('{n}', count).replace('{i}', String(state.rowIndex + 1)) : `Duplicated ${count} rows after row ${state.rowIndex + 1}`);
                    return;
                }
                // Duplicate column X times
                if (action === 'duplicate-column-confirm' && state.type === 'header') {
                    const menu = document.getElementById('contextMenu');
                    const input = menu.querySelector('.menu-insert-count[data-for="duplicate-column"]');
                    let count = 1;
                    if (input) {
                        count = Math.floor(Number(input.value) || 1);
                        if (!Number.isFinite(count) || count < 1) count = 1;
                        count = Math.min(count, 100);
                    }
                    this.duplicateColumn(state.path || '', state.key || '', count, 'after');
                    return;
                }

                if (action === 'delete-selected-rows') {
                    this.deleteSelectedRows();
                    return;
                }
                if (action === 'delete-selected-columns') {
                    this.deleteSelectedColumns();
                    return;
                }
                const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

                // cell/row类型切换
                const convertValue = (val, type) => {
                    if (type === 'array') return Array.isArray(val) ? val : [val];
                    if (type === 'object') {
                        if (val && typeof val === 'object' && !Array.isArray(val)) return val;
                        if (Array.isArray(val)) {
                            // 若首元素为object直接用，否则包value
                            const first = val.length > 0 ? val[0] : null;
                            if (first && typeof first === 'object' && !Array.isArray(first)) return first;
                            return { value: first ?? null };
                        }
                        return { value: val };
                    }
                    if (type === 'single') {
                        // 递归只保留第一个元素/字段的值
                        if (Array.isArray(val)) {
                            if (val.length === 0) return null;
                            return convertValue(val[0], 'single');
                        }
                        if (val && typeof val === 'object') {
                            const keys = Object.keys(val);
                            if (keys.length === 0) return null;
                            return convertValue(val[keys[0]], 'single');
                        }
                        return val;
                    }
                    if (type === 'string') return val == null ? '' : String(val);
                    if (type === 'number') return Number(val) || 0;
                    if (type === 'boolean') return Boolean(val);
                    if (type === 'null') return null;
                    return val;
                };

                if (state.type === 'cell' || state.type === 'row') {
                    const path = state.path;
                    if (action === 'open-as-json') {
                        this.openJsonStringInNewPage(state.value, path || '');
                        return;
                    }
                    if (action === 'convert-to-json') {
                        const nextValue = this.convertNodeToJson(state.value);
                        if (nextValue === null) {
                            this.setStatus(this.getTranslation('convertToJsonFailed'), true);
                            return;
                        }
                        this.pushUndo();
                        this.setValueAtPath(this.data, path || '', nextValue);
                        this.render();
                        this.setStatus(this.getTranslation('convertedToJson', { count: 1 }));
                        return;
                    }
                    if (action === 'convert-to-json-string') {
                        const nextValue = this.convertNodeToJsonString(state.value);
                        if (nextValue === null) {
                            this.setStatus(this.getTranslation('convertToJsonStringFailed'), true);
                            return;
                        }
                        this.pushUndo();
                        this.setValueAtPath(this.data, path || '', nextValue);
                        this.render();
                        this.setStatus(this.getTranslation('convertedToJsonString', { count: 1 }));
                        return;
                    }
                    if (state.type === 'cell' && !path) return;
                    if (action === 'focus-node') {
                        this.setFocusPath(path || '');
                        return;
                    }
                    if (action === 'insert-row-before' && state.type === 'row' && state.isArrayRow) {
                        this.insertRow(state.arrayPath || '', state.rowIndex, 'before');
                        return;
                    }
                    if (action === 'insert-row-after' && state.type === 'row' && state.isArrayRow) {
                        this.insertRow(state.arrayPath || '', state.rowIndex, 'after');
                        return;
                    }
                    if (action === 'delete-current-row' && state.type === 'row') {
                        if (state.isArrayRow) {
                            this.deleteRow(state.arrayPath || '', state.rowIndex);
                        } else {
                            this.pushUndo();
                            this.setValueAtPath(this.data, state.path || '', this.nullAsString ? '' : null);
                            this.pendingCellSelection = null;
                            this.render();
                            this.setStatus(state.path ? '已将当前对象节点置为 null' : '已将根节点置为 null');
                        }
                        return;
                    }
                    if (action === 'add-child-item') {
                        this.addRow(path);
                        return;
                    }
                    if (action === 'add-child-field') {
                        this.addColumn(path);
                        return;
                    }
                    this.pushUndo();
                    let newValue;
                    if (action.startsWith('convert-to-')) {
                        const type = action.replace('convert-to-', '');
                        newValue = convertValue(state.value, type);
                        this.setValueAtPath(this.data, path, newValue);
                        this.render();
                        this.setStatus(`已将节点 ${path} 改为 ${type}`);
                        return;
                    }
                }

                // 其它原有逻辑...
                if (action === 'delete-row') {
                    this.deleteRow(state.arrayPath || '', state.rowIndex);
                    return;
                }
                if (action === 'insert-column-before') {
                    this.insertColumn(state.path || '', state.key || '', 'before');
                    return;
                }
                if (action === 'insert-column-after') {
                    this.insertColumn(state.path || '', state.key || '', 'after');
                    return;
                }
                if (action === 'delete-column') {
                    // If there's a rectangular multi-column selection in the same table as the header,
                    // prefer deleting the selected columns as a batch instead of single-column delete.
                    try {
                        const sel = this.getSelectedCells();
                        console.log('WYSDEBUG deleteColumn invoked', { statePath: state?.path, stateKey: state?.key, selectedCount: sel?.length || 0 });
                        if (sel && sel.length > 1) {
                            const coords = sel.map((c) => this.getCellCoordinates(c)).filter(Boolean);
                            if (coords.length > 0) {
                                const selTable = coords[0].table;
                                const selTablePath = selTable?.dataset?.path || '';
                                // Prefer locating the header's table by path, fall back to headerEl or dataset search
                                let headerTable = null;
                                try {
                                    if (state && state.path !== undefined && state.path !== null) {
                                        headerTable = document.querySelector(`table.json-table[data-path="${state.path}"]`);
                                    }
                                } catch (err) { /* ignore selector issues */ }
                                if (!headerTable) {
                                    const headerElCandidate = (state && state.headerEl) ? state.headerEl : Array.from(document.querySelectorAll('th')).find((th) => ((th.dataset.headerPath || '') === (state.path || '')) && ((th.dataset.headerKey || '') === (state.key || '')));
                                    headerTable = headerElCandidate ? headerElCandidate.closest('table.json-table') : null;
                                }
                                console.log('WYSDEBUG deleteColumn context', { headerTable: !!headerTable, selTable: !!selTable });
                                // Prefer comparing canonical table paths when available
                                const headerTablePath = state?.tablePath || (headerTable ? headerTable.dataset.path || '' : '');
                                console.log('WYSDEBUG deleteColumn header/sel paths', { headerTablePath, selTablePath });
                                if (headerTablePath && selTablePath && headerTablePath === selTablePath) {
                                    console.log('WYSDEBUG deleteColumn -> deleteSelectedColumns();', { keys: sel.map(c => c.dataset.path || c.dataset.key || c.dataset.col) });
                                    this.deleteSelectedColumns();
                                    return;
                                }
                            }
                        }
                    } catch (err) { console.log('WYSDEBUG deleteColumn error', err && err.message, err && err.stack); }
                    this.deleteColumn(state.path || '', state.key || '');
                    return;
                }
                if (action === 'set-object-null') {
                    this.pushUndo();
                    this.setValueAtPath(this.data, state.path || '', this.nullAsString ? '' : null);
                    this.render();
                    this.setStatus(this.getTranslation('objectSetToNull'));
                    return;
                }
                // 保持原有corner批量转换
                const getContextTargetPaths = () => {
                    const selectedCells = this.getSelectedCells();
                    // If invoked from the table corner and user requested a conversion action,
                    // treat the whole table (state.tablePath) as the target regardless of current cell selection.
                    if (state?.type === 'corner' && action && action.startsWith('convert-to-')) {
                        if (state?.tablePath !== null && state?.tablePath !== undefined) {
                            return [state.tablePath];
                        }
                    }
                    // 保留空字符串路径（表示 root），但过滤掉 null/undefined
                    let selectedPaths = Array.from(new Set(selectedCells
                        .map((cell) => cell.dataset.path || cell.querySelector('.cell-value')?.dataset.path || '')
                        .filter((p) => p !== null && p !== undefined)));
                    // 如果没有选择，则回退到 tablePath；接受空字符串 tablePath
                    if (selectedPaths.length === 0 && (state?.tablePath !== null && state?.tablePath !== undefined)) {
                        selectedPaths = [state.tablePath];
                    }
                    const sorted = [...selectedPaths].sort((a, b) => a.length - b.length);
                    const targetPaths = [];
                    for (const path of sorted) {
                        // 仅跳过 null/undefined，允许空字符串作为 root 路径
                        if (path === null || path === undefined) continue;
                        const covered = targetPaths.some((parent) => path === parent || path.startsWith(parent + '.') || path.startsWith(parent + '['));
                        if (!covered) targetPaths.push(path);
                    }
                    return targetPaths;
                };
                const convertNodeValue = (currentValue, targetType) => convertValue(currentValue, targetType);
                if (action === 'clear-selection') {
                    const targetPaths = getContextTargetPaths();
                    if (targetPaths.length === 0) {
                        this.setStatus('当前没有选区可删除', true);
                        return;
                    }
                    this.pushUndo();
                    for (const path of targetPaths) {
                        this.setValueAtPath(this.data, path, null);
                    }
                    this.render();
                    this.setStatus(`已删除 ${targetPaths.length} 个选区节点（置为 null）`);
                    return;
                }
                if (action === 'convert-to-array' || action === 'convert-to-object' || action === 'convert-to-single') {
                    const targetType = action.replace('convert-to-', '');
                    const targetPaths = getContextTargetPaths();
                    if (targetPaths.length === 0) {
                        this.setStatus('当前没有选区可转换', true);
                        return;
                    }
                    this.pushUndo();
                    for (const path of targetPaths) {
                        const currentValue = this.getValueAtPath(this.data, path);
                        const nextValue = convertNodeValue(currentValue, targetType);
                        this.setValueAtPath(this.data, path, nextValue);
                    }
                    this.render();
                    this.setStatus(`已将 ${targetPaths.length} 个节点改为 ${targetType}`);
                    return;
                }
                if (action === 'convert-to-json' || action === 'convert-to-json-string') {
                    const targetPaths = getContextTargetPaths();
                    if (targetPaths.length === 0) {
                        this.setStatus(action === 'convert-to-json' ? this.getTranslation('convertToJsonFailed') : this.getTranslation('convertToJsonStringFailed'), true);
                        return;
                    }
                    const updates = [];
                    for (const path of targetPaths) {
                        const currentValue = this.getValueAtPath(this.data, path);
                        const nextValue = action === 'convert-to-json'
                            ? this.convertNodeToJson(currentValue)
                            : this.convertNodeToJsonString(currentValue);
                        if (nextValue !== null) updates.push({ path, value: nextValue });
                    }
                    if (updates.length === 0) {
                        this.setStatus(action === 'convert-to-json' ? this.getTranslation('convertToJsonFailed') : this.getTranslation('convertToJsonStringFailed'), true);
                        return;
                    }
                    this.pushUndo();
                    for (const update of updates) {
                        this.setValueAtPath(this.data, update.path, update.value);
                    }
                    this.render();
                    this.setStatus(this.getTranslation(action === 'convert-to-json' ? 'convertedToJson' : 'convertedToJsonString', { count: updates.length }));
                    return;
                }
            },

            // ===== Context Menu =====
            showContextMenu(x, y, state) {
                const menu = document.getElementById('contextMenu');
                this.contextMenuState = state;
                const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
                const getNodeType = (value) => {
                    if (Array.isArray(value)) return 'array';
                    if (value !== null && typeof value === 'object') return 'object';
                    if (value === null) return 'null';
                    if (typeof value === 'string') return 'string';
                    if (typeof value === 'number') return 'number';
                    if (typeof value === 'boolean') return 'boolean';
                    return 'single';
                };
                // cell/row类型切换菜单
                if (state?.type === 'cell' || state?.type === 'row') {
                    let extraActions = '';
                    const isRootObjectRow = state?.type === 'row' && !state?.isArrayRow && !state?.path;
                    const currentType = getNodeType(state?.value);
                    const typeLabels = {
                        array: this.getTranslation('type.array') || 'Array',
                        object: this.getTranslation('type.object') || 'Object',
                        single: this.getTranslation('type.single') || 'Single',
                        string: this.getTranslation('type.string') || 'String',
                        number: this.getTranslation('type.number') || 'Number',
                        boolean: this.getTranslation('type.boolean') || 'Boolean',
                        null: this.getTranslation('type.null') || 'Null',
                    };
                    const applicableTypeTargets = {
                        array: ['object', 'single', 'string', 'number', 'boolean', 'null'],
                        object: ['array', 'single', 'string', 'number', 'boolean', 'null'],
                        string: ['array', 'object', 'number', 'boolean', 'null'],
                        number: ['array', 'object', 'string', 'boolean', 'null'],
                        boolean: ['array', 'object', 'string', 'number', 'null'],
                        null: ['array', 'object', 'string', 'number', 'boolean'],
                        single: ['array', 'object', 'string', 'number', 'boolean', 'null'],
                    };
                    const typeActions = (applicableTypeTargets[currentType] || ['array', 'object', 'string', 'number', 'boolean', 'null'])
                        .map((type) => [type, typeLabels[type]]);
                    if (state?.type === 'row' && state?.isArrayRow && typeof state?.rowIndex === 'number' && state?.arrayPath !== undefined) {
                        // Single-line insert/duplicate UI: inputs for before/after/duplicate
                        extraActions += `
                    <div class="divider"></div>
                    <div class="menu-item" data-action="insert-row-before-confirm">
                        <span class="menu-label">${this.getTranslation('insertRowBefore')}</span>
                        <input type="number" class="menu-insert-count" data-for="insert-row-before" value="1" min="1" style="width:64px;margin-left:8px" />
                    </div>
                    <div class="menu-item" data-action="insert-row-after-confirm">
                        <span class="menu-label">${this.getTranslation('insertRowAfter')}</span>
                        <input type="number" class="menu-insert-count" data-for="insert-row-after" value="1" min="1" style="width:64px;margin-left:8px" />
                    </div>
                    <div class="menu-item" data-action="duplicate-row-confirm">
                        <span class="menu-label">${this.getTranslation('duplicateRow')}</span>
                        <input type="number" class="menu-insert-count" data-for="duplicate-row" value="1" min="1" style="width:64px;margin-left:8px" />
                    </div>
                    <div class="menu-item" data-action="delete-current-row">${this.getTranslation('deleteCurrentRow')}</div>
                `;
                    } else if (state?.type === 'row' && !state?.isArrayRow) {
                        extraActions += `
                    <div class="divider"></div>
                    <div class="menu-item" data-action="delete-current-row">${isRootObjectRow ? this.getTranslation('deleteRootNode') : this.getTranslation('deleteCurrentNode')}</div>
                `;
                    }
                    if (Array.isArray(state?.value)) {
                        extraActions += `<div class="divider"></div><div class="menu-item" data-action="add-child-item">${this.getTranslation('addChildItem')}</div>`;
                    } else if (isPlainObject(state?.value)) {
                        extraActions += `<div class="divider"></div><div class="menu-item" data-action="add-child-field">${isRootObjectRow ? this.getTranslation('addFieldRoot') : this.getTranslation('addFieldCurrent')}</div>`;
                    }
                    if (state?.path) {
                        extraActions += `<div class="divider"></div><div class="menu-item" data-action="focus-node">${this.getTranslation('focusNode')}</div>`;
                    }

                    // If a rectangular selection exists and the clicked point is inside the same table,
                    // offer batch delete actions for rows/columns.
                    try {
                        const sel = this.getSelectedCells();
                        if (sel && sel.length > 1) {
                            const clickedEl = document.elementFromPoint(x, y);
                            const clickedTable = clickedEl?.closest?.('table.json-table');
                            const selTables = new Set(sel.map((c) => c.closest('table.json-table')));
                            if (clickedTable && selTables.has(clickedTable)) {
                                extraActions += `\n                    <div class="divider"></div>\n                    <div class="menu-item" data-action="delete-selected-rows">${this.getTranslation('deleteSelectedRows') || '删除选中行'}</div>\n                    <div class="menu-item" data-action="delete-selected-columns">${this.getTranslation('deleteSelectedColumns') || '删除选中列'}</div>`;
                            }
                        }
                    } catch (err) { /* ignore */ }
                    if (state?.path !== undefined && state?.path !== null) {
                        extraActions += `
                    <div class="divider"></div>
                    <div class="menu-item" data-action="wrap-grid-3x3">X 9</div>
                `;
                    }
                    if (this.canOpenAsJson(state?.value)) {
                        extraActions += `<div class="divider"></div><div class="menu-item" data-action="open-as-json">${this.getTranslation('openAsJson')}</div>`;
                    }
                    if (this.canOpenAsJson(state?.value)) {
                        extraActions += `<div class="menu-item" data-action="convert-to-json">${this.getTranslation('convertToJson')}</div>`;
                    }
                    if (this.canConvertJsonString(state?.value)) {
                        extraActions += `<div class="divider"></div><div class="menu-item" data-action="convert-to-json-string">${this.getTranslation('convertToJsonString')}</div>`;
                    }
                    menu.innerHTML = `
                ${typeActions.map(([type, label]) => `<div class="menu-item" data-action="convert-to-${type}">${this.getTranslation('convertType')} → ${label}</div>`).join('')}
                ${extraActions}
            `;
                } else if (state?.type === 'delete-row') {
                    menu.innerHTML = `<div class="menu-item" data-action="delete-row">${this.getTranslation('deleteRow', { n: state.rowIndex + 1 })}</div>`;
                } else if (state?.type === 'header') {
                    // Header menu: allow specifying a count for insert/duplicate operations
                    // Also offer batch delete when a rectangular selection exists in the same table
                    let extraHeaderActions = '';
                    let hasBatchDelete = false;
                    try {
                        const sel = this.getSelectedCells();
                        if (sel && sel.length > 1) {
                            const clickedEl = document.elementFromPoint(x, y);
                            const clickedTable = clickedEl?.closest?.('table.json-table');
                            const selTablesArr = sel.map((c) => c.closest('table.json-table')).filter(Boolean);
                            const selTables = new Set(selTablesArr);
                            const clickedTablePath = clickedTable ? clickedTable.dataset.path || '' : '';
                            const selTablePaths = selTablesArr.map(t => t ? t.dataset.path || '' : '');
                            console.log('WYSDEBUG showContextMenu header selection', { selCount: sel.length, clickedTablePath, selTablePaths });
                            if (clickedTable && selTables.has(clickedTable)) {
                                hasBatchDelete = true;
                                extraHeaderActions = `\n                    <div class="divider"></div>\n                    <div class="menu-item" data-action="delete-selected-rows">${this.getTranslation('deleteSelectedRows') || '删除选中行'}</div>\n                    <div class="menu-item" data-action="delete-selected-columns">${this.getTranslation('deleteSelectedColumns') || '删除选中列'}</div>`;
                            }
                        }
                    } catch (err) { console.log('WYSDEBUG showContextMenu header error', err && err.message); }

                    const deleteColumnHtml = hasBatchDelete ? '' : `\n                <div class="divider"></div>\n                <div class="menu-item" data-action="delete-column">${this.getTranslation('deleteColumn', { key: state.key })}</div>`;

                    menu.innerHTML = `
                <div class="menu-item" data-action="insert-column-before-confirm">
                    <span class="menu-label">${this.getTranslation('insertColumnBefore', { key: state.key })}</span>
                    <input type="number" class="menu-insert-count" data-for="insert-column-before" value="1" min="1" style="width:64px;margin-left:8px" />
                </div>
                <div class="menu-item" data-action="insert-column-after-confirm">
                    <span class="menu-label">${this.getTranslation('insertColumnAfter', { key: state.key })}</span>
                    <input type="number" class="menu-insert-count" data-for="insert-column-after" value="1" min="1" style="width:64px;margin-left:8px" />
                </div>
                <div class="menu-item" data-action="duplicate-column-confirm">
                    <span class="menu-label">${this.getTranslation('duplicateColumn') || '复制列'}</span>
                    <input type="number" class="menu-insert-count" data-for="duplicate-column" value="1" min="1" style="width:64px;margin-left:8px" />
                </div>
                ${extraHeaderActions}
                ${deleteColumnHtml}
            `;
                } else if (state?.type === 'set-object-null') {
                    menu.innerHTML = `<div class="menu-item" data-action="set-object-null">${this.getTranslation('setObjectNull')}</div>`;
                } else if (state?.type === 'corner') {
                    // Per-table corner: delete selected nodes by setting them to null
                    const cornerValue = this.getValueAtPath(this.data, state.tablePath || '');
                    const cornerTypeActions = state?.isArray
                        ? `
                <div class="menu-item" data-action="convert-to-object">${this.getTranslation('convertType')} → ${this.getTranslation('type.object')}</div>
                <div class="menu-item" data-action="convert-to-single">${this.getTranslation('convertType')} → ${this.getTranslation('type.single')}</div>
                `
                        : `
                <div class="menu-item" data-action="convert-to-array">${this.getTranslation('convertType')} → ${this.getTranslation('type.array')}</div>
                <div class="menu-item" data-action="convert-to-single">${this.getTranslation('convertType')} → ${this.getTranslation('type.single')}</div>
                `;
                    const cornerJsonActions = `
                ${this.canOpenAsJson(cornerValue) ? `<div class="menu-item" data-action="convert-to-json">${this.getTranslation('convertToJson')}</div>` : ''}
                ${this.canConvertJsonString(cornerValue) ? `<div class="menu-item" data-action="convert-to-json-string">${this.getTranslation('convertToJsonString')}</div>` : ''}
                `;
                    menu.innerHTML = `
                ${cornerTypeActions}
                ${cornerJsonActions.trim() ? `<div class="divider"></div>${cornerJsonActions}` : ''}
                <div class="divider"></div>
                <div class="menu-item" data-action="wrap-grid-3x3">X 9</div>
                <div class="divider"></div>
                <div class="menu-item" data-action="clear-selection">${this.getTranslation('clearSelectionNodes')}</div>
            `;
                } else {
                    menu.innerHTML = '';
                }
                // Make menu visible first so we can measure its size
                menu.classList.add('show');

                // Compute menu position so it won't be clipped by viewport edges
                try {
                    // Measure
                    const rect = menu.getBoundingClientRect();
                    const mw = rect.width || menu.offsetWidth;
                    const mh = rect.height || menu.offsetHeight;
                    const vw = window.innerWidth || document.documentElement.clientWidth;
                    const vh = window.innerHeight || document.documentElement.clientHeight;
                    let left = x;
                    let top = y;
                    // If not enough space below, place above
                    if (y + mh > vh) {
                        top = y - mh;
                        if (top < 0) top = Math.max(0, vh - mh);
                    }
                    // If overflowing right, shift left
                    if (x + mw > vw) {
                        left = x - mw;
                        if (left < 0) left = 0;
                    }
                    menu.style.left = left + 'px';
                    menu.style.top = top + 'px';
                } catch (err) {
                    // fallback to requested coordinates
                    menu.style.left = x + 'px';
                    menu.style.top = y + 'px';
                }

                // Attach behaviors for all numeric inputs inside the menu
                try {
                    const inputs = menu.querySelectorAll('.menu-insert-count');
                    inputs.forEach((input) => {
                        input.addEventListener('mousedown', (ev) => ev.stopPropagation());
                        input.addEventListener('click', (ev) => ev.stopPropagation());
                        input.addEventListener('focus', (ev) => { try { ev.target.select(); } catch (e) { } });
                        input.addEventListener('keydown', (ev) => {
                            if (ev.key === 'Enter') {
                                ev.preventDefault();
                                const forAttr = input.dataset.for;
                                const actionName = forAttr ? (forAttr + '-confirm') : null;
                                if (actionName) {
                                    const rowItem = menu.querySelector('.menu-item[data-action="' + actionName + '"]');
                                    if (rowItem) rowItem.click();
                                }
                            }
                            if (ev.key === 'Escape') {
                                ev.preventDefault();
                                this.hideContextMenu();
                            }
                        });
                    });
                } catch (err) { /* ignore */ }
            },

            // ===== Null Utilities =====
            clearAllNulls() {
                if (!this.data) return this.setStatus('没有数据可操作', true);
                this.pushUndo();
                const replace = (node) => {
                    if (node === null) return '';
                    if (Array.isArray(node)) {
                        for (let i = 0; i < node.length; i++) {
                            node[i] = replace(node[i]);
                        }
                        return node;
                    }
                    if (typeof node === 'object') {
                        for (const k of Object.keys(node)) {
                            node[k] = replace(node[k]);
                        }
                        return node;
                    }
                    return node;
                };
                replace(this.data);
                this.render();
                this.setStatus('已将所有 null 转为空字符串');
            },

            hideContextMenu() {
                const menu = document.getElementById('contextMenu');
                menu.classList.remove('show');
                this.contextMenuState = null;
            },
        };

        // Initialize
        // Expose App early for debugging; run init in try/catch so init errors don't prevent global access
        window.App = App;
        try {
            App.init();
        } catch (err) {
            console.error('WYSDEBUG App.init() failed', err && err.message);
            try { if (window.__WYS_DOM_LOGS) window.__WYS_DOM_LOGS.push({ t: Date.now(), text: `App.init failed: ${err && err.message}` }); } catch (e) {}
        }
        // Small on-page debug panel and console.log mirror for easier diagnosis
        (function () {
            try {
                const dbg = document.createElement('div');
                dbg.id = 'wys-debug';
                dbg.style.cssText = 'position:fixed;right:8px;bottom:8px;max-height:30vh;overflow:auto;z-index:2147483647;background:rgba(0,0,0,0.75);color:#fff;padding:8px;font-size:12px;border-radius:6px;font-family:monospace;width:360px';
                document.body.appendChild(dbg);
            } catch (e) { /* ignore */ }
            try {
                window.__WYS_DOM_LOGS = [];
                const _origLog = console.log.bind(console);
                console.log = function (...args) {
                    try {
                        const text = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
                        window.__WYS_DOM_LOGS.push({ t: Date.now(), text });
                        const el = document.getElementById('wys-debug');
                        if (el) {
                            const p = document.createElement('div');
                            p.textContent = new Date().toISOString() + ' ' + text;
                            el.appendChild(p);
                            if (el.childNodes.length > 300) el.removeChild(el.firstChild);
                        }
                    } catch (e) { }
                    _origLog(...args);
                };
            } catch (e) { /* ignore */ }
        })();
    