// CI check without extra tools: plugin manifests, SKILL.md frontmatter and size, references that SKILL.md points to,
// and a --help header on every script. Exits non-zero listing every problem.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const skill = path.join(root, "skills/ship-video");
const errors = [];
const fail = (msg) => errors.push(msg);
const json = (p) => { try { return JSON.parse(readFileSync(path.join(root, p), "utf8")); } catch (e) { fail(`${p}: ${e.message}`); return {}; } };

// plugin + marketplace manifests
const plugin = json(".claude-plugin/plugin.json");
const market = json(".claude-plugin/marketplace.json");
if (plugin.name !== "ship-video") fail("plugin.json: name must be ship-video");
if (!/^\d+\.\d+\.\d+$/.test(plugin.version ?? "")) fail("plugin.json: version must be semver");
if (!market.owner?.name) fail("marketplace.json: owner.name is required");
if (!market.plugins?.some((p) => p.name === plugin.name && p.source === "./")) fail("marketplace.json: must list ship-video with source ./");

// SKILL.md: frontmatter, limits, referenced files
const md = readFileSync(path.join(skill, "SKILL.md"), "utf8");
const fm = md.match(/^---\n([\s\S]*?)\n---\n/);
if (!fm) fail("SKILL.md: frontmatter must start on line 1");
else {
  const field = (k) => fm[1].match(new RegExp(`^${k}:\\s*(.*)$`, "m"))?.[1] ?? "";
  if (field("name") !== "ship-video") fail("SKILL.md: name must match the folder (ship-video)");
  const desc = field("description");
  if (!desc) fail("SKILL.md: description is required");
  if (desc.length > 1024) fail(`SKILL.md: description is ${desc.length} chars (max 1024)`);
}
const lines = md.split("\n").length;
if (lines > 500) fail(`SKILL.md: ${lines} lines (keep under 500; move detail into references/)`);
for (const ref of new Set(md.match(/references\/[\w-]+\.md/g) ?? [])) if (!existsSync(path.join(skill, ref))) fail(`SKILL.md points to missing ${ref}`);
for (const s of new Set([...md.matchAll(/\$S\/([\w/.-]+\.(?:mjs|sh))/g)].map((m) => m[1]))) if (!existsSync(path.join(skill, "scripts", s))) fail(`SKILL.md points to missing scripts/${s}`);

// every script starts with a comment header (that's what --help prints)
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(path.join(skill, "scripts")).filter((f) => /\.(mjs|py|sh)$/.test(f))) {
  const first = readFileSync(f, "utf8").split("\n").find((l) => l.trim() && !l.startsWith("#!"));
  if (!/^\s*(\/\/|#)/.test(first ?? "")) fail(`${path.relative(root, f)}: needs a comment header (shown by --help)`);
}

if (errors.length) { console.error(errors.map((e) => `✗ ${e}`).join("\n")); process.exit(1); }
console.log("✓ manifests, SKILL.md and script headers look right");
