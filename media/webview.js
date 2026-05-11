// ============================================================
// wysJSON Webview - VS Code Extension Integration
// Adapted from index.html standalone editor
// ============================================================
const vscode = acquireVsCodeApi();
// ============================================================
// wysJSON - Nested JSON Table Editor
// Designed to be portable to VS Code Extension
// ============================================================

const App = {
  uiStateStorageKey: "wysjson.ui-state.v1",
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
  editingHeader: null,
  pendingHeaderEdit: null,
  pendingCellSelection: null,
  contextMenuState: null,
  dragState: null,
  focusPath: "",
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
  editorScale: 1,
  nullAsString: true,
  model: null,
  modelNodeMap: {},

  // --- Undo/Redo ---
  undoStack: [],
  redoStack: [],
  maxUndo: 50,

  init() {
    this.loadUIState();
    this.bindEvents();
    const chk = document.getElementById("chkNullAsString");
    if (chk) chk.checked = this.nullAsString;
    const thumbnailChk = document.getElementById("chkThumbnail");
    if (thumbnailChk) thumbnailChk.checked = this.thumbnailEnabled;
    const quickJumpChk = document.getElementById("chkQuickJump");
    if (quickJumpChk) quickJumpChk.checked = this.miniMapEnabled;
    this.applyEditorScale();
    this.setStatus("Waiting for data...");
    console.log("[wysJSON webview] init called, sending ready");
    vscode.postMessage({ type: "ready" });
  },

  loadUIState() {
    try {
      const raw = localStorage.getItem(this.uiStateStorageKey);
      if (!raw) return;
      const state = JSON.parse(raw);
      this.thumbnailEnabled = !!state.thumbnailEnabled;
      this.miniMapEnabled = !!state.quickJumpEnabled;
      this.thumbnailWidth = Math.max(
        220,
        Number(state.thumbnailWidth) || this.thumbnailWidth,
      );
      this.miniMapWidth = Math.max(
        220,
        Number(state.quickJumpWidth) || this.miniMapWidth,
      );
      this.thumbnailCustomOffset =
        state.thumbnailOffset &&
        Number.isFinite(state.thumbnailOffset.x) &&
        Number.isFinite(state.thumbnailOffset.y)
          ? { x: state.thumbnailOffset.x, y: state.thumbnailOffset.y }
          : null;
      this.miniMapCustomOffset =
        state.quickJumpOffset &&
        Number.isFinite(state.quickJumpOffset.x) &&
        Number.isFinite(state.quickJumpOffset.y)
          ? { x: state.quickJumpOffset.x, y: state.quickJumpOffset.y }
          : null;
    } catch (error) {
      console.warn("Failed to load UI state", error);
    }
  },

  saveUIState() {
    try {
      const thumbnailChk = document.getElementById("chkThumbnail");
      const quickJumpChk = document.getElementById("chkQuickJump");
      localStorage.setItem(
        this.uiStateStorageKey,
        JSON.stringify({
          thumbnailEnabled: thumbnailChk
            ? !!thumbnailChk.checked
            : this.thumbnailEnabled,
          quickJumpEnabled: quickJumpChk
            ? !!quickJumpChk.checked
            : this.miniMapEnabled,
          thumbnailWidth: this.thumbnailWidth,
          quickJumpWidth: this.miniMapWidth,
          thumbnailOffset: this.thumbnailCustomOffset,
          quickJumpOffset: this.miniMapCustomOffset,
        }),
      );
    } catch (error) {
      console.warn("Failed to save UI state", error);
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
    if (this.undoStack.length === 0) return this.setStatus("没有可撤销的操作");
    if (this.data !== null)
      this.redoStack.push(JSON.parse(JSON.stringify(this.data)));
    this.data = this.undoStack.pop();
    this.nestedStates = {};
    this.render();
    this.setStatus("已撤销");
  },

  redo() {
    if (this.redoStack.length === 0) return this.setStatus("没有可重做的操作");
    if (this.data !== null)
      this.undoStack.push(JSON.parse(JSON.stringify(this.data)));
    this.data = this.redoStack.pop();
    this.nestedStates = {};
    this.render();
    this.setStatus("已重做");
  },

  bindEvents() {
    document
      .getElementById("btnSave")
      ?.addEventListener("click", () => this.handleSave());
    document
      .getElementById("btnCancel")
      ?.addEventListener("click", () => this.handleCancel());
    window.addEventListener("message", (event) => {
      this.handleExtensionMessage(event.data);
    });
    if (document.getElementById("btnUndo")) {
      document
        .getElementById("btnUndo")
        .addEventListener("click", () => this.undo());
      document
        .getElementById("btnRedo")
        .addEventListener("click", () => this.redo());
    }
    document
      .getElementById("tableView")
      .addEventListener("click", (e) => this.handleTableClickCapture(e), true);
    document
      .getElementById("tableView")
      .addEventListener("click", (e) => this.handleTableClick(e));
    document
      .getElementById("tableView")
      .addEventListener("dblclick", (e) => this.handleTableDoubleClick(e));
    document
      .getElementById("tableView")
      .addEventListener("mousedown", (e) => this.handleTableMouseDown(e));
    document
      .getElementById("tableView")
      .addEventListener("contextmenu", (e) => this.handleTableContextMenu(e));
    document
      .getElementById("tableView")
      .addEventListener("input", (e) => this.handleCellEdit(e));
    document
      .getElementById("tableView")
      .addEventListener("keydown", (e) => this.handleKeydown(e));
    document
      .getElementById("tableView")
      .addEventListener("mouseover", (e) => this.handleTableHover(e));
    document
      .getElementById("tableView")
      .addEventListener("paste", (e) => this.handlePaste(e));
    document
      .getElementById("tableView")
      .addEventListener("mouseleave", () => this.setHoveredCell(null));
    const btnClearNull = document.getElementById("btnClearNull");
    if (btnClearNull)
      btnClearNull.addEventListener("click", () => this.clearAllNulls());
    const chk = document.getElementById("chkNullAsString");
    if (chk)
      chk.addEventListener("change", (e) => {
        this.nullAsString = !!e.target.checked;
      });
    const thumbnailChk = document.getElementById("chkThumbnail");
    if (thumbnailChk)
      thumbnailChk.addEventListener("change", (e) => {
        this.thumbnailEnabled = !!e.target.checked;
        this.saveUIState();
        this.updateThumbnail();
      });
    const miniMapChk = document.getElementById("chkQuickJump");
    if (miniMapChk)
      miniMapChk.addEventListener("change", (e) => {
        this.miniMapEnabled = !!e.target.checked;
        this.saveUIState();
        this.updateMiniMap();
      });
    document.getElementById("tableView").addEventListener("scroll", () => {
      this.updateThumbnailViewport();
      this.updateThumbnailPosition();
      this.updateMiniMapPosition();
    });
    document.addEventListener("copy", (e) => this.handleCopy(e));
    document.addEventListener("cut", (e) => this.handleCut(e));
    window.addEventListener("pagehide", () => this.saveUIState());
    window.addEventListener("beforeunload", () => this.saveUIState());
    document.addEventListener("mousemove", (e) =>
      this.handleDocumentMouseMove(e),
    );
    document.addEventListener("mouseup", () => this.finishMouseSelection());
    document.addEventListener("click", () => this.hideContextMenu());
    document
      .getElementById("contextMenu")
      .addEventListener("click", (e) => this.handleContextMenuAction(e));
    document
      .getElementById("breadcrumb")
      .addEventListener("click", (e) => this.handleBreadcrumbClick(e));
    document
      .getElementById("thumbnailPanel")
      .addEventListener("click", (e) => this.handleThumbnailClick(e));
    document
      .getElementById("thumbnailPanel")
      .addEventListener("mousedown", (e) => this.handleThumbnailMouseDown(e));
    document
      .getElementById("miniMap")
      .addEventListener("click", (e) => this.handleMiniMapClick(e));
    document
      .getElementById("miniMap")
      .addEventListener("mousedown", (e) => this.handleMiniMapMouseDown(e));
    document
      .getElementById("tableView")
      .addEventListener("wheel", (e) => this.handleEditorWheel(e), {
        passive: false,
      });
    document.addEventListener("mousemove", (e) =>
      this.handleThumbnailMouseMove(e),
    );
    document.addEventListener("mouseup", () => this.handleThumbnailMouseUp());
    document.addEventListener("mousemove", (e) =>
      this.handleMiniMapMouseMove(e),
    );
    document.addEventListener("mouseup", () => this.handleMiniMapMouseUp());

    // Global undo/redo hotkeys
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        this.redo();
      }
    });
  },

  // ===== Status =====
  setStatus(msg, isError = false) {
    const bar = document.getElementById("statusBar");
    bar.textContent = (isError ? "❌ " : "✅ ") + msg;
    bar.className = "status-bar" + (isError ? " error" : "");
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
    if (this.undoStack.length === 0) return this.setStatus("没有可撤销的操作");
    if (this.data !== null)
      this.redoStack.push(JSON.parse(JSON.stringify(this.data)));
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
    this.setStatus("已撤销");
  },

  redo() {
    if (this.redoStack.length === 0) return this.setStatus("没有可重做的操作");
    if (this.data !== null)
      this.undoStack.push(JSON.parse(JSON.stringify(this.data)));
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
    this.setStatus("已重做");
  },

  syncTextarea() {
    /* no-op in VS Code extension - #jsonInput does not exist */
  },

  applyEditorScale() {
    const canvas = document.getElementById("editorCanvas");
    if (!canvas) return;
    canvas.style.zoom = String(this.editorScale);
    this.updateThumbnailViewport();
    this.updateThumbnailPosition();
    this.updateMiniMapPosition();
  },

  // ===== Input Panel =====
  toggleInput() {
    document.getElementById("inputPanel").classList.toggle("open");
    if (document.getElementById("inputPanel").classList.contains("open")) {
      document.getElementById("jsonInput").focus();
    }
  },

  applyInput() {
    const raw = document.getElementById("jsonInput").value.trim();
    if (!raw) return;
    try {
      this.data = JSON.parse(raw);
      this.focusPath = "";
      this.nestedStates = {};
      this.columnStates = {};
      this.render();
      this.setStatus("JSON 已加载");
    } catch (e) {
      this.setStatus("JSON 解析错误: " + e.message, true);
    }
  },

  // ===== Actions =====
  formatJSON() {
    if (this.data === null) return this.setStatus("没有数据", true);
    const formatted = JSON.stringify(this.data, null, 2);
    document.getElementById("jsonInput").value = formatted;
    document.getElementById("inputPanel").classList.add("open");
    this.setStatus("JSON 已格式化");
  },

  minifyJSON() {
    if (this.data === null) return this.setStatus("没有数据", true);
    const minified = JSON.stringify(this.data);
    document.getElementById("jsonInput").value = minified;
    document.getElementById("inputPanel").classList.add("open");
    this.setStatus("JSON 已压缩");
  },

  copyJSON() {
    if (this.data === null) return this.setStatus("没有数据", true);
    navigator.clipboard
      .writeText(JSON.stringify(this.data, null, 2))
      .then(() => {
        this.setStatus("JSON 已复制到剪贴板");
      });
  },

  exportJSON() {
    if (this.data === null) return this.setStatus("没有数据", true);
    const json = JSON.stringify(this.data, null, 2);
    document.getElementById("jsonInput").value = json;
    document.getElementById("inputPanel").classList.add("open");
    this.setStatus("JSON 已导出到输入面板");
  },

  loadSample() {
    const sample = {
      employees: [
        {
          name: "张三",
          age: 30,
          email: "zhangsan@example.com",
          skills: ["Java", "Python", "Go"],
          address: {
            city: "北京",
            district: "海淀区",
            street: "中关村大街1号",
          },
          projects: [
            { name: "Project Alpha", role: "Leader", hours: 160 },
            { name: "Project Beta", role: "Developer", hours: 120 },
          ],
        },
        {
          name: "李四",
          age: 28,
          email: "lisi@example.com",
          skills: ["JavaScript", "React", "Node.js"],
          address: {
            city: "上海",
            district: "浦东新区",
            street: "张江路99号",
          },
          projects: [{ name: "Project Gamma", role: "Developer", hours: 200 }],
        },
      ],
      company: {
        name: "科技有限公司",
        founded: 2020,
        public: false,
        departments: {
          engineering: { head: "王五", count: 50 },
          design: { head: "赵六", count: 15 },
        },
      },
    };
    this.data = sample;
    this.focusPath = "";
    document.getElementById("jsonInput").value = JSON.stringify(
      sample,
      null,
      2,
    );
    this.nestedStates = {};
    this.columnStates = {};
    this.render();
    this.setStatus("示例数据已加载");
  },

  // ===== Breadcrumb =====
  normalizePath(path) {
    return path || "";
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
    let currentPath = "";
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
      return this.setStatus("未找到要聚焦的节点", true);
    }
    this.focusPath = nextPath;
    this.pendingCellSelection = options.selectPath || null;
    this.render();
    this.setStatus(nextPath ? `已聚焦到节点 ${nextPath}` : "已返回 root");
  },

  updateBreadcrumb() {
    const bc = document.getElementById("breadcrumb");
    const segments = this.getPathSegments(this.focusPath);
    const parts = [
      `<span class="${segments.length === 0 ? "current" : ""}" data-path="">📄 root</span>`,
    ];
    for (const segment of segments) {
      parts.push('<span class="sep">/</span>');
      parts.push(
        `<span class="${segment.path === this.focusPath ? "current" : ""}" data-path="${segment.path}">${segment.label}</span>`,
      );
    }
    if (this.focusPath) {
      parts.push('<span class="focus-badge">聚焦中</span>');
    }
    bc.innerHTML = parts.join("");
  },

  handleBreadcrumbClick(e) {
    const crumb = e.target.closest("[data-path]");
    if (!crumb) return;
    this.setFocusPath(crumb.dataset.path || "");
  },

  collectMiniMapNodes(value, basePath, depth = 0, bucket = []) {
    const currentType = Array.isArray(value)
      ? "array"
      : value === null
        ? "null"
        : typeof value;
    bucket.push({
      path: basePath || "",
      label: basePath || "root",
      type: currentType,
      depth,
    });
    if (depth >= 4 || value === null || value === undefined) return bucket;
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        this.collectMiniMapNodes(
          value[index],
          `${basePath}[${index}]`,
          depth + 1,
          bucket,
        );
      }
      return bucket;
    }
    if (typeof value === "object") {
      for (const key of Object.keys(value)) {
        const nextPath = basePath ? `${basePath}.${key}` : key;
        this.collectMiniMapNodes(value[key], nextPath, depth + 1, bucket);
      }
    }
    return bucket;
  },

  collectThumbnailBlocks() {
    const tableView = document.getElementById("tableView");
    const canvas = document.getElementById("editorCanvas");
    if (!tableView || !canvas || !this.data) return "";
    const tableRect = tableView.getBoundingClientRect();
    const totalWidth = Math.max(tableView.scrollWidth, 1);
    const totalHeight = Math.max(tableView.scrollHeight, 1);
    const overviewWidth = Math.max(180, this.thumbnailWidth - 32);
    const overviewHeight = 168;
    const activePath = this.selectedCell?.dataset?.path || this.focusPath || "";
    const elements = Array.from(
      canvas.querySelectorAll(
        ".json-table-wrapper, .nested-content, .nested-preview",
      ),
    );
    return elements
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const contentX = tableView.scrollLeft + rect.left - tableRect.left;
        const contentY = tableView.scrollTop + rect.top - tableRect.top;
        const width = Math.max(6, (rect.width / totalWidth) * overviewWidth);
        const height = Math.max(
          4,
          (rect.height / totalHeight) * overviewHeight,
        );
        const left = (contentX / totalWidth) * overviewWidth;
        const top = (contentY / totalHeight) * overviewHeight;
        const blockType = element.classList.contains("nested-preview")
          ? "preview"
          : element.classList.contains("nested-content")
            ? "nested"
            : "table";
        const path = element.closest("[data-path]")?.dataset?.path || "";
        const activeClass =
          activePath && path && activePath.startsWith(path) ? "active" : "";
        return `<div class="thumbnail-block ${blockType} ${activeClass}" style="left:${left}px;top:${top}px;width:${width}px;height:${height}px"></div>`;
      })
      .join("");
  },

  updateThumbnail() {
    const panel = document.getElementById("thumbnailPanel");
    if (!panel) return;
    panel.classList.toggle(
      "hidden",
      !this.thumbnailEnabled || this.data === null || this.data === undefined,
    );
    if (
      !this.thumbnailEnabled ||
      this.data === null ||
      this.data === undefined
    ) {
      panel.innerHTML = "";
      return;
    }
    const blocks = this.collectThumbnailBlocks();
    panel.innerHTML = `<div class="mini-map-resize-handle" title="拖动调整缩略图宽度"></div><div class="mini-map-header"><div class="mini-map-title">缩略图</div><div class="mini-map-hint" title="拖动面板 / 拖动视区 / 点击定位 / 左侧拖边调整宽度">拖动面板 / 拖动视区 / 点击定位 / 左侧拖边调整宽度</div></div><div class="mini-map-overview"><div class="mini-map-overview-grid"></div><div class="thumbnail-canvas">${blocks}</div><div class="mini-map-viewport" id="thumbnailViewport"></div><div class="mini-map-overview-label" id="thumbnailOverviewLabel">视区</div></div>`;
    this.updateThumbnailViewport();
    this.updateThumbnailPosition();
  },

  updateMiniMap() {
    const miniMap = document.getElementById("miniMap");
    if (!miniMap) return;
    miniMap.classList.toggle(
      "hidden",
      !this.miniMapEnabled || this.data === null || this.data === undefined,
    );
    if (!this.miniMapEnabled || this.data === null || this.data === undefined) {
      miniMap.innerHTML = "";
      return;
    }
    let focusValue = this.getFocusedData();
    if (this.focusPath && focusValue === undefined) {
      this.focusPath = "";
      focusValue = this.data;
    }
    if (focusValue === undefined) {
      miniMap.innerHTML = "";
      return;
    }
    const nodes = this.collectMiniMapNodes(focusValue, this.focusPath || "");
    const activePath = this.selectedCell?.dataset?.path || this.focusPath || "";
    miniMap.innerHTML = `<div class="mini-map-resize-handle" title="拖动调整快速跳转宽度"></div><div class="mini-map-header"><div class="mini-map-title">快速跳转</div><div class="mini-map-hint" title="拖动面板 / Ctrl+点击聚焦 / 左侧拖边调整宽度">拖动面板 / Ctrl+点击聚焦 / 左侧拖边调整宽度</div></div>${nodes
      .map(
        (node) => `
            <button class="mini-map-item ${activePath === node.path ? "active" : ""}" title="${node.label || "root"} (${node.type})" data-path="${node.path}" style="padding-left:${6 + node.depth * 12}px">
                <span class="mini-map-path">${node.label || "root"}<span class="mini-map-type">${node.type}</span></span>
            </button>`,
      )
      .join("")}`;
    this.updateMiniMapPosition();
  },

  updateThumbnailPosition() {
    const panel = document.getElementById("thumbnailPanel");
    const tableView = document.getElementById("tableView");
    if (!panel || !tableView || panel.classList.contains("hidden")) return;
    panel.style.width = `${this.thumbnailWidth}px`;
    const maxOffsetX = Math.max(
      8,
      tableView.clientWidth - panel.offsetWidth - 8,
    );
    const offsetX =
      this.thumbnailCustomOffset?.x ??
      Math.max(8, tableView.clientWidth - panel.offsetWidth - 12);
    const offsetY = this.thumbnailCustomOffset?.y ?? 12;
    const clampedOffsetX = Math.min(Math.max(8, offsetX), maxOffsetX);
    if (this.thumbnailCustomOffset) {
      this.thumbnailCustomOffset = { x: clampedOffsetX, y: offsetY };
    }
    panel.style.right = "auto";
    panel.style.left = `${tableView.scrollLeft + clampedOffsetX}px`;
    panel.style.top = `${tableView.scrollTop + offsetY}px`;
  },

  updateMiniMapPosition() {
    const miniMap = document.getElementById("miniMap");
    const tableView = document.getElementById("tableView");
    if (!miniMap || !tableView || miniMap.classList.contains("hidden")) return;
    miniMap.style.width = `${this.miniMapWidth}px`;
    const maxOffsetX = Math.max(
      8,
      tableView.clientWidth - miniMap.offsetWidth - 8,
    );
    const offsetX =
      this.miniMapCustomOffset?.x ??
      Math.max(8, tableView.clientWidth - miniMap.offsetWidth - 12);
    const offsetY = this.miniMapCustomOffset?.y ?? 196;
    const clampedOffsetX = Math.min(Math.max(8, offsetX), maxOffsetX);
    if (this.miniMapCustomOffset) {
      this.miniMapCustomOffset = { x: clampedOffsetX, y: offsetY };
    }
    miniMap.style.right = "auto";
    miniMap.style.left = `${tableView.scrollLeft + clampedOffsetX}px`;
    miniMap.style.top = `${tableView.scrollTop + offsetY}px`;
  },

  updateThumbnailViewport() {
    const panel = document.getElementById("thumbnailPanel");
    const viewport = document.getElementById("thumbnailViewport");
    const label = document.getElementById("thumbnailOverviewLabel");
    const tableView = document.getElementById("tableView");
    const overview = panel?.querySelector(".mini-map-overview");
    if (
      !panel ||
      panel.classList.contains("hidden") ||
      !viewport ||
      !label ||
      !tableView ||
      !overview
    )
      return;
    const trackWidth = overview.clientWidth;
    const totalHeight = Math.max(tableView.scrollHeight, 1);
    const visibleHeight = Math.max(tableView.clientHeight, 1);
    const totalWidth = Math.max(tableView.scrollWidth, 1);
    const visibleWidth = Math.max(tableView.clientWidth, 1);
    const trackHeight = overview.clientHeight;
    const hasHorizontalScroll = totalWidth > visibleWidth + 1;
    const hasVerticalScroll = totalHeight > visibleHeight + 1;
    if (!hasHorizontalScroll && !hasVerticalScroll) {
      viewport.style.transform = "translate3d(0, 0, 0)";
      viewport.style.width = `${trackWidth}px`;
      viewport.style.height = `${trackHeight}px`;
      label.textContent = "全部";
      return;
    }
    const viewportWidth = hasHorizontalScroll
      ? Math.max(10, Math.round((visibleWidth / totalWidth) * trackWidth))
      : Math.min(trackWidth, Math.max(18, Math.round(trackWidth * 0.32)));
    const viewportHeight = hasVerticalScroll
      ? Math.max(8, Math.round((visibleHeight / totalHeight) * trackHeight))
      : Math.min(trackHeight, Math.max(16, Math.round(trackHeight * 0.22)));
    const maxScrollLeft = Math.max(
      tableView.scrollWidth - tableView.clientWidth,
      1,
    );
    const maxScroll = Math.max(
      tableView.scrollHeight - tableView.clientHeight,
      1,
    );
    const left = !hasHorizontalScroll
      ? Math.round((trackWidth - viewportWidth) / 2)
      : Math.round(
          (tableView.scrollLeft / maxScrollLeft) *
            Math.max(trackWidth - viewportWidth, 0),
        );
    const top = !hasVerticalScroll
      ? Math.round((trackHeight - viewportHeight) / 2)
      : Math.round(
          (tableView.scrollTop / maxScroll) *
            Math.max(trackHeight - viewportHeight, 0),
        );
    viewport.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    viewport.style.width = `${Math.min(viewportWidth, trackWidth)}px`;
    viewport.style.height = `${Math.min(viewportHeight, trackHeight)}px`;
    const scrollLeftPercent = !hasHorizontalScroll
      ? 0
      : Math.round((tableView.scrollLeft / maxScrollLeft) * 100);
    const scrollTopPercent = !hasVerticalScroll
      ? 0
      : Math.round((tableView.scrollTop / maxScroll) * 100);
    label.textContent = `x${scrollLeftPercent} y${scrollTopPercent}`;
  },

  resolveThumbnailOverviewTarget(clientX, clientY, options = {}) {
    const dragMetrics = options.dragMetrics;
    const tableView =
      dragMetrics?.tableView || document.getElementById("tableView");
    const panel = dragMetrics
      ? null
      : document.getElementById("thumbnailPanel");
    const overview =
      dragMetrics?.overview || panel?.querySelector(".mini-map-overview");
    const viewport =
      dragMetrics?.viewport || document.getElementById("thumbnailViewport");
    if (!tableView || !overview || !viewport) return null;
    const rect = dragMetrics?.rect || overview.getBoundingClientRect();
    const viewportWidth = dragMetrics?.viewportWidth ?? viewport.offsetWidth;
    const viewportHeight = dragMetrics?.viewportHeight ?? viewport.offsetHeight;
    const offsetX = options.offsetX ?? viewportWidth / 2;
    const offsetY = options.offsetY ?? viewportHeight / 2;
    const desiredLeft = Math.min(
      Math.max(0, clientX - rect.left - offsetX),
      Math.max(rect.width - viewportWidth, 0),
    );
    const desiredTop = Math.min(
      Math.max(0, clientY - rect.top - offsetY),
      Math.max(rect.height - viewportHeight, 0),
    );
    const maxScrollLeft =
      dragMetrics?.maxScrollLeft ??
      Math.max(tableView.scrollWidth - tableView.clientWidth, 0);
    const maxScrollTop =
      dragMetrics?.maxScrollTop ??
      Math.max(tableView.scrollHeight - tableView.clientHeight, 0);
    const scrollLeft =
      rect.width <= viewportWidth || maxScrollLeft === 0
        ? 0
        : (desiredLeft / Math.max(rect.width - viewportWidth, 1)) *
          maxScrollLeft;
    const scrollTop =
      rect.height <= viewportHeight || maxScrollTop === 0
        ? 0
        : (desiredTop / Math.max(rect.height - viewportHeight, 1)) *
          maxScrollTop;
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
    const label = document.getElementById("thumbnailOverviewLabel");
    if (!label) return;
    const scrollLeftPercent =
      target.maxScrollLeft === 0
        ? 0
        : Math.round((target.scrollLeft / target.maxScrollLeft) * 100);
    const scrollTopPercent =
      target.maxScrollTop === 0
        ? 0
        : Math.round((target.scrollTop / target.maxScrollTop) * 100);
    label.textContent = `x${scrollLeftPercent} y${scrollTopPercent}`;
  },

  flushThumbnailViewportDrag() {
    this.thumbnailViewportFrame = 0;
    const pending = this.thumbnailViewportPending;
    this.thumbnailViewportPending = null;
    if (!pending) return;
    const target = this.resolveThumbnailOverviewTarget(
      pending.clientX,
      pending.clientY,
      pending.options,
    );
    if (!target) return;
    this.thumbnailViewportLastTarget = target;
    this.applyThumbnailViewportTarget(target);
  },

  requestThumbnailViewportDrag(clientX, clientY, options = {}) {
    this.thumbnailViewportPending = { clientX, clientY, options };
    if (this.thumbnailViewportFrame) return;
    this.thumbnailViewportFrame = requestAnimationFrame(() =>
      this.flushThumbnailViewportDrag(),
    );
  },

  scrollThumbnailOverviewTo(clientX, clientY, options = {}) {
    const target = this.resolveThumbnailOverviewTarget(
      clientX,
      clientY,
      options,
    );
    if (!target) return;
    target.tableView.scrollTo({
      left: target.scrollLeft,
      top: target.scrollTop,
      behavior: options.smooth === false ? "auto" : "smooth",
    });
  },

  handleThumbnailClick(e) {
    if (e.target.closest("#thumbnailViewport")) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const overview = e.target.closest(".mini-map-overview");
    if (!overview) return;
    if (this.thumbnailSuppressClick) {
      this.thumbnailSuppressClick = false;
      return;
    }
    this.scrollThumbnailOverviewTo(e.clientX, e.clientY, { smooth: true });
    this.setStatus("已通过缩略图定位视区");
  },

  centerCellInView(cell) {
    const tableView = document.getElementById("tableView");
    if (!tableView || !cell) return;
    const containerRect = tableView.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const deltaTop = cellRect.top - containerRect.top;
    const deltaLeft = cellRect.left - containerRect.left;
    const targetTop =
      tableView.scrollTop +
      deltaTop -
      tableView.clientHeight / 2 +
      cellRect.height / 2;
    const targetLeft =
      tableView.scrollLeft +
      deltaLeft -
      tableView.clientWidth / 2 +
      cellRect.width / 2;
    tableView.scrollTo({
      top: Math.max(0, targetTop),
      left: Math.max(0, targetLeft),
      behavior: "smooth",
    });
  },

  handleMiniMapClick(e) {
    const item = e.target.closest(".mini-map-item[data-path]");
    if (!item) return;
    const path = item.dataset.path || "";
    const value = path ? this.getValueAtPath(this.data, path) : this.data;
    if (e.ctrlKey && value && typeof value === "object") {
      this.setFocusPath(path);
      return;
    }
    if (path) {
      this.pendingCellSelection = path;
    }
    this.render();
    if (path) {
      requestAnimationFrame(() => {
        const cell = this.findCellByPath(path);
        if (cell) this.centerCellInView(cell);
      });
    }
    this.setStatus(`已定位到节点 ${path || "root"}`);
  },

  handleThumbnailMouseDown(e) {
    const panel = document.getElementById("thumbnailPanel");
    if (!panel) return;
    const resizeHandle = e.target.closest(".mini-map-resize-handle");
    if (resizeHandle) {
      this.thumbnailResizeDrag = {
        startX: e.clientX,
        startWidth: this.thumbnailWidth,
        startOffsetX: this.thumbnailCustomOffset?.x ?? null,
      };
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const viewport = e.target.closest("#thumbnailViewport");
    if (viewport) {
      const tableView = document.getElementById("tableView");
      const overview = panel.querySelector(".mini-map-overview");
      const rect = viewport.getBoundingClientRect();
      const overviewRect = overview?.getBoundingClientRect();
      this.thumbnailViewportDrag = {
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
        dragMetrics:
          tableView && overview && overviewRect
            ? {
                tableView,
                overview,
                viewport,
                rect: overviewRect,
                viewportWidth: viewport.offsetWidth,
                viewportHeight: viewport.offsetHeight,
                maxScrollLeft: Math.max(
                  tableView.scrollWidth - tableView.clientWidth,
                  0,
                ),
                maxScrollTop: Math.max(
                  tableView.scrollHeight - tableView.clientHeight,
                  0,
                ),
              }
            : null,
      };
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!e.target.closest(".mini-map-header")) return;
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
    const miniMap = document.getElementById("miniMap");
    if (!miniMap) return;
    const resizeHandle = e.target.closest(".mini-map-resize-handle");
    if (resizeHandle) {
      this.miniMapResizeDrag = {
        startX: e.clientX,
        startWidth: this.miniMapWidth,
        startOffsetX: this.miniMapCustomOffset?.x ?? null,
      };
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!e.target.closest(".mini-map-header")) return;
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
      const tableView = document.getElementById("tableView");
      if (!tableView) return;
      const maxWidth = Math.max(220, tableView.clientWidth - 16);
      const nextWidth = Math.min(
        maxWidth,
        Math.max(
          220,
          this.thumbnailResizeDrag.startWidth -
            (e.clientX - this.thumbnailResizeDrag.startX),
        ),
      );
      if (this.thumbnailResizeDrag.startOffsetX !== null) {
        const rightEdge =
          this.thumbnailResizeDrag.startOffsetX +
          this.thumbnailResizeDrag.startWidth;
        this.thumbnailCustomOffset = {
          x: Math.max(8, rightEdge - nextWidth),
          y: this.thumbnailCustomOffset?.y ?? 12,
        };
      }
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
    const panel = document.getElementById("thumbnailPanel");
    const tableView = document.getElementById("tableView");
    if (!panel || !tableView) return;
    if (!this.thumbnailDrag.moved) {
      const deltaX = Math.abs(e.clientX - this.thumbnailDrag.startX);
      const deltaY = Math.abs(e.clientY - this.thumbnailDrag.startY);
      if (deltaX < 3 && deltaY < 3) {
        return;
      }
      this.thumbnailDrag.moved = true;
    }
    const bounds = tableView.getBoundingClientRect();
    const maxOffsetX = Math.max(
      8,
      tableView.clientWidth - panel.offsetWidth - 8,
    );
    const maxOffsetY = Math.max(
      8,
      tableView.clientHeight - panel.offsetHeight - 8,
    );
    const nextOffsetX = Math.min(
      Math.max(8, e.clientX - bounds.left - this.thumbnailDrag.offsetX),
      maxOffsetX,
    );
    const nextOffsetY = Math.min(
      Math.max(8, e.clientY - bounds.top - this.thumbnailDrag.offsetY),
      maxOffsetY,
    );
    this.thumbnailCustomOffset = { x: nextOffsetX, y: nextOffsetY };
    this.saveUIState();
    this.updateThumbnailPosition();
  },

  handleMiniMapMouseMove(e) {
    if (this.miniMapResizeDrag) {
      const tableView = document.getElementById("tableView");
      if (!tableView) return;
      const maxWidth = Math.max(220, tableView.clientWidth - 16);
      const nextWidth = Math.min(
        maxWidth,
        Math.max(
          220,
          this.miniMapResizeDrag.startWidth -
            (e.clientX - this.miniMapResizeDrag.startX),
        ),
      );
      if (this.miniMapResizeDrag.startOffsetX !== null) {
        const rightEdge =
          this.miniMapResizeDrag.startOffsetX +
          this.miniMapResizeDrag.startWidth;
        this.miniMapCustomOffset = {
          x: Math.max(8, rightEdge - nextWidth),
          y: this.miniMapCustomOffset?.y ?? 196,
        };
      }
      this.miniMapWidth = nextWidth;
      this.saveUIState();
      this.updateMiniMap();
      return;
    }
    if (!this.miniMapDrag) return;
    const miniMap = document.getElementById("miniMap");
    const tableView = document.getElementById("tableView");
    if (!miniMap || !tableView) return;
    if (!this.miniMapDrag.moved) {
      const deltaX = Math.abs(e.clientX - this.miniMapDrag.startX);
      const deltaY = Math.abs(e.clientY - this.miniMapDrag.startY);
      if (deltaX < 3 && deltaY < 3) {
        return;
      }
      this.miniMapDrag.moved = true;
    }
    const bounds = tableView.getBoundingClientRect();
    const maxOffsetX = Math.max(
      8,
      tableView.clientWidth - miniMap.offsetWidth - 8,
    );
    const maxOffsetY = Math.max(
      8,
      tableView.clientHeight - miniMap.offsetHeight - 8,
    );
    const nextOffsetX = Math.min(
      Math.max(8, e.clientX - bounds.left - this.miniMapDrag.offsetX),
      maxOffsetX,
    );
    const nextOffsetY = Math.min(
      Math.max(8, e.clientY - bounds.top - this.miniMapDrag.offsetY),
      maxOffsetY,
    );
    this.miniMapCustomOffset = { x: nextOffsetX, y: nextOffsetY };
    this.saveUIState();
    this.updateMiniMapPosition();
  },

  handleThumbnailMouseUp() {
    if (this.thumbnailViewportPending) {
      this.flushThumbnailViewportDrag();
    }
    if (
      this.thumbnailViewportDrag?.moved &&
      this.thumbnailViewportLastTarget?.tableView
    ) {
      this.thumbnailViewportLastTarget.tableView.scrollTo({
        left: this.thumbnailViewportLastTarget.scrollLeft,
        top: this.thumbnailViewportLastTarget.scrollTop,
        behavior: "auto",
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
    const elements = document.elementsFromPoint(clientX, clientY);
    const paths = elements
      .map(
        (element) => element?.closest?.("td[data-path]")?.dataset?.path || null,
      )
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    return paths[0] || null;
  },

  getParentPath(path) {
    if (!path) return "";
    const segments = this.getPathSegments(path);
    if (segments.length <= 1) return "";
    return segments[segments.length - 2].path;
  },

  getSemanticZoomTargetPath(path) {
    let candidatePath = path;
    while (candidatePath) {
      const value = this.getValueAtPath(this.data, candidatePath);
      if (value && typeof value === "object") {
        return candidatePath;
      }
      candidatePath = this.getParentPath(candidatePath);
    }
    return null;
  },

  handleEditorWheel(e) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const previousScale = this.editorScale;
    const nextScale = this.editorScale + (e.deltaY < 0 ? 0.1 : -0.1);
    this.editorScale = Math.min(2, Math.max(0.5, Number(nextScale.toFixed(2))));
    const pointerPath =
      this.hoveredCell?.dataset?.path ||
      this.getNodePathFromPoint(e.clientX, e.clientY) ||
      null;
    if (
      e.deltaY < 0 &&
      previousScale < 1.35 &&
      this.editorScale >= 1.35 &&
      pointerPath
    ) {
      const targetPath = this.getSemanticZoomTargetPath(pointerPath);
      if (targetPath) {
        this.editorScale = 1;
        this.applyEditorScale();
        this.setFocusPath(targetPath);
        return;
      }
    }
    if (
      e.deltaY > 0 &&
      previousScale > 0.75 &&
      this.editorScale <= 0.75 &&
      this.focusPath
    ) {
      const segments = this.getPathSegments(this.focusPath);
      const parentPath =
        segments.length > 1 ? segments[segments.length - 2].path : "";
      this.editorScale = 1;
      this.applyEditorScale();
      this.setFocusPath(parentPath);
      return;
    }
    this.applyEditorScale();
    this.setStatus(`编辑区缩放 ${Math.round(this.editorScale * 100)}%`);
  },

  getColumnStateKey(path, key) {
    const fullPath = key !== undefined ? (path ? `${path}.${key}` : key) : path;
    return fullPath.replace(/\[\d+\](?=(\.[^.]+)$)/, "").replace(/^\./, "");
  },

  // ===== Rendering =====
  render() {
    const container = document.getElementById("editorCanvas");
    const empty = document.getElementById("emptyState");
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

    if (
      this.data === null ||
      this.data === undefined ||
      focusValue === undefined
    ) {
      container.innerHTML = "";
      if (empty) {
        empty.style.display = "flex";
      }
      this.updateThumbnail();
      this.updateMiniMap();
      return;
    }

    if (empty) empty.style.display = "none";
    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "json-table-wrapper";

    const table = this.createTable(focusValue, this.focusPath || "");
    wrapper.appendChild(table);
    container.appendChild(wrapper);

    if (this.pendingHeaderEdit) {
      const { path: pendingPath, key: pendingKey } = this.pendingHeaderEdit;
      this.pendingHeaderEdit = null;
      requestAnimationFrame(() => {
        const header = this.findHeaderByPath(pendingPath, pendingKey);
        if (header) this.beginHeaderEdit(header, { selectAll: true });
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
    const wrapper = document.createElement("div");
    wrapper.className = "json-table-layout";
    wrapper.style.marginBottom = "8px";

    const tableContainer = document.createElement("div");
    tableContainer.style.display = "inline-block";

    // Determine if data is array or object
    const isArray = Array.isArray(data);
    const rows = isArray ? data : [data];
    const isPlainObject = (value) =>
      value !== null && typeof value === "object" && !Array.isArray(value);
    const isPureObjectArray =
      isArray && rows.length > 0 && rows.every((row) => isPlainObject(row));

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

    const table = document.createElement("table");
    table.className = "json-table";
    table.setAttribute("data-path", path);
    table.setAttribute("data-is-array", isArray);

    // Header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    // Row number column (show for arrays and objects — objects get a single row index)
    const thRowNum = document.createElement("th");
    thRowNum.className = "row-num-header";
    const typeBadge = document.createElement("span");
    typeBadge.className = "table-type-badge";
    typeBadge.textContent = isArray ? "[]" : "{}";
    typeBadge.title = isArray
      ? "当前表格节点类型：Array"
      : "当前表格节点类型：Object";
    thRowNum.appendChild(typeBadge);
    headerRow.appendChild(thRowNum);

    for (const key of allKeys) {
      const th = document.createElement("th");
      th.setAttribute("data-header-path", path);
      th.setAttribute("data-header-key", key);
      th.setAttribute("data-header-editable", "true");
      th.title = "双击修改列标题";

      // Check if column has any nested values
      const sample = rows.find(
        (r) =>
          r &&
          typeof r === "object" &&
          !Array.isArray(r) &&
          r[key] !== undefined,
      );
      const sampleVal = sample ? sample[key] : undefined;
      const isNested =
        sampleVal !== null &&
        sampleVal !== undefined &&
        typeof sampleVal === "object";
      const colStateKey = this.getColumnStateKey(path, key);

      // Add nested toggle to column header
      if (isNested) {
        const toggle = document.createElement("span");
        toggle.className = "nested-toggle";
        const isArray = Array.isArray(sampleVal);
        const isExpanded = this.columnStates[colStateKey] !== false;
        if (isExpanded) toggle.classList.add("expanded");
        toggle.innerHTML = `<span class="arrow">▶</span><span class="summary">${isArray ? `[${sampleVal.length}]` : `{${Object.keys(sampleVal).length}}`}</span>`;
        toggle.addEventListener("click", (e) => {
          e.stopPropagation();
          this.columnStates[colStateKey] =
            this.columnStates[colStateKey] === false;
          this.render();
        });
        th.appendChild(toggle);
      }

      const label = document.createElement("span");
      label.className = "header-label";
      label.textContent = key;
      th.appendChild(label);

      // Type tag
      if (
        sampleVal !== null &&
        sampleVal !== undefined &&
        !(typeof sampleVal === "object")
      ) {
        const tag = document.createElement("span");
        tag.className = "type-tag";
        tag.textContent = typeof sampleVal;
        th.appendChild(tag);
      }

      const dragHandle = document.createElement("span");
      dragHandle.className = "drag-handle";
      dragHandle.textContent = "⋮⋮";
      dragHandle.title = "拖拽调整字段顺序";
      dragHandle.draggable = true;
      dragHandle.addEventListener("click", (e) => e.stopPropagation());
      dragHandle.addEventListener("mousedown", (e) => e.stopPropagation());
      dragHandle.addEventListener("dragstart", (e) => {
        e.stopPropagation();
        this.beginStructureDrag(
          { type: "column", path: path || "", key },
          th,
          e,
        );
      });
      dragHandle.addEventListener("dragend", () => this.finishStructureDrag());
      th.appendChild(dragHandle);
      th.addEventListener("dragover", (e) => {
        const dragState = this.dragState;
        if (
          !dragState ||
          dragState.type !== "column" ||
          dragState.path !== (path || "") ||
          dragState.key === key
        )
          return;
        e.preventDefault();
        const rect = th.getBoundingClientRect();
        const position =
          e.clientX < rect.left + rect.width / 2 ? "before" : "after";
        this.dragState.position = position;
        this.dragState.targetKey = key;
        this.updateDragTarget(th, position);
      });
      th.addEventListener("drop", (e) => {
        const dragState = this.dragState;
        if (
          !dragState ||
          dragState.type !== "column" ||
          dragState.path !== (path || "") ||
          dragState.key === key
        )
          return;
        e.preventDefault();
        const position = dragState.position || "after";
        const sourceKey = dragState.key;
        this.finishStructureDrag();
        this.moveColumn(path || "", sourceKey, key, position);
      });

      // Resize handle
      const resizer = document.createElement("div");
      resizer.className = "col-resizer";
      th.appendChild(resizer);
      resizer.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX,
          startW = th.offsetWidth;
        const move = (ev) => {
          const w = Math.max(40, startW + ev.clientX - startX);
          th.style.width = w + "px";
          th.style.minWidth = w + "px";
        };
        const up = () => {
          document.removeEventListener("mousemove", move);
          document.removeEventListener("mouseup", up);
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      });

      headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement("tbody");

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowPath = isArray ? `${path}[${i}]` : path;
      const tr = document.createElement("tr");
      tr.setAttribute("data-path", rowPath);

      // Row number (Excel-style) — show for arrays and objects
      const td = document.createElement("td");
      td.className = "row-num";
      td.textContent = i + 1;
      td.title = isArray
        ? "点击选中当前整行，拖拽调整顺序，右键打开行菜单"
        : "点击选中当前整行，右键打开对象菜单";
      td.setAttribute("data-row-index", i);
      td.setAttribute("data-array-path", path);
      if (isArray) {
        td.classList.add("is-row-draggable");
        td.draggable = true;
        td.addEventListener("dragstart", (e) => {
          this.beginStructureDrag(
            { type: "row", arrayPath: path || "", rowIndex: i },
            td,
            e,
          );
        });
        td.addEventListener("dragend", () => this.finishStructureDrag());
        td.addEventListener("dragover", (e) => {
          const dragState = this.dragState;
          if (
            !dragState ||
            dragState.type !== "row" ||
            dragState.arrayPath !== (path || "") ||
            dragState.rowIndex === i
          )
            return;
          e.preventDefault();
          const rect = td.getBoundingClientRect();
          const position =
            e.clientY < rect.top + rect.height / 2 ? "before" : "after";
          this.dragState.position = position;
          this.dragState.targetRowIndex = i;
          this.updateDragTarget(td, position);
        });
        td.addEventListener("drop", (e) => {
          const dragState = this.dragState;
          if (
            !dragState ||
            dragState.type !== "row" ||
            dragState.arrayPath !== (path || "") ||
            dragState.rowIndex === i
          )
            return;
          e.preventDefault();
          const position = dragState.position || "after";
          const insertIndex = position === "before" ? i : i + 1;
          const targetIndex =
            dragState.rowIndex < insertIndex ? insertIndex - 1 : insertIndex;
          const sourceIndex = dragState.rowIndex;
          this.finishStructureDrag();
          this.moveRow(path || "", sourceIndex, targetIndex);
        });
      }
      td.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectRowByNumberCell(td);
      });
      td.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showContextMenu(e.clientX, e.clientY, {
          type: "row",
          path: rowPath,
          arrayPath: path,
          rowIndex: i,
          isArrayRow: isArray,
          value: row,
        });
      });
      tr.appendChild(td);

      for (const key of allKeys) {
        const td = document.createElement("td");
        td.setAttribute("data-col", key);
        const val =
          row && typeof row === "object" && !Array.isArray(row)
            ? row[key]
            : undefined;
        const cellPath = rowPath ? `${rowPath}.${key}` : key;

        this.renderCell(td, val, cellPath, key);
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    tableContainer.appendChild(table);

    if (isArray) {
      const sideActions = document.createElement("div");
      sideActions.className = "table-side-actions";
      const addColumnBtn = document.createElement("button");
      addColumnBtn.className = "add-column-btn";
      addColumnBtn.textContent = "+ 添加列";
      addColumnBtn.title = "为当前数组对象添加列";
      addColumnBtn.addEventListener("click", () => this.addColumn(path));
      sideActions.appendChild(addColumnBtn);

      const addBtn = document.createElement("button");
      addBtn.className = "add-row-btn";
      addBtn.textContent = "+ 添加行";
      addBtn.addEventListener("click", () => this.addRow(path));
      tableContainer.appendChild(addBtn);
      wrapper.appendChild(tableContainer);
      wrapper.appendChild(sideActions);
      return wrapper;
    } else {
      const sideActions = document.createElement("div");
      sideActions.className = "table-side-actions";
      const addColumnBtn = document.createElement("button");
      addColumnBtn.className = "add-column-btn";
      addColumnBtn.textContent = "+ 添加列";
      addColumnBtn.title = "为当前对象添加列";
      addColumnBtn.addEventListener("click", () => this.addColumn(path));
      sideActions.appendChild(addColumnBtn);
      wrapper.appendChild(tableContainer);
      wrapper.appendChild(sideActions);
      return wrapper;
    }

    wrapper.appendChild(tableContainer);

    return wrapper;
  },

  createSimpleView(data, path, isArray) {
    const wrapper = document.createElement("div");
    wrapper.style.display = "inline-block";
    const isPlainObject = (value) =>
      value !== null && typeof value === "object" && !Array.isArray(value);

    const table = document.createElement("table");
    table.className = "json-table";
    table.setAttribute("data-path", path || "");
    table.setAttribute("data-is-array", isArray ? "true" : "false");

    if (isArray) {
      // Array rendered row-by-row. Supports primitives, objects, arrays, and mixed content.
      const thead = document.createElement("thead");
      const thRow = document.createElement("tr");
      const thIdx = document.createElement("th");
      thIdx.className = "row-num-header";
      const typeBadge = document.createElement("span");
      typeBadge.className = "table-type-badge";
      typeBadge.textContent = "[]";
      typeBadge.title = "当前表格节点类型：Array";
      thIdx.appendChild(typeBadge);
      thIdx.style.width = "48px";
      thIdx.style.textAlign = "center";
      thRow.appendChild(thIdx);
      const thVal = document.createElement("th");
      thVal.textContent = "值";
      thRow.appendChild(thVal);
      thead.appendChild(thRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      for (let i = 0; i < data.length; i++) {
        const tr = document.createElement("tr");
        const tdIdx = document.createElement("td");
        tdIdx.className = "row-num";
        tdIdx.style.textAlign = "center";
        tdIdx.style.color = "var(--text-muted)";
        tdIdx.style.fontSize = "11px";
        tdIdx.textContent = i + 1;
        tdIdx.title = "点击选中当前整行，拖拽调整顺序，右键打开行菜单";
        tdIdx.setAttribute("data-row-index", i);
        tdIdx.setAttribute("data-array-path", path);
        tdIdx.classList.add("is-row-draggable");
        tdIdx.draggable = true;
        tdIdx.addEventListener("dragstart", (e) => {
          this.beginStructureDrag(
            { type: "row", arrayPath: path || "", rowIndex: i },
            tdIdx,
            e,
          );
        });
        tdIdx.addEventListener("dragend", () => this.finishStructureDrag());
        tdIdx.addEventListener("dragover", (e) => {
          const dragState = this.dragState;
          if (
            !dragState ||
            dragState.type !== "row" ||
            dragState.arrayPath !== (path || "") ||
            dragState.rowIndex === i
          )
            return;
          e.preventDefault();
          const rect = tdIdx.getBoundingClientRect();
          const position =
            e.clientY < rect.top + rect.height / 2 ? "before" : "after";
          this.dragState.position = position;
          this.dragState.targetRowIndex = i;
          this.updateDragTarget(tdIdx, position);
        });
        tdIdx.addEventListener("drop", (e) => {
          const dragState = this.dragState;
          if (
            !dragState ||
            dragState.type !== "row" ||
            dragState.arrayPath !== (path || "") ||
            dragState.rowIndex === i
          )
            return;
          e.preventDefault();
          const position = dragState.position || "after";
          const insertIndex = position === "before" ? i : i + 1;
          const targetIndex =
            dragState.rowIndex < insertIndex ? insertIndex - 1 : insertIndex;
          const sourceIndex = dragState.rowIndex;
          this.finishStructureDrag();
          this.moveRow(path || "", sourceIndex, targetIndex);
        });
        tdIdx.addEventListener("click", (e) => {
          e.stopPropagation();
          this.selectRowByNumberCell(tdIdx);
        });
        tdIdx.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.showContextMenu(e.clientX, e.clientY, {
            type: "row",
            arrayPath: path,
            rowIndex: i,
            isArrayRow: true,
            path: `${path}[${i}]`,
            value: data[i],
          });
        });
        tr.appendChild(tdIdx);

        const tdVal = document.createElement("td");
        this.renderCell(tdVal, data[i], `${path}[${i}]`, `[${i}]`);
        tr.appendChild(tdVal);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      wrapper.appendChild(table);

      const addBtn = document.createElement("button");
      addBtn.className = "add-row-btn";
      addBtn.textContent = "+ 添加项";
      addBtn.addEventListener("click", () => this.addRow(path));
      wrapper.appendChild(addBtn);
    } else if (isPlainObject(data) && Object.keys(data).length === 0) {
      const tbody = document.createElement("tbody");
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.className = "cell-nested";
      td.setAttribute("data-path", path || "");
      td.setAttribute("data-editable", "false");
      td.style.minWidth = "140px";

      const placeholder = document.createElement("div");
      placeholder.className = "nested-preview";

      const badge = document.createElement("span");
      badge.className = "nested-badge";
      badge.textContent = "{}";
      placeholder.appendChild(badge);

      const summary = document.createElement("span");
      summary.className = "nested-summary-text";
      summary.textContent = "空对象";
      placeholder.appendChild(summary);

      td.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showContextMenu(e.clientX, e.clientY, {
          type: "cell",
          path,
          value: data,
        });
      });

      td.appendChild(placeholder);
      tr.appendChild(td);
      tbody.appendChild(tr);
      table.appendChild(tbody);
      wrapper.appendChild(table);

      const sideActions = document.createElement("div");
      sideActions.className = "table-side-actions";
      const addColumnBtn = document.createElement("button");
      addColumnBtn.className = "add-column-btn";
      addColumnBtn.textContent = "+ 添加列";
      addColumnBtn.title = "为当前空对象添加列";
      addColumnBtn.addEventListener("click", () => this.addColumn(path));
      sideActions.appendChild(addColumnBtn);
      wrapper.appendChild(sideActions);
    } else {
      // Single primitive or empty object
      const tbody = document.createElement("tbody");
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      this.renderCell(td, data, path, "value");
      tr.appendChild(td);
      tbody.appendChild(tr);
      table.appendChild(tbody);
      wrapper.appendChild(table);
    }

    return wrapper;
  },

  renderCell(td, val, path, key) {
    // 通用属性
    td.setAttribute("data-path", path);
    td.setAttribute("data-key", key);
    td.classList.add("cell-value-wrapper");
    td.setAttribute("tabindex", "-1");
    // 右键菜单
    td.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showContextMenu(e.clientX, e.clientY, {
        type: "cell",
        path,
        value: val,
      });
    });
    if (path) {
      const menuBtn = document.createElement("button");
      menuBtn.className = "node-focus-menu-btn";
      menuBtn.type = "button";
      menuBtn.title = "节点菜单";
      menuBtn.textContent = "⋯";
      menuBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = menuBtn.getBoundingClientRect();
        this.showContextMenu(rect.right - 8, rect.bottom + 4, {
          type: "cell",
          path,
          value: val,
          fromNodeMenu: true,
        });
      });
      td.appendChild(menuBtn);
    }
    if (val === null || val === undefined) {
      td.setAttribute("data-editable", "true");
      const span = document.createElement("span");
      span.className = "cell-value null";
      span.setAttribute("data-path", path);
      span.setAttribute("data-key", key);
      span.setAttribute("data-type", "null");
      span.setAttribute("contenteditable", "false");
      span.setAttribute("spellcheck", "false");
      span.textContent = "null";
      td.appendChild(span);
    } else if (typeof val === "object") {
      // Nested object/array — controlled by column header toggle
      td.setAttribute("data-editable", "false");
      td.classList.add("cell-nested");
      const collKey = this.getColumnStateKey(path);
      const isExpanded = this.columnStates[collKey] !== false;
      if (isExpanded) {
        const nestedContainer = document.createElement("div");
        nestedContainer.className = "nested-content";
        nestedContainer.appendChild(this.createTable(val, path));
        td.appendChild(nestedContainer);
      } else {
        td.classList.add("is-collapsed");
        const preview = document.createElement("div");
        preview.className = "nested-preview";
        const badge = document.createElement("span");
        badge.className = "nested-badge";
        badge.textContent = Array.isArray(val)
          ? `[${val.length}]`
          : `{${Object.keys(val).length}}`;
        preview.appendChild(badge);
        const summary = document.createElement("span");
        summary.className = "nested-summary-text";
        const summaryPreview = this.summarize(val);
        summary.textContent = summaryPreview.displayText;
        summary.title = summaryPreview.titleText;
        preview.appendChild(summary);
        td.appendChild(preview);
      }
    } else {
      // Primitive value
      td.setAttribute("data-editable", "true");
      const span = document.createElement("span");
      const type = typeof val;
      const modelNode = this.modelNodeMap ? this.modelNodeMap[path] : null;
      const isCodeText = modelNode?.kind === "codeText";
      span.className = `cell-value ${type}${isCodeText ? " code-text" : ""}`;
      span.setAttribute("data-path", path);
      span.setAttribute("data-key", key);
      span.setAttribute("data-type", type);
      span.setAttribute("contenteditable", "false");
      span.setAttribute("spellcheck", "false");
      span.textContent = String(val);
      if (isCodeText)
        span.title =
          "JS code expression (e.g. function, Date). Editing converts it to a string.";
      td.appendChild(span);
    }
  },

  summarize(val) {
    if (Array.isArray(val) || (typeof val === "object" && val !== null)) {
      try {
        const fullText = JSON.stringify(val);
        const maxCharsPerLine = 150;
        const maxLines = 9;
        const lines = [];

        for (let index = 0; index < fullText.length; index += maxCharsPerLine) {
          lines.push(fullText.slice(index, index + maxCharsPerLine));
          if (lines.length > maxLines) {
            return {
              displayText: "...",
              titleText: fullText,
            };
          }
        }

        return {
          displayText: lines.join("\n"),
          titleText: fullText,
        };
      } catch (error) {
        const fallback = Array.isArray(val) ? "[]" : "{}";
        return {
          displayText: fallback,
          titleText: fallback,
        };
      }
    }
    return {
      displayText: "",
      titleText: "",
    };
  },

  isEditableHeader(th) {
    return !!th && th.matches('th[data-header-editable="true"]');
  },

  getHeaderFromTarget(target) {
    return target?.closest?.('th[data-header-editable="true"]') || null;
  },

  getSelectableColumnHeaderFromTarget(target) {
    const header = target?.closest?.("th") || null;
    if (!header || header.classList.contains("row-num-header")) return null;
    const table = header.closest("table.json-table");
    if (!table || !table.tHead?.rows?.[0]?.contains(header)) return null;
    if (
      !header.matches('th[data-header-editable="true"]') &&
      !header.textContent.trim()
    )
      return null;
    return header;
  },

  findHeaderByPath(path, key) {
    const headers = Array.from(
      document.querySelectorAll('th[data-header-editable="true"]'),
    );
    return (
      headers.find(
        (header) =>
          (header.dataset.headerPath || "") === (path || "") &&
          header.dataset.headerKey === key,
      ) || null
    );
  },

  clearDragVisuals() {
    document
      .querySelectorAll(".drag-source, .drag-over-before, .drag-over-after")
      .forEach((element) => {
        element.classList.remove(
          "drag-source",
          "drag-over-before",
          "drag-over-after",
        );
      });
  },

  finishStructureDrag() {
    this.clearDragVisuals();
    this.dragState = null;
  },

  beginStructureDrag(payload, sourceElement, event) {
    if (!event.dataTransfer) return;
    this.finishStructureDrag();
    this.dragState = { ...payload };
    sourceElement?.classList.add("drag-source");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "text/plain",
      `${payload.type}:${payload.path || payload.arrayPath || ""}`,
    );
  },

  updateDragTarget(targetElement, position) {
    document
      .querySelectorAll(".drag-over-before, .drag-over-after")
      .forEach((element) => {
        if (element !== targetElement) {
          element.classList.remove("drag-over-before", "drag-over-after");
        }
      });
    if (!targetElement) return;
    targetElement.classList.remove("drag-over-before", "drag-over-after");
    targetElement.classList.add(
      position === "before" ? "drag-over-before" : "drag-over-after",
    );
  },

  getColumnKeys(target) {
    if (Array.isArray(target)) {
      const keys = [];
      const seen = new Set();
      for (const row of target) {
        if (!row || typeof row !== "object" || Array.isArray(row)) continue;
        for (const key of Object.keys(row)) {
          if (!seen.has(key)) {
            seen.add(key);
            keys.push(key);
          }
        }
      }
      return keys;
    }
    if (target && typeof target === "object") {
      return Object.keys(target);
    }
    return [];
  },

  reorderList(items, sourceItem, targetItem, position = "after") {
    const nextItems = [...items];
    const sourceIndex = nextItems.indexOf(sourceItem);
    const targetIndex = nextItems.indexOf(targetItem);
    if (sourceIndex === -1 || targetIndex === -1 || sourceItem === targetItem)
      return items;
    nextItems.splice(sourceIndex, 1);
    const adjustedTargetIndex = nextItems.indexOf(targetItem);
    const insertIndex =
      position === "before" ? adjustedTargetIndex : adjustedTargetIndex + 1;
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

  moveColumn(path, sourceKey, targetKey, position = "after") {
    const target = this.getValueAtPath(this.data, path);
    if (target === undefined || target === null) {
      return this.setStatus("未找到列所在对象", true);
    }
    const currentOrder = this.getColumnKeys(target);
    if (
      !currentOrder.includes(sourceKey) ||
      !currentOrder.includes(targetKey) ||
      sourceKey === targetKey
    )
      return;
    const nextOrder = this.reorderList(
      currentOrder,
      sourceKey,
      targetKey,
      position,
    );
    if (nextOrder.join("|") === currentOrder.join("|")) return;

    const selectedPath =
      this.selectedCell?.dataset?.path ||
      this.selectedRangeCells[0]?.dataset?.path ||
      null;
    this.pushUndo();
    if (Array.isArray(target)) {
      for (const row of target) {
        if (!row || typeof row !== "object" || Array.isArray(row)) continue;
        this.rebuildObjectWithKeyOrder(row, nextOrder);
      }
    } else {
      this.rebuildObjectWithKeyOrder(target, nextOrder);
    }
    this.pendingCellSelection = selectedPath;
    this.render();
    this.setStatus(`已调整列顺序：${sourceKey}`);
  },

  moveRow(arrayPath, sourceIndex, targetIndex) {
    const arr = this.getValueAtPath(this.data, arrayPath);
    if (!Array.isArray(arr)) return this.setStatus("路径不是数组", true);
    if (
      sourceIndex === targetIndex ||
      sourceIndex < 0 ||
      targetIndex < 0 ||
      sourceIndex >= arr.length ||
      targetIndex >= arr.length
    )
      return;
    this.pushUndo();
    const [movedItem] = arr.splice(sourceIndex, 1);
    arr.splice(targetIndex, 0, movedItem);
    this.pendingCellSelection = this.getArrayItemFocusPath(
      arrayPath,
      targetIndex,
      movedItem,
    );
    this.nestedStates = {};
    this.render();
    this.setStatus(`已调整行顺序到第 ${targetIndex + 1} 行`);
  },

  selectColumnByHeader(header) {
    const table = header?.closest("table.json-table");
    const headerRow = header?.closest("tr");
    if (!table || !headerRow || !table.tBodies?.[0]) return;
    const actualIndex = Array.from(headerRow.children).indexOf(header);
    const columnIndex = actualIndex - 1;
    if (columnIndex < 0) return;

    const cells = Array.from(table.tBodies[0].rows)
      .map((row) => this.getRowSelectableCells(row)[columnIndex])
      .filter(Boolean);
    if (cells.length === 0) return;

    if (this.editingCell && !cells.includes(this.editingCell)) {
      this.finishEdit(this.editingCell);
    }

    this.selectRange(cells[0], cells[cells.length - 1]);
    this.clearHeaderRowHighlights();
    header.classList.add("header-highlight");
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
    const text = input.value || "";
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = style.font || `${style.fontSize} ${style.fontFamily}`;

    // Binary search character index by measured width
    let low = 0,
      high = text.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const w = ctx.measureText(text.slice(0, mid)).width;
      if (w < x) low = mid + 1;
      else high = mid;
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
      const existingInput = th.querySelector(".header-editor");
      if (existingInput && options.selectAll)
        this.selectHeaderText(existingInput);
      return;
    }

    const label = th.querySelector(".header-label");
    const originalValue = th.dataset.headerKey || label?.textContent || "";
    th.classList.add("header-editing");
    th.innerHTML = "";

    const input = document.createElement("input");
    input.className = "header-editor";
    input.type = "text";
    input.value = originalValue;
    input.dataset.originalValue = originalValue;
    th.appendChild(input);
    this.editingHeader = th;
    input.addEventListener("mousedown", (e) => e.stopPropagation());
    input.addEventListener("pointerdown", (e) => e.stopPropagation());
    input.addEventListener("click", (e) => e.stopPropagation());
    input.addEventListener("dblclick", (e) => e.stopPropagation());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.commitHeaderEdit(th);
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.cancelHeaderEdit(th);
      }
    });
    input.addEventListener("blur", () => {
      if (this.editingHeader === th) this.commitHeaderEdit(th);
    });

    if (options.selectAll) {
      requestAnimationFrame(() => this.selectHeaderText(input));
    } else if (typeof options.clientX === "number") {
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
    const input = th.querySelector(".header-editor");
    const nextKey = input?.value?.trim() || "";
    const originalKey =
      th.dataset.headerKey || input?.dataset.originalValue || "";
    this.editingHeader = null;

    if (!nextKey) {
      this.render();
      this.setStatus("列标题不能为空", true);
      return;
    }

    if (nextKey === originalKey) {
      this.render();
      this.setStatus("列标题未修改");
      return;
    }

    this.renameColumn(th.dataset.headerPath || "", originalKey, nextKey);
  },

  cancelHeaderEdit(th) {
    if (!th || this.editingHeader !== th) return;
    this.editingHeader = null;
    this.render();
    this.setStatus("已取消列标题修改");
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

  renameColumn(path, oldKey, newKey) {
    const target = this.getValueAtPath(this.data, path);
    if (target === undefined || target === null) {
      this.render();
      this.setStatus("未找到要修改的对象", true);
      return;
    }

    try {
      this.pushUndo();
      if (Array.isArray(target)) {
        const rows = target.filter(
          (item) => item && typeof item === "object" && !Array.isArray(item),
        );
        if (
          rows.some(
            (row) =>
              Object.prototype.hasOwnProperty.call(row, newKey) &&
              newKey !== oldKey,
          )
        ) {
          throw new Error("新列标题已存在");
        }
        for (const row of rows) {
          if (Object.prototype.hasOwnProperty.call(row, oldKey)) {
            this.renameObjectKey(row, oldKey, newKey);
          }
        }
      } else if (typeof target === "object") {
        if (
          Object.prototype.hasOwnProperty.call(target, newKey) &&
          newKey !== oldKey
        ) {
          throw new Error("新列标题已存在");
        }
        this.renameObjectKey(target, oldKey, newKey);
      } else {
        throw new Error("当前节点不支持修改列标题");
      }

      this.render();
      this.setStatus(`已将列标题修改为 ${newKey}`);
    } catch (error) {
      this.render();
      this.setStatus(error.message || "列标题修改失败", true);
    }
  },

  getNextColumnName(target, baseName = "新列") {
    if (!target || typeof target !== "object" || Array.isArray(target))
      return baseName;
    if (!Object.prototype.hasOwnProperty.call(target, baseName))
      return baseName;
    let index = 2;
    while (
      Object.prototype.hasOwnProperty.call(target, `${baseName}${index}`)
    ) {
      index += 1;
    }
    return `${baseName}${index}`;
  },

  getNextColumnNameFromKeys(existingKeys, baseName = "新列") {
    const keySet = new Set(existingKeys || []);
    if (!keySet.has(baseName)) return baseName;
    let index = 2;
    while (keySet.has(`${baseName}${index}`)) {
      index += 1;
    }
    return `${baseName}${index}`;
  },

  insertObjectKey(
    target,
    anchorKey,
    newKey,
    position = "after",
    defaultValue = null,
  ) {
    const nextObject = {};
    let inserted = false;
    for (const key of Object.keys(target)) {
      if (key === anchorKey && position === "before" && !inserted) {
        nextObject[newKey] = defaultValue;
        inserted = true;
      }
      nextObject[key] = target[key];
      if (key === anchorKey && position === "after" && !inserted) {
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
    const cellValue = e.target.closest(".cell-value");
    if (!cellValue) return;
    const td = cellValue.closest("td.cell-value-wrapper");
    if (!td || this.editingCell === td) return;
    this.selectCell(td);
  },

  activateEditable(span, enabled) {
    span.setAttribute("contenteditable", enabled ? "plaintext-only" : "false");
  },

  isSelectableCell(td) {
    return !!td && td.matches("td.cell-value-wrapper, td.cell-nested");
  },

  isEditableCell(td) {
    return !!td && td.matches('td.cell-value-wrapper[data-editable="true"]');
  },

  getSelectableCellFromTarget(target) {
    return target?.closest?.("td.cell-value-wrapper, td.cell-nested") || null;
  },

  setHoveredCell(td) {
    if (this.hoveredCell === td) return;
    if (this.hoveredCell) this.hoveredCell.classList.remove("is-hover-target");
    this.hoveredCell = this.isSelectableCell(td) ? td : null;
    if (
      this.hoveredCell &&
      this.hoveredCell !== this.selectedCell &&
      this.hoveredCell !== this.editingCell &&
      !this.hoveredCell.classList.contains("is-range-selected")
    ) {
      this.hoveredCell.classList.add("is-hover-target");
    }
  },

  clearRangeSelection() {
    for (const cell of this.selectedRangeCells) {
      if (!cell) continue;
      cell.classList.remove(
        "is-range-selected",
        "range-edge-top",
        "range-edge-right",
        "range-edge-bottom",
        "range-edge-left",
      );
      const handle = cell.querySelector(":scope > .selection-fill-handle");
      if (handle) handle.remove();
    }
    this.selectedRangeCells = [];
  },

  updateRangeVisuals() {
    const cells = this.getSelectedCells();
    if (cells.length === 0) return;

    for (const cell of cells) {
      cell.classList.remove(
        "range-edge-top",
        "range-edge-right",
        "range-edge-bottom",
        "range-edge-left",
      );
      const handle = cell.querySelector(":scope > .selection-fill-handle");
      if (handle) handle.remove();
    }

    const coordinates = cells
      .map((cell) => ({ cell, ...this.getCellCoordinates(cell) }))
      .filter((entry) => entry.table);
    if (coordinates.length === 0) return;

    const rowStart = Math.min(...coordinates.map((entry) => entry.rowIndex));
    const rowEnd = Math.max(...coordinates.map((entry) => entry.rowIndex));
    const colStart = Math.min(...coordinates.map((entry) => entry.colIndex));
    const colEnd = Math.max(...coordinates.map((entry) => entry.colIndex));

    for (const entry of coordinates) {
      entry.cell.classList.add("is-range-selected");
      if (entry.rowIndex === rowStart)
        entry.cell.classList.add("range-edge-top");
      if (entry.rowIndex === rowEnd)
        entry.cell.classList.add("range-edge-bottom");
      if (entry.colIndex === colStart)
        entry.cell.classList.add("range-edge-left");
      if (entry.colIndex === colEnd)
        entry.cell.classList.add("range-edge-right");
    }

    const handleCell = coordinates.find(
      (entry) => entry.rowIndex === rowEnd && entry.colIndex === colEnd,
    )?.cell;
    if (handleCell) {
      const handle = document.createElement("div");
      handle.className = "selection-fill-handle";
      handle.title = "拖拽填充";
      handleCell.appendChild(handle);
    }
  },

  selectRowByNumberCell(rowNumberCell) {
    const tr = rowNumberCell?.closest("tr");
    if (!tr) return;
    const rowCells = this.getRowSelectableCells(tr);
    if (rowCells.length === 0) return;

    if (this.editingCell && !tr.contains(this.editingCell)) {
      this.finishEdit(this.editingCell);
    }

    this.selectRange(rowCells[0], rowCells[rowCells.length - 1]);
    this.clearHeaderRowHighlights();
    rowNumberCell.classList.add("row-highlight");
  },

  selectCell(td, options = {}) {
    if (!this.isSelectableCell(td)) return;
    if (!options.keepRange) {
      this.clearRangeSelection();
    }
    if (this.selectedCell && this.selectedCell !== td) {
      this.selectedCell.classList.remove("is-selected");
    }
    this.selectedCell = td;
    if (!options.keepAnchor) {
      this.selectionAnchorCell = td;
    }
    if (!options.keepRange) {
      this.selectedRangeCells = [td];
    }
    td.classList.remove("is-hover-target");
    td.classList.add("is-selected");
    this.updateRangeVisuals();

    // Highlight matching header and row number when a single cell is selected
    this.clearHeaderRowHighlights();
    const selectedCells = this.getSelectedCells();
    if (selectedCells.length === 1) {
      const coords = this.getCellCoordinates(selectedCells[0]);
      if (coords && coords.table) {
        const table = coords.table;
        const { rowIndex, colIndex } = coords;
        const isArray = table.dataset.isArray === "true";
        if (table.tHead && table.tHead.rows.length > 0) {
          const thRow = table.tHead.rows[0];
          const thIndex = colIndex + (isArray ? 1 : 0);
          const th = thRow.children[thIndex];
          if (th) th.classList.add("header-highlight");
        }
        if (isArray) {
          const rowEl = table.tBodies[0].rows[rowIndex];
          if (rowEl) {
            const rowNumCell = rowEl.querySelector("td.row-num");
            if (rowNumCell) rowNumCell.classList.add("row-highlight");
          }
        }
      }
    }

    td.focus({ preventScroll: true });
  },

  clearSelection() {
    this.clearRangeSelection();
    if (this.selectedCell) this.selectedCell.classList.remove("is-selected");
    this.selectedCell = null;
    this.selectionAnchorCell = null;
    this.clearHeaderRowHighlights();
  },

  clearHeaderRowHighlights() {
    document
      .querySelectorAll("th.header-highlight")
      .forEach((th) => th.classList.remove("header-highlight"));
    document
      .querySelectorAll("td.row-num.row-highlight")
      .forEach((td) => td.classList.remove("row-highlight"));
  },

  getCellCoordinates(td) {
    if (!this.isSelectableCell(td)) return null;
    const table = td.closest("table.json-table");
    const tr = td.closest("tr");
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
    if (!this.isSelectableCell(anchorCell) || !this.isSelectableCell(endCell))
      return;
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
        cell.classList.remove("is-hover-target");
      }
    }

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
    return (
      element.contains(range.startContainer) &&
      element.contains(range.endContainer)
    );
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
    const lineBreak = document.createTextNode("\n");
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
      const activeSpan = td.querySelector(".cell-value");
      if (
        activeSpan &&
        typeof options.clientX === "number" &&
        typeof options.clientY === "number"
      ) {
        activeSpan.focus();
        this.placeCaretFromPoint(activeSpan, options.clientX, options.clientY);
      }
      return;
    }

    if (this.editingCell && this.editingCell !== td) {
      this.finishEdit(this.editingCell);
    }

    const span = td.querySelector(".cell-value");
    if (!span) return;

    this.selectCell(td);
    this.editingCell = td;
    td.classList.add("is-editing");
    span.dataset.originalValue = span.textContent;
    this.activateEditable(span, true);
    if (options.replaceText !== undefined) {
      span.textContent = options.replaceText;
    }
    span.focus();

    if (options.replaceText !== undefined) {
      this.placeCaretAtEnd(span);
    } else if (
      typeof options.clientX === "number" &&
      typeof options.clientY === "number"
    ) {
      this.placeCaretFromPoint(span, options.clientX, options.clientY);
    } else {
      this.placeCaretAtEnd(span);
    }
  },

  commitEdit(td, moveDirection = null) {
    if (!this.isEditableCell(td)) return;
    const span = td.querySelector(".cell-value");
    if (!span) return;

    const path = td.dataset.path || span.dataset.path || "";
    const originalValue = span.dataset.originalValue ?? span.textContent;
    const raw = span.textContent.replace(/\r\n?/g, "\n");
    const nextPath = moveDirection
      ? this.findAdjacentCellPath(td, moveDirection)
      : null;
    this.activateEditable(span, false);
    td.classList.remove("is-editing");
    this.editingCell = null;

    if (raw === originalValue) {
      this.selectCell(td);
      if (nextPath) this.selectCellByPath(nextPath);
      return;
    }

    const newVal = this.parseValue(raw);
    if (newVal.error) {
      span.textContent = originalValue;
      this.setStatus("值格式错误: " + newVal.error, true);
      this.selectCell(td);
      return;
    }

    try {
      this.pushUndo();
      this.setValueAtPath(this.data, path, newVal.value);
      if (this.model)
        this.setValueAtPathInModel(this.model, path, newVal.value);
      this.setStatus("已更新: " + path);
      this.render();
      this.selectCellByPath(nextPath || path);
    } catch (err) {
      this.setStatus("更新失败: " + err.message, true);
    }
  },

  finishEdit(td, moveDirection = null) {
    if (!td || this.editingCell !== td) return;
    this.commitEdit(td, moveDirection);
  },

  cancelEdit(td) {
    if (!td || this.editingCell !== td) return;
    const span = td.querySelector(".cell-value");
    if (!span) return;
    span.textContent = span.dataset.originalValue ?? span.textContent;
    this.activateEditable(span, false);
    td.classList.remove("is-editing");
    this.editingCell = null;
    this.selectCell(td);
  },

  normalizeClipboardRows(text) {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .filter((row, index, rows) => row.length > 0 || index < rows.length - 1);
  },

  parseClipboardMatrix(text) {
    const rows = this.normalizeClipboardRows(text);
    if (rows.length === 0) return [[]];
    return rows.map((row) => row.split("\t"));
  },

  serializeValueForClipboard(val) {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") {
      try {
        return JSON.stringify(val);
      } catch (error) {
        return "";
      }
    }
    return String(val);
  },

  getCellClipboardValue(td) {
    const path = td?.dataset?.path;
    if (!path) return "";
    return this.serializeValueForClipboard(
      this.getValueAtPath(this.data, path),
    );
  },

  getSelectionMatrix() {
    const cells = this.getSelectedCells();
    if (cells.length === 0) return [];
    if (cells.length === 1) return [[this.getCellClipboardValue(cells[0])]];

    const coordinates = cells
      .map((cell) => ({ cell, ...this.getCellCoordinates(cell) }))
      .filter((entry) => entry.table);
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
        values.push(cell ? this.getCellClipboardValue(cell) : "");
      }
      matrix.push(values);
    }
    return matrix;
  },

  captureSelectionState() {
    const paths = this.getSelectedCells()
      .map((cell) => cell?.dataset?.path)
      .filter(Boolean);
    return {
      paths,
      activePath: this.selectedCell?.dataset?.path || null,
      anchorPath: this.selectionAnchorCell?.dataset?.path || null,
    };
  },

  restoreSelectionState(state) {
    if (!state?.paths?.length) return;
    const cells = state.paths
      .map((path) => this.findCellByPath(path))
      .filter(Boolean);
    const activeCell = state.activePath
      ? this.findCellByPath(state.activePath)
      : cells[cells.length - 1];
    const anchorCell = state.anchorPath
      ? this.findCellByPath(state.anchorPath)
      : cells[0];
    if (!activeCell) return;

    this.clearRangeSelection();
    this.selectedRangeCells = cells;
    this.selectionAnchorCell = anchorCell || activeCell;
    if (this.selectedCell && this.selectedCell !== activeCell) {
      this.selectedCell.classList.remove("is-selected");
    }
    this.selectedCell = activeCell;
    this.selectedCell.classList.add("is-selected");
    this.updateRangeVisuals();
    this.selectedCell.focus({ preventScroll: true });
  },

  getRangeRectFromCells(cells) {
    const coordinates = cells
      .map((cell) => ({ cell, ...this.getCellCoordinates(cell) }))
      .filter((entry) => entry.table);
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
    const fillRange =
      matrix.length === 1 && matrix[0].length === 1 && this.hasRangeSelection();

    if (fillRange) {
      const value = matrix[0][0];
      for (const cell of this.getSelectedCells()) {
        if (!this.isEditableCell(cell)) continue;
        updates.push({ path: cell.dataset.path, raw: value });
      }
    } else {
      for (let rowOffset = 0; rowOffset < matrix.length; rowOffset++) {
        for (
          let colOffset = 0;
          colOffset < matrix[rowOffset].length;
          colOffset++
        ) {
          const cell = this.getCellByCoordinates(
            anchor.table,
            anchor.rowIndex + rowOffset,
            anchor.colIndex + colOffset,
          );
          if (!cell || !this.isEditableCell(cell)) continue;
          updates.push({
            path: cell.dataset.path,
            raw: matrix[rowOffset][colOffset],
          });
        }
      }
    }

    if (updates.length === 0) return false;

    const parsedUpdates = [];
    for (const update of updates) {
      const parsed = this.parseValue(update.raw);
      if (parsed.error) {
        this.setStatus("值格式错误: " + parsed.error, true);
        return false;
      }
      parsedUpdates.push({ path: update.path, value: parsed.value });
    }

    const selectionState =
      options.selectionState || this.captureSelectionState();

    this.pushUndo();
    for (const update of parsedUpdates) {
      this.setValueAtPath(this.data, update.path, update.value);
    }

    this.render();
    this.restoreSelectionState(
      options.preserveSelection
        ? selectionState
        : {
            paths: parsedUpdates.map((update) => update.path),
            activePath:
              options.activePath ||
              parsedUpdates[parsedUpdates.length - 1].path,
            anchorPath: options.anchorPath || parsedUpdates[0].path,
          },
    );
    this.setStatus(
      options.statusMessage || `已粘贴 ${parsedUpdates.length} 个单元格`,
    );
    return true;
  },

  applyFillDrag() {
    if (!this.fillSourceRect || !this.fillSourceMatrix) return false;
    const targetRect = this.getRangeRectFromCells(this.getSelectedCells());
    if (!targetRect || targetRect.table !== this.fillSourceRect.table)
      return false;

    const updates = [];
    for (let row = targetRect.rowStart; row <= targetRect.rowEnd; row++) {
      for (let col = targetRect.colStart; col <= targetRect.colEnd; col++) {
        const inSourceRect =
          row >= this.fillSourceRect.rowStart &&
          row <= this.fillSourceRect.rowEnd &&
          col >= this.fillSourceRect.colStart &&
          col <= this.fillSourceRect.colEnd;
        if (inSourceRect) continue;
        const cell = this.getCellByCoordinates(targetRect.table, row, col);
        if (!cell || !this.isEditableCell(cell)) continue;
        const sourceRow =
          (((row - this.fillSourceRect.rowStart) %
            this.fillSourceMatrix.length) +
            this.fillSourceMatrix.length) %
          this.fillSourceMatrix.length;
        const sourceCol =
          (((col - this.fillSourceRect.colStart) %
            this.fillSourceMatrix[0].length) +
            this.fillSourceMatrix[0].length) %
          this.fillSourceMatrix[0].length;
        updates.push({
          path: cell.dataset.path,
          raw: this.fillSourceMatrix[sourceRow][sourceCol],
        });
      }
    }

    if (updates.length === 0) return false;

    const parsed = updates.map((update) => ({
      ...update,
      parsed: this.parseValue(update.raw),
    }));
    const error = parsed.find((item) => item.parsed.error);
    if (error) {
      this.setStatus("值格式错误: " + error.parsed.error, true);
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
    if (trimmed === "null" || trimmed === "") return { value: null };
    if (trimmed === "true") return { value: true };
    if (trimmed === "false") return { value: false };

    // Try number
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
      return { value: Number(trimmed) };
    }

    // Try JSON parse (for objects/arrays typed inline)
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
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
      if (typeof part === "number") {
        current = current[part];
      } else {
        current = current[part];
      }
    }
    return current;
  },

  // ===== Row Operations =====
  createArrayItemTemplate(arr) {
    const isPlainObject = (value) =>
      value !== null && typeof value === "object" && !Array.isArray(value);
    const isPureObjectArray =
      arr.length > 0 && arr.every((item) => isPlainObject(item));

    if (arr.length === 0) {
      return this.nullAsString ? "" : null;
    }

    if (isPureObjectArray) {
      const template = {};
      for (const key of Object.keys(arr[0])) {
        template[key] = this.nullAsString ? "" : null;
      }
      return template;
    }

    return this.nullAsString ? "" : null;
  },

  getArrayItemFocusPath(arrayPath, index, itemValue) {
    const itemPath = `${arrayPath}[${index}]`;
    if (
      itemValue &&
      typeof itemValue === "object" &&
      !Array.isArray(itemValue)
    ) {
      const keys = Object.keys(itemValue);
      if (keys.length > 0) return `${itemPath}.${keys[0]}`;
    }
    return itemPath;
  },

  getColumnFocusPath(path, target, deletedKey) {
    const selectedPath = this.selectedCell?.dataset?.path || null;
    let currentKeys = [];

    if (Array.isArray(target)) {
      const firstObjectRow = target.find(
        (item) => item && typeof item === "object" && !Array.isArray(item),
      );
      currentKeys = firstObjectRow ? Object.keys(firstObjectRow) : [];
    } else if (target && typeof target === "object") {
      currentKeys = Object.keys(target);
    }

    const deletedIndex = currentKeys.indexOf(deletedKey);
    const remainingKeys = currentKeys.filter((key) => key !== deletedKey);
    if (remainingKeys.length === 0) return null;

    const focusKey =
      remainingKeys[
        Math.min(Math.max(deletedIndex, 0), remainingKeys.length - 1)
      ];

    if (Array.isArray(target)) {
      let rowBase = null;
      if (selectedPath && selectedPath.startsWith(`${path}[`)) {
        const lastDot = selectedPath.lastIndexOf(".");
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
    const arr = this.getValueAtPath(this.data, arrayPath);
    if (!Array.isArray(arr)) return this.setStatus("路径不是数组", true);
    this.pushUndo();
    const newItem = this.createArrayItemTemplate(arr);
    arr.push(newItem);
    this.pendingCellSelection = this.getArrayItemFocusPath(
      arrayPath,
      arr.length - 1,
      newItem,
    );
    this.nestedStates = {}; // reset collapse states
    this.render();
    this.setStatus("已添加新行");
  },

  insertRow(arrayPath, index, position = "after") {
    const arr = this.getValueAtPath(this.data, arrayPath);
    if (!Array.isArray(arr)) return this.setStatus("路径不是数组", true);
    const insertIndex = position === "before" ? index : index + 1;
    this.pushUndo();
    const newItem = this.createArrayItemTemplate(arr);
    arr.splice(insertIndex, 0, newItem);
    this.pendingCellSelection = this.getArrayItemFocusPath(
      arrayPath,
      insertIndex,
      newItem,
    );
    this.nestedStates = {};
    this.render();
    this.setStatus(
      position === "before"
        ? `已在第 ${index + 1} 行前插入新项`
        : `已在第 ${index + 1} 行后插入新项`,
    );
  },

  addColumn(objectPath) {
    const target = this.getValueAtPath(this.data, objectPath);
    if (!target || typeof target !== "object") {
      return this.setStatus("当前节点不是对象，无法添加列", true);
    }

    let newKey = "新列";
    this.pushUndo();
    if (Array.isArray(target)) {
      const rows = target.filter(
        (item) => item && typeof item === "object" && !Array.isArray(item),
      );
      const existingKeys = rows.flatMap((row) => Object.keys(row));
      newKey = this.getNextColumnNameFromKeys(existingKeys);
      for (const row of rows) {
        row[newKey] = this.nullAsString ? "" : null;
      }
    } else {
      newKey = this.getNextColumnName(target);
      target[newKey] = this.nullAsString ? "" : null;
    }
    this.pendingHeaderEdit = { path: objectPath || "", key: newKey };
    this.render();
    this.setStatus("已添加新列，请输入列标题");
  },

  insertColumn(path, anchorKey, position = "after") {
    const target = this.getValueAtPath(this.data, path);
    if (target === undefined || target === null) {
      return this.setStatus("未找到列所在对象", true);
    }

    try {
      this.pushUndo();
      let newKey = "新列";
      if (Array.isArray(target)) {
        const rows = target.filter(
          (item) => item && typeof item === "object" && !Array.isArray(item),
        );
        const existingKeys = rows.flatMap((row) => Object.keys(row));
        newKey = this.getNextColumnNameFromKeys(existingKeys);
        for (const row of rows) {
          this.insertObjectKey(
            row,
            anchorKey,
            newKey,
            position,
            this.nullAsString ? "" : null,
          );
        }
      } else if (typeof target === "object") {
        newKey = this.getNextColumnName(target);
        this.insertObjectKey(
          target,
          anchorKey,
          newKey,
          position,
          this.nullAsString ? "" : null,
        );
      } else {
        throw new Error("当前节点不是对象，无法插入列");
      }
      this.pendingHeaderEdit = { path: path || "", key: newKey };
      this.render();
      this.setStatus(
        position === "before"
          ? `已在列 ${anchorKey} 前插入新列`
          : `已在列 ${anchorKey} 后插入新列`,
      );
    } catch (error) {
      this.render();
      this.setStatus(error.message || "插入列失败", true);
    }
  },

  deleteColumn(path, key) {
    const target = this.getValueAtPath(this.data, path);
    if (target === undefined || target === null) {
      return this.setStatus("未找到列所在对象", true);
    }

    try {
      this.pushUndo();
      const focusPath = this.getColumnFocusPath(path, target, key);
      if (Array.isArray(target)) {
        const rows = target.filter(
          (item) => item && typeof item === "object" && !Array.isArray(item),
        );
        for (const row of rows) {
          delete row[key];
        }
      } else if (typeof target === "object") {
        delete target[key];
      } else {
        throw new Error("当前节点不支持删除列");
      }
      this.pendingCellSelection = focusPath;
      this.render();
      this.setStatus(`已删除列 ${key}`);
    } catch (error) {
      this.render();
      this.setStatus(error.message || "删除列失败", true);
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
      this.pendingCellSelection = this.getArrayItemFocusPath(
        parentPath,
        fallbackIndex,
        arr[fallbackIndex],
      );
    } else {
      this.pendingCellSelection = null;
    }
    this.nestedStates = {};
    this.render();
    this.setStatus(`已删除行 [${index}]`);
  },

  getRowSelectableCells(tr) {
    return Array.from(tr.children).filter((cell) =>
      this.isSelectableCell(cell),
    );
  },

  findAdjacentCell(td, direction) {
    if (!this.isSelectableCell(td)) return null;
    const table = td.closest("table.json-table");
    const tr = td.closest("tr");
    if (!table || !tr || !table.tBodies[0]) return null;

    const rows = Array.from(table.tBodies[0].rows);
    const rowIndex = rows.indexOf(tr);
    if (rowIndex === -1) return null;

    const currentRowCells = this.getRowSelectableCells(tr);
    const colIndex = currentRowCells.indexOf(td);
    if (colIndex === -1) return null;

    if (direction === "left") return currentRowCells[colIndex - 1] || null;
    if (direction === "right") return currentRowCells[colIndex + 1] || null;

    const targetRow =
      direction === "up" ? rows[rowIndex - 1] : rows[rowIndex + 1];
    if (!targetRow) return null;

    const targetCells = this.getRowSelectableCells(targetRow);
    if (targetCells.length === 0) return null;
    return targetCells[Math.min(colIndex, targetCells.length - 1)] || null;
  },

  findAdjacentCellPath(td, direction) {
    return this.findAdjacentCell(td, direction)?.dataset.path || null;
  },

  findCellByPath(path) {
    if (!path) return null;
    return (
      Array.from(document.querySelectorAll("td[data-path]")).find(
        (cell) => cell.dataset.path === path,
      ) || null
    );
  },

  selectCellByPath(path) {
    const cell = this.findCellByPath(path);
    if (cell) this.selectCell(cell);
    return cell;
  },

  isPrintableKey(e) {
    return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
  },

  // ===== Keyboard =====
  handleKeydown(e) {
    const headerInput = e.target.closest(".header-editor");
    if (headerInput) return;

    const activeCell =
      this.editingCell ||
      this.selectedCell ||
      this.getSelectableCellFromTarget(e.target);
    const editingSpan = this.editingCell?.querySelector(".cell-value");

    if (
      this.editingCell &&
      editingSpan &&
      (e.target === editingSpan || editingSpan.contains(e.target))
    ) {
      if (e.key === "Escape") {
        e.preventDefault();
        this.cancelEdit(this.editingCell);
        return;
      }

      if (e.key === "Enter" && e.altKey) {
        e.preventDefault();
        this.insertLineBreakAtCaret(editingSpan);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        this.finishEdit(this.editingCell, "down");
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        this.finishEdit(this.editingCell, e.shiftKey ? "left" : "right");
      }
      return;
    }

    if (!activeCell) return;

    const keyToDirection = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
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

    if (
      (e.key === "Backspace" || e.key === "Delete") &&
      this.getSelectedCells().length > 0
    ) {
      e.preventDefault();
      this.applyMatrixToSelection([[""]], {
        preserveSelection: true,
        statusMessage: `已清空 ${this.getSelectedCells().length} 个单元格`,
      });
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const nextCell = this.findAdjacentCell(activeCell, "down");
      if (nextCell) this.selectCell(nextCell);
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const nextCell = this.findAdjacentCell(
        activeCell,
        e.shiftKey ? "left" : "right",
      );
      if (nextCell) this.selectCell(nextCell);
      return;
    }

    const direction = keyToDirection[e.key];
    if (!direction) return;
    e.preventDefault();
    const nextCell = this.findAdjacentCell(activeCell, direction);
    if (nextCell) this.selectCell(nextCell);
  },

  handleTableHover(e) {
    const cell = this.getSelectableCellFromTarget(e.target);
    if (this.isFillDragging && this.fillSourceRect && cell) {
      const target = this.getCellCoordinates(cell);
      if (target && target.table === this.fillSourceRect.table) {
        const rowStart = Math.min(
          this.fillSourceRect.rowStart,
          target.rowIndex,
        );
        const rowEnd = Math.max(this.fillSourceRect.rowEnd, target.rowIndex);
        const colStart = Math.min(
          this.fillSourceRect.colStart,
          target.colIndex,
        );
        const colEnd = Math.max(this.fillSourceRect.colEnd, target.colIndex);
        const previewStart = this.getCellByCoordinates(
          this.fillSourceRect.table,
          rowStart,
          colStart,
        );
        const previewEnd = this.getCellByCoordinates(
          this.fillSourceRect.table,
          rowEnd,
          colEnd,
        );
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

  handleTableMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest(".selection-fill-handle")) {
      if (!this.selectedCell) return;
      e.preventDefault();
      e.stopPropagation();
      this.isFillDragging = true;
      this.fillSourceMatrix = this.getSelectionMatrix();
      this.fillSourceRect = this.getRangeRectFromCells(this.getSelectedCells());
      return;
    }
    if (e.target.closest("button")) return;
    const cell = this.getSelectableCellFromTarget(e.target);
    if (!cell) return;

    if (this.editingCell && this.editingCell !== cell) {
      this.finishEdit(this.editingCell);
    }

    this.isMouseSelecting = true;
    this.mouseSelectionMoved = false;
    this.selectionAnchorCell =
      e.shiftKey && this.selectionAnchorCell ? this.selectionAnchorCell : cell;
    if (e.shiftKey && this.selectionAnchorCell) {
      this.selectRange(this.selectionAnchorCell, cell);
    } else {
      this.selectCell(cell);
    }
  },

  finishMouseSelection() {
    if (this.isFillDragging) {
      this.applyFillDrag();
      this.isFillDragging = false;
      this.fillSourceMatrix = null;
      this.fillSourceRect = null;
      return;
    }
    if (
      this.isMouseSelecting &&
      (this.mouseSelectionMoved || this.hasRangeSelection())
    ) {
      this.suppressNextClickSelection = true;
    }
    this.isMouseSelecting = false;
  },

  handleDocumentMouseMove(e) {
    if (!this.isMouseSelecting || !this.selectionAnchorCell) return;
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

  handleTableClickCapture(e) {
    if (!this.suppressNextClickSelection) return;
    e.preventDefault();
    e.stopPropagation();
    this.suppressNextClickSelection = false;
    this.mouseSelectionMoved = false;
  },

  handleTableDoubleClick(e) {
    const header = this.getHeaderFromTarget(e.target);
    if (
      header &&
      !e.target.closest(".nested-toggle, .col-resizer, .drag-handle")
    ) {
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
    if (this.editingHeader && !e.target.closest("th.header-editing")) {
      this.finishHeaderEdit(true);
    }

    const columnHeader = this.getSelectableColumnHeaderFromTarget(e.target);
    if (columnHeader) {
      if (!e.target.closest(".nested-toggle, .col-resizer, .drag-handle")) {
        this.selectColumnByHeader(columnHeader);
      }
      return;
    }

    const cell = this.getSelectableCellFromTarget(e.target);
    if (!cell) {
      if (!e.target.closest(".context-menu")) this.clearSelection();
      return;
    }

    if (this.suppressNextClickSelection) {
      this.suppressNextClickSelection = false;
      return;
    }

    if (
      this.editingCell &&
      this.editingCell !== cell &&
      !this.editingCell.contains(e.target)
    ) {
      this.finishEdit(this.editingCell);
    }

    this.selectCell(cell);
  },

  handleCopy(e) {
    if (this.editingCell || this.getSelectedCells().length === 0) return;
    const matrix = this.getSelectionMatrix();
    if (matrix.length === 0) return;
    const text = matrix.map((row) => row.join("\t")).join("\n");
    e.preventDefault();
    e.clipboardData.setData("text/plain", text);
    this.setStatus(`已复制 ${matrix.length} 行 ${matrix[0]?.length || 0} 列`);
  },

  handleCut(e) {
    if (this.editingCell || this.getSelectedCells().length === 0) return;
    const matrix = this.getSelectionMatrix();
    if (matrix.length === 0) return;
    const text = matrix.map((row) => row.join("\t")).join("\n");
    e.preventDefault();
    e.clipboardData.setData("text/plain", text);
    this.applyMatrixToSelection([[""]], {
      preserveSelection: true,
      statusMessage: `已剪切 ${this.getSelectedCells().length} 个单元格`,
    });
  },

  handlePaste(e) {
    if (this.editingCell || !this.selectedCell) return;
    const text = e.clipboardData?.getData("text/plain");
    if (!text) return;
    e.preventDefault();
    this.applyMatrixToSelection(this.parseClipboardMatrix(text));
  },

  handleTableContextMenu(e) {
    // 保持 corner、header 菜单
    const cornerTh = e.target.closest("th.row-num-header");
    if (cornerTh && cornerTh.closest("table.json-table")) {
      e.preventDefault();
      const table = cornerTh.closest("table.json-table");
      this.showContextMenu(e.clientX, e.clientY, {
        type: "corner",
        tablePath: table.dataset.path || "",
        isArray: table.dataset.isArray === "true",
        tableId: table.dataset.path || "",
      });
      return;
    }
    // cell/行号右键已在renderCell和createTable里处理，这里只保留header
    const header = this.getHeaderFromTarget(e.target);
    if (header && !e.target.closest(".nested-toggle, .col-resizer")) {
      e.preventDefault();
      this.showContextMenu(e.clientX, e.clientY, {
        type: "header",
        path: header.dataset.headerPath || "",
        key: header.dataset.headerKey || "",
      });
    }
  },

  handleContextMenuAction(e) {
    const item = e.target.closest(".menu-item[data-action]");
    if (!item || !this.contextMenuState) return;
    e.stopPropagation();
    const action = item.dataset.action;
    const state = this.contextMenuState;
    this.hideContextMenu();
    const isPlainObject = (value) =>
      value !== null && typeof value === "object" && !Array.isArray(value);

    // cell/row类型切换
    const convertValue = (val, type) => {
      if (type === "array") return Array.isArray(val) ? val : [val];
      if (type === "object") {
        if (val && typeof val === "object" && !Array.isArray(val)) return val;
        if (Array.isArray(val)) {
          // 若首元素为object直接用，否则包value
          const first = val.length > 0 ? val[0] : null;
          if (first && typeof first === "object" && !Array.isArray(first))
            return first;
          return { value: first ?? null };
        }
        return { value: val };
      }
      if (type === "single") {
        // 递归只保留第一个元素/字段的值
        if (Array.isArray(val)) {
          if (val.length === 0) return null;
          return convertValue(val[0], "single");
        }
        if (val && typeof val === "object") {
          const keys = Object.keys(val);
          if (keys.length === 0) return null;
          return convertValue(val[keys[0]], "single");
        }
        return val;
      }
      if (type === "string") return val == null ? "" : String(val);
      if (type === "number") return Number(val) || 0;
      if (type === "boolean") return Boolean(val);
      if (type === "null") return null;
      return val;
    };

    if (state.type === "cell" || state.type === "row") {
      const path = state.path;
      if (state.type === "cell" && !path) return;
      if (action === "focus-node") {
        this.setFocusPath(path || "");
        return;
      }
      if (
        action === "insert-row-before" &&
        state.type === "row" &&
        state.isArrayRow
      ) {
        this.insertRow(state.arrayPath || "", state.rowIndex, "before");
        return;
      }
      if (
        action === "insert-row-after" &&
        state.type === "row" &&
        state.isArrayRow
      ) {
        this.insertRow(state.arrayPath || "", state.rowIndex, "after");
        return;
      }
      if (action === "delete-current-row" && state.type === "row") {
        if (state.isArrayRow) {
          this.deleteRow(state.arrayPath || "", state.rowIndex);
        } else {
          this.pushUndo();
          this.setValueAtPath(
            this.data,
            state.path || "",
            this.nullAsString ? "" : null,
          );
          this.pendingCellSelection = null;
          this.render();
          this.setStatus(
            state.path ? "已将当前对象节点置为 null" : "已将根节点置为 null",
          );
        }
        return;
      }
      if (action === "add-child-item") {
        this.addRow(path);
        return;
      }
      if (action === "add-child-field") {
        this.addColumn(path);
        return;
      }
      this.pushUndo();
      let newValue;
      if (action.startsWith("convert-to-")) {
        const type = action.replace("convert-to-", "");
        newValue = convertValue(state.value, type);
        this.setValueAtPath(this.data, path, newValue);
        this.render();
        this.setStatus(`已将节点 ${path} 改为 ${type}`);
        return;
      }
    }

    // 其它原有逻辑...
    if (action === "delete-row") {
      this.deleteRow(state.arrayPath || "", state.rowIndex);
      return;
    }
    if (action === "insert-column-before") {
      this.insertColumn(state.path || "", state.key || "", "before");
      return;
    }
    if (action === "insert-column-after") {
      this.insertColumn(state.path || "", state.key || "", "after");
      return;
    }
    if (action === "delete-column") {
      this.deleteColumn(state.path || "", state.key || "");
      return;
    }
    if (action === "set-object-null") {
      this.pushUndo();
      this.setValueAtPath(
        this.data,
        state.path || "",
        this.nullAsString ? "" : null,
      );
      this.render();
      this.setStatus("已将对象设为 null");
      return;
    }
    // 保持原有corner批量转换
    const getContextTargetPaths = () => {
      const selectedCells = this.getSelectedCells();
      // Keep empty string (root) as a valid path; only filter out null/undefined
      let selectedPaths = Array.from(
        new Set(
          selectedCells
            .map(
              (cell) =>
                cell.dataset.path ||
                cell.querySelector(".cell-value")?.dataset.path ||
                "",
            )
            .filter((p) => p !== undefined && p !== null),
        ),
      );
      // If no selected paths, fall back to state.tablePath when it exists (allow empty string)
      if (selectedPaths.length === 0 && state && state.tablePath !== undefined) {
        selectedPaths = [state.tablePath];
      }
      const sorted = [...selectedPaths].sort((a, b) => a.length - b.length);
      const targetPaths = [];
      for (const path of sorted) {
        // only skip null/undefined; allow empty string as root path
        if (path === null || path === undefined) continue;
        const covered = targetPaths.some(
          (parent) =>
            path === parent ||
            path.startsWith(parent + ".") ||
            path.startsWith(parent + "["),
        );
        if (!covered) targetPaths.push(path);
      }
      return targetPaths;
    };
    const convertNodeValue = (currentValue, targetType) =>
      convertValue(currentValue, targetType);
    if (action === "clear-selection") {
      const targetPaths = getContextTargetPaths();
      if (targetPaths.length === 0) {
        this.setStatus("当前没有选区可删除", true);
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
    if (
      action === "convert-to-array" ||
      action === "convert-to-object" ||
      action === "convert-to-single"
    ) {
      const targetType = action.replace("convert-to-", "");
      const targetPaths = getContextTargetPaths();
      if (targetPaths.length === 0) {
        this.setStatus("当前没有选区可转换", true);
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
  },

  // ===== Context Menu =====
  showContextMenu(x, y, state) {
    const menu = document.getElementById("contextMenu");
    this.contextMenuState = state;
    const isPlainObject = (value) =>
      value !== null && typeof value === "object" && !Array.isArray(value);
    const getNodeType = (value) => {
      if (Array.isArray(value)) return "array";
      if (value !== null && typeof value === "object") return "object";
      if (value === null) return "null";
      if (typeof value === "string") return "string";
      if (typeof value === "number") return "number";
      if (typeof value === "boolean") return "boolean";
      return "single";
    };
    // cell/row类型切换菜单
    if (state?.type === "cell" || state?.type === "row") {
      let extraActions = "";
      const isRootObjectRow =
        state?.type === "row" && !state?.isArrayRow && !state?.path;
      const currentType = getNodeType(state?.value);
      const typeLabels = {
        array: "Array",
        object: "Object",
        single: "单值",
        string: "String",
        number: "Number",
        boolean: "Boolean",
        null: "Null",
      };
      const applicableTypeTargets = {
        array: ["object", "single", "string", "number", "boolean", "null"],
        object: ["array", "single", "string", "number", "boolean", "null"],
        string: ["array", "object", "number", "boolean", "null"],
        number: ["array", "object", "string", "boolean", "null"],
        boolean: ["array", "object", "string", "number", "null"],
        null: ["array", "object", "string", "number", "boolean"],
        single: ["array", "object", "string", "number", "boolean", "null"],
      };
      const typeActions = (
        applicableTypeTargets[currentType] || [
          "array",
          "object",
          "string",
          "number",
          "boolean",
          "null",
        ]
      ).map((type) => [type, typeLabels[type]]);
      if (
        state?.type === "row" &&
        state?.isArrayRow &&
        typeof state?.rowIndex === "number" &&
        state?.arrayPath !== undefined
      ) {
        extraActions += `
                    <div class="divider"></div>
                    <div class="menu-item" data-action="insert-row-before">➕ 在当前行前插入</div>
                    <div class="menu-item" data-action="insert-row-after">➕ 在当前行后插入</div>
                    <div class="menu-item" data-action="delete-current-row">🗑 删除当前行</div>
                `;
      } else if (state?.type === "row" && !state?.isArrayRow) {
        extraActions += `
                    <div class="divider"></div>
                    <div class="menu-item" data-action="delete-current-row">🗑 ${isRootObjectRow ? "删除根节点（置为 null）" : "删除当前节点（置为 null）"}</div>
                `;
      }
      if (Array.isArray(state?.value)) {
        extraActions += `<div class="divider"></div><div class="menu-item" data-action="add-child-item">➕ 向当前数组添加项</div>`;
      } else if (isPlainObject(state?.value)) {
        extraActions += `<div class="divider"></div><div class="menu-item" data-action="add-child-field">➕ ${isRootObjectRow ? "向根对象添加字段" : "向当前对象添加字段"}</div>`;
      }
      if (state?.path) {
        extraActions += `<div class="divider"></div><div class="menu-item" data-action="focus-node">🎯 聚焦此节点</div>`;
      }
      menu.innerHTML = `
                ${typeActions.map(([type, label]) => `<div class="menu-item" data-action="convert-to-${type}">🔁 改变类型 → ${label}</div>`).join("")}
                ${extraActions}
            `;
    } else if (state?.type === "delete-row") {
      menu.innerHTML = `<div class="menu-item" data-action="delete-row">🗑 删除第 ${state.rowIndex + 1} 行</div>`;
    } else if (state?.type === "header") {
      menu.innerHTML = `
                <div class="menu-item" data-action="insert-column-before">➕ 在列 ${state.key} 前插入</div>
                <div class="menu-item" data-action="insert-column-after">➕ 在列 ${state.key} 后插入</div>
                <div class="divider"></div>
                <div class="menu-item" data-action="delete-column">🗑 删除列 ${state.key}</div>
            `;
    } else if (state?.type === "set-object-null") {
      menu.innerHTML = `<div class="menu-item" data-action="set-object-null">🗑 将对象设为 null</div>`;
    } else if (state?.type === "corner") {
      // Per-table corner: delete selected nodes by setting them to null
      const cornerTypeActions = state?.isArray
        ? `
                <div class="menu-item" data-action="convert-to-object">🔁 改变节点类型 → Object</div>
                <div class="menu-item" data-action="convert-to-single">🔁 改变节点类型 → 单值</div>
                `
        : `
                <div class="menu-item" data-action="convert-to-array">🔁 改变节点类型 → Array</div>
                <div class="menu-item" data-action="convert-to-single">🔁 改变节点类型 → 单值</div>
                `;
      menu.innerHTML = `
                <div class="menu-item" data-action="clear-selection">🗑 删除选区节点（置为 null）</div>
                <div class="divider"></div>
                ${cornerTypeActions}
            `;
    } else {
      menu.innerHTML = "";
    }
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    menu.classList.add("show");
  },

  // ===== Null Utilities =====
  clearAllNulls() {
    if (!this.data) return this.setStatus("没有数据可操作", true);
    this.pushUndo();
    const replace = (node) => {
      if (node === null) return "";
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
          node[i] = replace(node[i]);
        }
        return node;
      }
      if (typeof node === "object") {
        for (const k of Object.keys(node)) {
          node[k] = replace(node[k]);
        }
        return node;
      }
      return node;
    };
    replace(this.data);
    this.render();
    this.setStatus("已将所有 null 转为空字符串");
  },

  hideContextMenu() {
    const menu = document.getElementById("contextMenu");
    menu.classList.remove("show");
    this.contextMenuState = null;
  },

  // ===== VS Code Extension Integration =====

  handleExtensionMessage(message) {
    console.log("[wysJSON webview] received message:", message.type);
    if (message.type === "init") {
      this.model = message.rootModel;
      this.modelNodeMap = {};
      this.buildModelNodeMap(this.model, "");
      this.data = this.modelToData(this.model);
      this.focusPath = "";
      this.nestedStates = {};
      this.columnStates = {};
      this.render();
      this.setStatus("Data loaded, ready to edit");
    } else if (message.type === "error") {
      this.setStatus(message.message || "Operation failed", true);
    } else if (message.type === "success") {
      this.setStatus(message.message || "Saved");
    }
  },

  buildModelNodeMap(node, path) {
    if (!node) return;
    this.modelNodeMap[path] = node;
    if (node.kind === "object" && node.children) {
      for (const [key, child] of Object.entries(node.children)) {
        const childPath = path ? `${path}.${key}` : key;
        this.buildModelNodeMap(child, childPath);
      }
    } else if (node.kind === "array" && node.items) {
      for (let i = 0; i < node.items.length; i++) {
        this.buildModelNodeMap(node.items[i], `${path}[${i}]`);
      }
    }
  },

  modelToData(node) {
    if (!node) return null;
    switch (node.kind) {
      case "object": {
        const obj = {};
        if (node.children) {
          for (const [key, child] of Object.entries(node.children)) {
            obj[key] = this.modelToData(child);
          }
        }
        return obj;
      }
      case "array":
        return (node.items || []).map((item) => this.modelToData(item));
      case "string":
        return node.value;
      case "number":
        return typeof node.value === "number" ? node.value : Number(node.value);
      case "boolean":
        return node.value === true || node.value === "true";
      case "null":
        return null;
      case "codeText":
        return node.value ?? (node.raw || "");
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
      if (typeof part === "number") {
        if (!current.items || current.items[part] == null) return;
        current = current.items[part];
      } else {
        if (!current.children || !current.children[part]) return;
        current = current.children[part];
      }
    }
    const lastPart = parts[parts.length - 1];
    let node;
    if (typeof lastPart === "number") {
      node = current.items && current.items[lastPart];
    } else {
      node = current.children && current.children[lastPart];
    }
    if (node) {
      if (node.kind === "codeText" && String(value) !== String(node.value)) {
        // codeText was changed by user - convert to string
        node.kind = "string";
        node.value = String(value);
        node.raw = JSON.stringify(String(value));
        node.writeMode = "json";
        delete node.editable;
      } else {
        node.value = value;
        if (node.kind !== "codeText") {
          const type = value === null ? "null" : typeof value;
          node.kind = type;
          node.raw =
            value === null
              ? "null"
              : type === "string"
                ? JSON.stringify(value)
                : String(value);
        }
      }
    } else {
      const newNode = this.createJsonNodeFromValue(value);
      if (typeof lastPart === "number") {
        if (!current.items) current.items = [];
        current.items[lastPart] = newNode;
      } else {
        if (!current.children) current.children = {};
        current.children[lastPart] = newNode;
      }
    }
    this.buildModelNodeMap(this.model, "");
  },

  createJsonNodeFromValue(value) {
    if (value === null || value === undefined) {
      return {
        kind: "null",
        value: null,
        raw: "null",
        editable: true,
        writeMode: "json",
      };
    }
    if (typeof value === "boolean") {
      return {
        kind: "boolean",
        value,
        raw: String(value),
        editable: true,
        writeMode: "json",
      };
    }
    if (typeof value === "number") {
      return {
        kind: "number",
        value,
        raw: String(value),
        editable: true,
        writeMode: "json",
      };
    }
    if (Array.isArray(value)) {
      return {
        kind: "array",
        items: value.map((v) => this.createJsonNodeFromValue(v)),
        editable: true,
        writeMode: "json",
      };
    }
    if (typeof value === "object") {
      const children = {};
      for (const [k, v] of Object.entries(value)) {
        children[k] = this.createJsonNodeFromValue(v);
      }
      return { kind: "object", children, editable: true, writeMode: "json" };
    }
    return {
      kind: "string",
      value: String(value),
      raw: JSON.stringify(String(value)),
      editable: true,
      writeMode: "json",
    };
  },

  rebuildModelFromData(data, path) {
    const originalNode = this.modelNodeMap ? this.modelNodeMap[path] : null;
    if (data === null || data === undefined) {
      return {
        kind: "null",
        value: null,
        raw: "null",
        editable: true,
        writeMode: "json",
      };
    }
    if (Array.isArray(data)) {
      const items = data.map((item, i) =>
        this.rebuildModelFromData(item, `${path}[${i}]`),
      );
      return { kind: "array", items, editable: true, writeMode: "json" };
    }
    if (typeof data === "object") {
      const children = {};
      for (const [key, val] of Object.entries(data)) {
        const childPath = path ? `${path}.${key}` : key;
        children[key] = this.rebuildModelFromData(val, childPath);
      }
      return { kind: "object", children, editable: true, writeMode: "json" };
    }
    // Primitive - check if original was codeText and value is unchanged
    if (
      originalNode?.kind === "codeText" &&
      String(data) === String(originalNode.value)
    ) {
      return { ...originalNode };
    }
    if (typeof data === "boolean") {
      return {
        kind: "boolean",
        value: data,
        raw: String(data),
        editable: true,
        writeMode: "json",
      };
    }
    if (typeof data === "number") {
      return {
        kind: "number",
        value: data,
        raw: String(data),
        editable: true,
        writeMode: "json",
      };
    }
    return {
      kind: "string",
      value: String(data),
      raw: JSON.stringify(String(data)),
      editable: true,
      writeMode: "json",
    };
  },

  handleSave() {
    if (this.data === null && !this.model) {
      return this.setStatus("No data loaded", true);
    }
    const savedModel = this.rebuildModelFromData(this.data, "");
    console.log("[wysJSON webview] sending save, model.kind:", savedModel.kind);
    vscode.postMessage({ type: "save", model: savedModel });
    this.setStatus("Saving...");
  },

  handleCancel() {
    vscode.postMessage({ type: "cancel" });
  },
};

// Initialize
App.init();

// Allow global access for debugging
window.App = App;
