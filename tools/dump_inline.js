const fs = require("fs");
const path = require("path");
const file = path.resolve(__dirname, "..", "indexMonaco.html");
const raw = fs.readFileSync(file, "utf8");
const scriptBlocks = Array.from(
  raw.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi),
);
if (!scriptBlocks.length) {
  console.error("No <script> blocks found");
  process.exit(2);
}
let inline = null;
for (let i = scriptBlocks.length - 1; i >= 0; i--) {
  const block = scriptBlocks[i][0];
  const openTag = block.slice(0, block.indexOf(">") + 1);
  if (!/src\s*=/.test(openTag)) {
    inline = scriptBlocks[i][1];
    break;
  }
}
if (!inline) inline = scriptBlocks[scriptBlocks.length - 1][1];
const out = path.resolve(__dirname, "..", "tools", "inline_extracted.js");
fs.writeFileSync(out, inline, "utf8");
console.log("Wrote inline script to", out);
