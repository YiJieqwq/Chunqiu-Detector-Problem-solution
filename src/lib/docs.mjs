// Build-time structure inspired by Matsuzaka Yuki's Astro prototype (see README).
// Fresh implementation using Markdown tokens; no client-side Markdown or framework hydration.
import { readFileSync } from "node:fs";
import MarkdownIt from "markdown-it";
const ROOT = new URL("../../", import.meta.url);
export const base = import.meta.env.BASE_URL.replace(/\/$/, "");
export const url = (p) => `${base}/${p.replace(/^\//, "")}`;
export function slug(s) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u0000-\u001f]/g, "")
    .replace(/[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
const md = new MarkdownIt({ html: true, linkify: true });
const plain = (s) =>
  md
    .render(s)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const cache = new Map();
export function docs(lang) {
  if (cache.has(lang)) return cache.get(lang);
  const source = readFileSync(
    new URL(`language/answer_${lang}.md`, ROOT),
    "utf8",
  ).replace(/<(?=\s|\d|=|\.|,|%|\))/g, "&lt;");
  const tokens = md.parse(source, {});
  let phase = 0,
    drop = false;
  const sets = [[], [], []];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "heading_open" && t.tag === "h2") {
      const title = tokens[i + 1].content;
      drop = /^(目录|Table of Contents)$/.test(title);
      if (/^(序章|Prologue)$/.test(title)) phase = 1;
      if (/^(检测项正文|Detection Items)$/.test(title)) phase = 2;
    }
    if (!drop) sets[phase].push(t);
  }
  const names =
    lang === "zh"
      ? ["第一章 · 概述", "第二章 · 前言", "第三章 · 正文"]
      : [
          "Chapter 1 · Overview",
          "Chapter 2 · Prologue",
          "Chapter 3 · Detection Items",
        ];
  const paths = [`${lang}/`, `${lang}/prologue/`, `${lang}/items/`];
  const pages = sets.map((ts, n) => {
    if (n && ts[0]?.tag === "h2") {
      ts[0].tag = ts[2].tag = "h1";
      if (n === 1) ts[1].content = lang === "zh" ? "前言" : "Prologue";
    }
    const seen = new Map(),
      heads = [];
    ts.forEach((t, i) => {
      if (t.type === "heading_open") {
        const text = ts[i + 1].content;
        const k = slug(text);
        const count = seen.get(k) || 0;
        seen.set(k, count + 1);
        const id = k + (count ? `-${count}` : "");
        t.attrSet("id", id);
        heads.push({ id, text, level: Number(t.tag.slice(1)), i });
      }
    });
    return { path: paths[n], title: names[n], tokens: ts, heads, n };
  });
  const anchors = new Map();
  pages.forEach((p) =>
    p.heads.forEach((h) => {
      if (!anchors.has(h.id)) anchors.set(h.id, p.path);
    }),
  );
  const search = [];
  for (const p of pages) {
    // Move same-document links to the correct chapter after splitting.
    const fix = (href) => {
      if (href.startsWith("#")) {
        let id;
        try {
          id = decodeURIComponent(href.slice(1));
        } catch {
          return href;
        }
        return p.heads.some((h) => h.id === id)
          ? href
          : anchors.has(id)
            ? url(anchors.get(id)) + href
            : href;
      }
      if (href === "/File/Doc/thanks.md" || href === "/thanks")
        return url("thanks/");
      if (href.startsWith("/File/")) return url(href);
      return href;
    };
    p.tokens.forEach((t) =>
      (t.children || []).forEach((c) => {
        if (c.type === "link_open")
          c.attrSet("href", fix(c.attrGet("href") || ""));
      }),
    );
    let html = "",
      open = false;
    p.tokens.forEach((t, i) => {
      const heading = t.type === "heading_open";
      if (p.n === 2 && heading && Number(t.tag.slice(1)) <= 3) {
        if (open) {
          html += "</div></details>";
          open = false;
        }
        if (t.tag === "h3") {
          html += '<details class="entry" open><summary>';
          open = true;
        }
      }
      html += md.renderer.render([t], md.options, {});
      if (p.n === 2 && t.type === "heading_close" && t.tag === "h3")
        html += '</summary><div class="entry-body">';
    });
    if (open) html += "</div></details>";
    p.html = html;
    p.heads.forEach((h, j) => {
      if (h.level > 3) return;
      let end = p.tokens.length;
      for (const next of p.heads.slice(j + 1)) {
        if (next.level <= h.level) {
          end = next.i;
          break;
        }
      }
      const body = plain(
        p.tokens
          .slice(h.i + 3, end)
          .map((t) => t.content || "")
          .join("\n"),
      );
      search.push({
        title: h.text,
        text: body.slice(0, 10000),
        href: url(p.path) + "#" + h.id,
      });
    });
  }
  const items = pages[2];
  let appendix = false,
    count = 0;
  for (const h of items.heads) {
    if (h.level === 2) appendix = /^(附录|Appendices)$/.test(h.text);
    if (h.level === 3 && !appendix) count++;
  }
  const result = { pages, search, count };
  cache.set(lang, result);
  return result;
}
export function credits() {
  return md.render(readFileSync(new URL("File/Doc/thanks.md", ROOT), "utf8"));
}
