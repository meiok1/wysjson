# JSON Map 开发任务清单

更新时间: 2026-05-12 (导航系统和位置恢复功能已完成)

- [x] Add prefetchRadius config — 已添加 `prefetchRadius` 字段到 `App`。
- [x] Use prefetchRadius in renderViewport — `renderViewport` 已使用 `prefetchRadius` 控制渲染半径。
- [x] Add background prefetching beyond render radius — 已实现 `prefetchBuffer` 背景预取。
- [x] Run embedded browser test to verify tile loads — 已在嵌入浏览器中验证渲染与预取。
- [x] Update defaults (prefetchRadius/prefetchBuffer -> 2) — 默认值已设为 2。
- [x] Implement tile panning handlers — 支持中键或 Shift+拖拽平移瓦片层。
- [x] Add UI controls for prefetch radius/buffer — 工具栏已添加用于运行时调整的输入控件。
- [x] Implement preview+expand for large tiles — 已实现：超大瓦片显示预览并支持展开为多个子瓦片（内存拆分）。
- [x] Implement directional prefetch heuristics — 已实现：优先预取与最后平移方向对齐的瓦片。
- [x] Add dashed borders to tiles for visual distinction — 已添加 `.tile-wrapper` CSS样式，包含2px灰色虚线边框和圆角。
- [x] Add tile right-click context menu with focus node option — 已为瓦片添加右键菜单，包含"Focus Node"选项跳转到单个文件视图。
- [x] Implement breadcrumb navigation back to map view — 已修改面包屑导航，在瓦片模式下显示"🗺️ Map"选项，支持从单个文件视图回到地图界面。
- [x] Add corner focus node menu for table root — 已为表格左上角添加"🎯 Focus Node"右键菜单选项，跳转到当前表格的根节点。
- [x] Implement position restoration when returning to map — 已实现从单个文件视图回到地图时恢复原来的瓦片位置，避免用户迷失方向。
- [ ] Add concurrency tuning UI — （待办）为 `_tileMaxConcurrentLoads` 添加 UI 控制项。

备注:
- 我会在每次完成清单项时更新此文件并提交变更（本地工作区）。
- 若需我现在实现并优先完成某一未完成项，请直接回复要执行的项名称。
