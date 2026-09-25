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

// Content regression: keep the new, version-scoped timing item separate from
// older TEE/Widevine entries, and derive counts from each language's source.
const timingTitle = "TEESimulator detector";
const timingId = "teesimulator-detector";
const inventories = [];
for (const lang of ["zh", "en"]) {
  const source = readFileSync(`language/answer_${lang}.md`, "utf8");
  const tokens = md.parse(source, {});
  const headings = tokens.flatMap((t, i) =>
    t.type === "heading_open"
      ? [{ level: Number(t.tag.slice(1)), text: tokens[i + 1].content, i }]
      : [],
  );
  const matches = headings.filter((h) => h.level === 3 && h.text === timingTitle);
  assert.equal(matches.length, 1, `${lang}: exactly one timing entry`);
  const start = matches[0].i;
  const section = headings.filter((h) => h.level === 2 && h.i < start).at(-1);
  assert.equal(
    section.text,
    lang === "zh" ? "TEE 与密钥证明检测" : "TEE & Key Attestation Detection",
  );
  const end = headings.find((h) => h.i > start && h.level <= 3)?.i ?? tokens.length;
  const body = tokens.slice(start, end).map((t) => t.content || "").join("\n");
  const subheadings = headings
    .filter((h) => h.i > start && h.i < end && h.level === 4)
    .map((h) => h.text);
  assert.deepEqual(
    subheadings,
    lang === "zh"
      ? ["检测方式", "解决办法", "备注"]
      : ["Detection method", "Solution", "Notes"],
  );
  for (const fact of [
    "4.5.6(69)", "296", "AES/GCM/NoPadding", "750000 ns",
    "3 × MAD", "100 × S >= 125 × F", "UNAVAILABLE", "error.txt",
  ]) assert(body.includes(fact), `${lang}: missing ${fact}`);
  assert(body.includes(lang === "zh" ? "尚未进行真机验证" : "not real-device validation"));
  assert(!/cqdetector-re|\/workspace\/|gh_token|crypto-evidence/.test(body),
    `${lang}: do not publish private evidence paths`);
  const rows = JSON.parse(readFileSync(`dist/${lang}/search.json`, "utf8"))
    .filter((r) => r.title === timingTitle);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].href, `${base}/${lang}/items/#${timingId}`);
  assert(rows[0].text.includes("4.5.6(69)"));

  let inItems = false, appendix = false, itemCount = 0, appendixCount = 0;
  for (const h of headings) {
    if (h.level === 2 && /^(检测项正文|Detection Items)$/.test(h.text)) inItems = true;
    if (!inItems) continue;
    if (h.level === 2) appendix = /^(附录|Appendices)$/.test(h.text);
    if (h.level === 3) appendix ? appendixCount++ : itemCount++;
  }
  inventories.push({ itemCount, appendixCount });
  console.log(`PASS ${lang}: timing item scope, classifier, search; ${itemCount} items + ${appendixCount} appendices`);
}
assert.deepEqual(inventories[0], inventories[1], "Bilingual item and appendix counts");
