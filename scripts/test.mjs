import { readFileSync, existsSync, statSync } from "node:fs";
import assert from "node:assert/strict";
import MarkdownIt from "markdown-it";
const md = new MarkdownIt();
import { gzipSync } from "node:zlib";
const base = (
  process.env.BASE_PATH || "/Chunqiu-Detector-Problem-solution"
).replace(/\/$/, "");
let broken = [];
for (const lang of ["zh", "en"]) {
  const tokens = md.parse(
    readFileSync(`language/answer_${lang}.md`, "utf8"),
    {},
  );
  const marker = tokens.findIndex(
    (t, i) =>
      t.type === "heading_open" &&
      t.tag === "h2" &&
      /^(检测项正文|Detection Items)$/.test(tokens[i + 1]?.content),
  );
  assert(marker >= 0);
  const expected = tokens
    .slice(marker)
    .filter((t) => t.type === "heading_open" && t.tag === "h3").length;
  const index = JSON.parse(readFileSync(`dist/${lang}/search.json`, "utf8"));
  assert(
    index.every((r) => r.href.startsWith(`${base}/${lang}/`)),
    "Language search isolation",
  );
  for (const chapter of ["", "prologue/", "items/"]) {
    const path = `dist/${lang}/${chapter}index.html`,
      s = readFileSync(path, "utf8");
    const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, `Duplicate IDs: ${path}`);
    if (chapter === "items/") {
      assert.equal(
        (s.match(/<details class="entry" open/g) || []).length,
        expected,
      );
      assert(
        s.indexOf("</details>", s.lastIndexOf('<details class="entry"')) <
          s.indexOf("<footer"),
      );
      assert(s.includes("reading-note"));
      assert(!s.includes("95 个检测项"));
    }
    for (const m of s.matchAll(/href="([^"]+)"/g)) {
      const raw = m[1].replace(/&amp;/g, "&");
      if (!raw.startsWith("#") && !raw.startsWith(base + "/")) continue;
      const u = new URL(raw, `https://test.invalid/${lang}/${chapter}`);
      const route = decodeURIComponent(u.pathname).replace(
        new RegExp("^" + base),
        "",
      );
      let dest = raw.startsWith("#") ? path : "dist" + route;
      if (existsSync(dest) && statSync(dest).isDirectory())
        dest += "/index.html";
      if (!existsSync(dest) && existsSync(dest + "/index.html"))
        dest += "/index.html";
      if (!existsSync(dest)) {
        broken.push([path, raw, "missing file"]);
        continue;
      }
      if (u.hash && dest.endsWith(".html")) {
        const target = decodeURIComponent(u.hash.slice(1));
        const content = readFileSync(dest, "utf8");
        if (!content.includes(`id="${target}"`))
          broken.push([path, raw, "missing anchor"]);
      }
    }
    console.log(
      `${lang}/${chapter}: ${(Buffer.byteLength(s) / 1024).toFixed(1)} KiB HTML, ${(gzipSync(s).length / 1024).toFixed(1)} KiB gzip`,
    );
  }
}
if (broken.length) {
  console.error(broken);
  process.exitCode = 1;
} else
  console.log(
    "PASS: six chapters, unique IDs, source-matched whole-item disclosures, language-isolated search, internal links and anchors.",
  );

for (const lang of ["zh", "en"])
  for (const page of ["items", "prologue"])
    assert.equal(
      readFileSync(`dist/${lang}/${page}.html`, "utf8"),
      readFileSync(`dist/${lang}/${page}/index.html`, "utf8"),
    );
assert.equal(
  readFileSync("dist/thanks.html", "utf8"),
  readFileSync("dist/thanks/index.html", "utf8"),
);
console.log("PASS legacy .html route aliases");

const legacy=JSON.parse(readFileSync('tests/legacy-heading-ids.json','utf8'));
for(const [path,ids] of Object.entries(legacy)){
 const html=readFileSync('dist/'+path,'utf8');
 for(const id of ids)assert(html.includes(`id="${id}"`),`Legacy heading missing: ${path}#${id}`);
}
console.log('PASS legacy VitePress heading anchors (six pages)');
