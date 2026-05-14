Migration / Patch Plan — WYSJSON → Infinite JSON Grid

Purpose
- A concise, actionable list of code edits (add/modify locations) to incrementally introduce a sparse Grid of JSON tiles (integer x,y), asynchronous tile loading, single-file persistence, and fuzzy Quick-Jump across all tiles while minimizing risk to existing behavior.

Guiding rules
- Keep changes small and reversible; use `USE_GRID` feature flag.
- Do NOT rewrite rendering internals initially — wrap/adapt them per-tile.
- Each patch should be applied and tested in isolation.

File to edit: `jsonMap.html`
Primary script region: single large inline <script> (approx lines 1175–5011). Key anchors (approx):
- `const App = {` — around the start of the main script.
- `App.init()` — initialization binding (later in file).
- `render()`, `createTable()`, `renderCell()` — main rendering functions.
- `applyEditorScale()`, `handleEditorWheel()` — zoom handlers.
- `collectMiniMapNodes()`, `updateMiniMap()`, `updateThumbnail()` — thumbnail/mini-map and quick-jump logic.

Patches (apply in sequence, test each):

Patch 1 — Feature flag + placement
- Edit: near top of inline script (immediately before `const App = {`) add:
  - `const USE_GRID = true; // toggle for grid mode`
- Rationale: allow easy rollback and branch behavior.

Patch 2 — Grid class (in-file prototype)
- Add new class `Grid` near the top of the script (after the flag):
  - Internal: `tiles = new Map()` where key = `${x},${y}`.
  - Methods:
    - `getKey(x,y)`
    - `getTile(x,y)` returns Tile or null
    - `setTile(x,y,json, meta)` stores tile and sets state='ready'
    - `deleteTile(x,y)`
    - `listTiles()` returns array of {x,y,meta,state}
    - `serialize()` returns single-file JSON {meta, tiles:{"x,y":{meta,data}}}
    - `deserialize(obj)` populates Map
    - `loadTileAsync(x,y, loader)` : sets state='loading', calls loader() -> sets tile.data and state='ready'
  - Tile shape: `{meta:{id,title,x,y}, data:null|object, state:'empty'|'loading'|'ready'}`
- Keep this as an isolated addition — no replacement of App behavior yet.

Patch 3 — App adapter + currentTile
- Edit: in `App` state add `grid: new Grid(), currentTileCoord: {x:0,y:0}` and `currentTile()` helper that returns tile (for compatibility).
- In `App` methods that reference `this.data`, wrap reads/writes:
  - If `USE_GRID` then read/write `this.grid.getTile(x,y).data` (use currentTileCoord unless a tile path includes x,y).
  - Implement lightweight `App.getData()` and `App.setData(obj)` that dispatch to either root data (legacy) or current tile.
- Purpose: keep existing render/edit code working by targeting `App.getData()` instead of `App.data` (initially implement `getData()` and change a minimal set of central access points: where `this.data` is read for top-level render and where `applyInput()` sets `this.data`).

Patch 4 — Serialization single-file format
- Add `App.saveGridToString()` using `grid.serialize()` and `App.loadGridFromString(str)` to `deserialize` — format described in plan.
- Add menu/toolbar bindings: extend existing Export/Import buttons to offer Grid export/import when `USE_GRID=true`.
- Persist `Grid` to `localStorage` under a new key `wysjson.grid.v1` for initial testing.

Patch 5 — Index prototype (in-file)
- Add `Index` object in the script (lightweight, in-file):
  - `buildForTile(tile)` returns token list
  - `addTileToIndex(x,y,tokens)` updates inverted index map token -> [{x,y,path,score}]
  - `search(query, {fuzzy:true})` : initial implementation uses lowercase contains and trigram similarity scoring; returns list sorted by score.
- Hook: when `Grid.setTile` or `loadTileAsync` completes, call `Index.buildForTile` and `Index.addTileToIndex`.
- Do NOT yet replace Quick-Jump UI: instead add a new search input or augment existing quick-jump to call `Index.search` when `USE_GRID=true`.

Patch 6 — Async loader & viewport placeholders
- Add `Grid.ensureTileLoaded(x,y, loader)` that checks tile.state and triggers `loadTileAsync` if needed; returns Promise.
- Add a simple loader API in App like `App.defaultTileLoader(x,y)` which reads from `grid` serialized object in localStorage or returns a sample tile.
- Implement viewport calc: add helper `computeVisibleTileRange()` based on `editorScale` and current scroll/pan. For Phase 0, make it conservative: load +/-1 neighbor around current tile.

Patch 7 — Per-tile container & render adapter (low-risk)
- Modify DOM structure minimally: create a new container element under existing `editorCanvas` named `tileLayer` (absolute positioned).
- `renderViewport()` will ensure there is a child `div` for each visible tile with id `tile-${x}-${y}` and call existing `render()` flow inside that container by temporarily setting `App.getData()` to the tile data or calling a new `renderTile(tile, container)` wrapper which calls `createTable(tile.data, path)` into `container`.
- Important: do NOT rewrite `createTable` internals — only call them with different container context.

Patch 8 — Thumbnail & Quick-Jump integration
- Edit `collectMiniMapNodes()`/`updateMiniMap()` to, when `USE_GRID` is true, show tile grid and tile status (loaded vs empty).
- Modify Quick-Jump search handler to call `Index.search` and present items with `(x,y,path)`. On click: call `Grid.ensureTileLoaded(x,y)` and then center viewport on the tile and call `goToPathInTile(x,y,path)` (reusing existing `goToPath` by switching `currentTileCoord` temporarily).

Patch 9 — Cleanup & modularization (non-blocking)
- After Phase 0–4 are validated, split in-file additions into new module files under project (optional): `model-grid.js`, `index.js`, `render-tile.js`. Keep a bundler plan (esbuild) for later.

Testing matrix
- With `USE_GRID=false`: behavior must be identical.
- With `USE_GRID=true` and only one tile present: behavior similar to old code but all APIs route through Grid.
- With multiple tiles: can switch current tile, quick-jump finds items across tiles, thumbnail shows tiles.

Suggested small patch bundles (for PRs)
- PR A (very small): add `USE_GRID` + `Grid` class + `App.getData()`/`App.setData()` adapter + localStorage serialize/deserialize. (Should be reversible)
- PR B: add Index prototype and hook indexing on tile load.
- PR C: add per-tile render wrapper + tileLayer + simple viewport loader (ensureTileLoaded + default loader from localStorage).
- PR D: integrate quick-jump and thumbnail updates.
- PR E: move modules out and add build step.

Notes & references
- Keep original functions: `createTable()`, `renderCell()`, `parsePath()` — reuse them to minimize risk.
- Key functions observed earlier in file: `applyInput()`, `render()`, `createTable()`, `renderCell()`, `collectMiniMapNodes()`; these are likely minimal touchpoints.

How to resume on another machine
1. Copy project folder to other machine.
2. Open `jsonMap.html` in browser or VS Code Live Server.
3. Toggle `USE_GRID` in script if needed.
4. Use `Grid` export/import UI to move grid single-file JSON.

If you want, I can now generate the actual code patches for PR A (small, non-invasive).

-- end of migration_patch_list.md
