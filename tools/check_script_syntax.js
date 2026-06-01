const fs = require("fs");
const path = require("path");
const file = path.resolve(__dirname, "..", "indexMonaco.html");
const raw = fs.readFileSync(file, "utf8");
// Find the last <script>...</script> block (the inline app script)
const scriptBlocks = Array.from(
  raw.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi),
);
if (!scriptBlocks.length) {
  console.error("No <script> blocks found");
  process.exit(2);
}
// Prefer the last block that doesn't have a src attribute (inline)
let inline = null;
for (let i = scriptBlocks.length - 1; i >= 0; i--) {
  const block = scriptBlocks[i][0];
  const openTag = block.slice(0, block.indexOf(">") + 1);
  if (!/src\s*=/.test(openTag)) {
    inline = scriptBlocks[i][1];
    break;
  }
}
if (!inline) {
  // fallback: use the last script's content
  inline = scriptBlocks[scriptBlocks.length - 1][1];
}
try {
  // Test syntax by creating a function
  new Function(inline);
  console.log("SYNTAX_OK");
  process.exit(0);
} catch (err) {
  console.error("SYNTAX_ERROR");
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(3);
}
