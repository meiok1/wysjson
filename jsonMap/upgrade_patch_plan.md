升级到“无限 JSON 网格（Grid）”的详细改动补丁清单

目的
- 在最小风险下，把当前单文件 `jsonMap.html` 演进为支持稀疏整数格坐标 (x,y)、单文件持久化、按需异步加载，以及跨 Tile 的模糊搜索（quick-jump）。
- 变更以渐进、可回退的方式实施，初期留在 `jsonMap.html` 内实现兼容开关，后续拆分为模块并打包为 WebView 可用 bundle。

文件位置
- 主文件: `jsonMap.html`（位于工程根）
- 新增（阶段性/最终可移出）: `model.js`, `index.js`, `render.js`, `ui.js`（最终拆分并打包；阶段 0 先内联）
- 生成/持久化: 单文件 `grid.json`（格式示例见下）

总体分步补丁清单（逐步执行，每步提交一小补丁）

Phase 0 — 最小入侵原型（在 `jsonMap.html` 内）
1. 在 `jsonMap.html` 全局顶部或 `App` 定义处新增 feature-flag
   - 添加: `const USE_GRID = true; // 切换回单 Tile 模式时设为 false`
   - 位置建议: 在 `const App = {` 之前或同一文件全局配置区。

2. 新增 `class Grid`（内联在 `jsonMap.html` 脚本区）
   - 方法: `constructor()`, `key(x,y)`, `getTile(x,y)`, `setTile(x,y,json)`, `deleteTile(x,y)`, `listTiles()`, `serialize()`, `deserialize(obj)`。
   - `Tile` 结构: `{ meta:{id,title,x,y,createdAt}, data:null|Object, state:'empty'|'loading'|'ready' }`
   - 要求: `getTile` 在不存在时返回空 Tile（不立即加载），`setTile` 将替换 `data` 并标记 `ready`，并触发索引更新（后期）。

3. 在 `App` 内添加 `currentTileX`, `currentTileY`, `grid` 实例，并适配原 `data` 访问
   - 新增: `App.grid = new Grid(); App.currentTileX = 0; App.currentTileY = 0;`
   - 修改: 将 `App.data` 的读写在 `USE_GRID? App.grid.getTile(x,y).data : App.data` 之间适配。
   - 建议实现 `App.getActiveData()` 与 `App.setActiveData(json)` 作为兼容层，尽量不改动 `createTable()`/`render()` 的内部调用位置，只替换对 `App.data` 的入口。

4. 新增持久化/导出接口
   - 新增: `App.exportGrid()` -> 返回 `Grid.serialize()`（JSON），并将该字符串用于现有的 `exportJSON()` 按钮（或新增按钮）。
   - 新增: `App.loadGridFromJSON(jsonStr)` -> `Grid.deserialize(...)`。
   - 保存文件名建议: `grid.json`（单文件存档格式）。

Phase 1 — 索引与异步 loader（并行）
1. 新增简单 `Index` 对象（内联）
   - 方法: `buildForTile(tile)`, `removeTile(x,y)`, `search(query, {fuzzy:true|false})`。
   - 初版实现: 将每个 tile 的键/短文本进行小写分词并存入倒排表 `Map<term, Array<{x,y,path,excerpt}>>`。
   - 模糊匹配: 先用 `includes()`，再实现简单 trigram 或编辑距离评分（用于排序）。

2. 异步 loader API
   - `Grid.loadTileAsync(x,y, loader)` 返回 Promise。`loader` 为用户可注入函数：`async function loader(x,y){ return json; }`。
   - `Grid` 内部保证 `tile.state` 从 `loading` -> `ready`，并在 ready 时调用 `Index.buildForTile(tile)`。

Phase 2 — 视口/渲染桥接（最小改动）
1. 不重写现有 `createTable()`，而新增封装 `renderTile(tile, container)`（初期容器为临时 div）
   - `renderTile` 内部直接调用现有的 `render()`/`createTable()` 或复制最小渲染路径，使得逻辑重用性最高。

2. 在 `editorCanvas` 之下创建 `tileContainer` 层
   - 每个 tile 对应 `div.tile[data-coords="x,y"]`，使用 `position:absolute; left: x*tileSize; top: y*tileSize; transform: scale(editorScale)`。
   - `renderViewport()` 负责计算当前可视的 tile 坐标范围并渲染/销毁容器（按需）。

3. 缩放/平移
   - 保留 `editorScale` 与现有 Ctrl+Wheel 语义；平移由现有滚动或拖拽控制（将平移映射为 `editorCanvas` 的 translate），不要立即改动此处复杂逻辑。

Phase 3 — 全局 UI（Quick-jump/thumbnail）
1. 扩展 `miniMap/thumbnail` 的绘制函数
   - 遍历 `Grid.listTiles()` 输出瓦片边界，使用不同颜色表示 `loading/ready/empty`。

2. 快速跳转逻辑
   - `quickJump(query)` 调用 `Index.search(query,{fuzzy:true})`，结果返回 `(x,y,path,excerpt)` 列表。
   - 点击结果: `Grid.loadTileAsync(x,y).then(()=> App.goToTile(x,y).then(()=> App.highlightPath(path)))`。

Phase 4 — 拆分/打包（最终）
1. 将内联模块逐步抽出为 ES Modules：`model.js`, `index.js`, `render.js`, `ui.js`。
2. 使用 `esbuild` 或 `rollup` 打包为 `bundle.js`，并替换 `jsonMap.html` 中的内联脚本为 `<script src="bundle.js"></script>`。
3. 写 `README.md` 记录 plugin 打包/加载流程与 `GridFile` 格式。

序列化（`grid.json`）格式示例
{
  "meta": {"version": 1, "createdAt": "2026-05-12T..."},
  "tiles": {
    "0,0": { "meta": {"title":"center"}, "data": { ... } },
    "1,0": { "meta": {...}, "data": {...} }
  }
}

变更回滚建议
- 每个 Phase 做单独 commit（或单独补丁文件），测试 `USE_GRID=false` 与 `USE_GRID=true`。
- 如果出现问题，回滚最近一个 Phase 的补丁即可。

测试要点
- `Grid.get/setTile` 行为一致性
- `Grid.serialize/deserialize` == roundtrip
- `Index.search` 在 small/medium 数据集上返回预期并有基本排名
- 在 `USE_GRID=true` 下，现有编辑/undo/format 功能对单 Tile 行为无回归

开发/运行建议（本地）
- 使用 VS Code 打开 `d:/wysProgramHWGo/wys-json/jsonMap`，直接在浏览器打开 `jsonMap.html` 测试。
- 推荐分支策略：`master` 保留稳定，可在 `feature/grid` 分支做开发。

把此文件作为跨电脑继续会话的参考点：复制到其他机器后，打开文件并继续按 Phase 顺序实施补丁与测试。


作者: 自动生成补丁清单（供人工复核），生成时间: 2026-05-12

备注: 我已经保留了对 `jsonMap.html` 主要函数名与位置的分析（在会话中）。在你确认我可以开始改动后，我会生成逐步的具体补丁（`apply_patch` 格式），每步都在 `feature/grid` 分支上做单个小修改并运行验证。