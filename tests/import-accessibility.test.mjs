import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const script = readFileSync(new URL("../app.js", import.meta.url), "utf8");

test("scenario import has a keyboard-focusable button", () => {
  assert.match(html, /<button id="import-trigger"[^>]*type="button"[^>]*>Import scenarios<\/button>/);
  assert.match(html, /<input id="import" type="file" accept="application\/json,\.json" hidden>/);
  assert.doesNotMatch(html, /<label class="import-label ghost">/);
});

test("import button opens the existing JSON file picker", () => {
  assert.match(script, /getElementById\("import-trigger"\)\.addEventListener\("click",\(\)=>document\.getElementById\("import"\)\.click\(\)\)/);
  assert.match(script, /getElementById\("import"\)\.addEventListener\("change",async event=>/);
});
