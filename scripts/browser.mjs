import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import assert from "node:assert/strict";
const base = "/Chunqiu-Detector-Problem-solution",
  root = resolve("dist");
const server = createServer((req, res) => {
  let pathname = decodeURIComponent(
    new URL(req.url, "http://localhost").pathname,
  );
  if (!pathname.startsWith(base + "/")) {
    res.writeHead(404).end();
    return;
  }
  let p = join(root, pathname.slice(base.length));
  if (!p.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!existsSync(p)) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader(
    "Content-Type",
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css",
      ".js": "text/javascript",
      ".json": "application/json",
    }[extname(p)] || "application/octet-stream",
  );
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`,
  url = origin + base;
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  mkdirSync("test-results", { recursive: true });
  for (const width of [390, 1024, 1440])
    for (const colorScheme of ["light", "dark"]) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme,
      });
      const p = await ctx.newPage();
      const errors = [];
      const searchRequests = [];
      p.on("pageerror", (e) => errors.push(e.message));
      p.on("request", (r) => {
        if (r.url().includes("search.json")) searchRequests.push(r.url());
      });
      await p.goto(url + "/zh/items/");
      await p.waitForLoadState("networkidle");
      const count = await p.locator(".entry").count();
      assert(count > 0);
      assert.equal(await p.locator(".entry[open]").count(), count);
      assert.equal(searchRequests.length, 0);
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "No horizontal overflow",
      );
      const colors = await p.evaluate(() =>
        ["header", "aside", "body"].map(
          (s) => getComputedStyle(document.querySelector(s)).backgroundColor,
        ),
      );
      assert.equal(colors[0], colors[1]);
      await p.locator("#fold").click();
      assert.equal(await p.locator(".entry[open]").count(), 0);
      const id = await p.locator(".entry h3").first().getAttribute("id");
      await p.evaluate((id) => (location.hash = id), id);
      await p.waitForTimeout(180);
      assert.equal(await p.locator(".entry[open]").count(), 1);
      if (width < 800) {
        await p.locator("#sidebar-toggle").click();
        assert(await p.locator("#sidebar").isVisible());
        await p.locator("#sidebar a").first().click();
        await p.waitForLoadState();
        assert(!(await p.locator("#sidebar").isVisible()));
      }
      await p.locator("#search-open").click();
      await p.locator("#query").fill("Zygisk detected");
      await p.waitForFunction(() => document.querySelector("#results li"));
      assert.equal(
        await p.locator("#results a").first().textContent(),
        "Zygisk detected",
      );
      assert(searchRequests.every((u) => u.includes("/zh/")));
      await p.keyboard.press("Escape");
      await p.locator("#search-dialog").waitFor({ state: "hidden" });
      assert(!(await p.locator("#search-dialog").isVisible()));
      await p.goto(url + "/zh/items/");
      await p.locator("#theme").click();
      assert.equal(
        await p.locator("html").getAttribute("data-theme"),
        colorScheme === "dark" ? "light" : "dark",
      );
      await p.locator("#theme").click();
      await p.screenshot({
        path: `test-results/zh-${width}-${colorScheme}.png`,
      });
      await p.locator("header nav a").filter({ hasText: "English" }).click();
      assert(p.url().endsWith("/en/items/"));
      await p.waitForLoadState("networkidle");
      await p.locator("#search-open").click();
      await p.locator("#query").fill("Zygisk detected");
      await p.waitForFunction(() => document.querySelector("#results li"));
      assert(
        (await p.locator("#results a").first().getAttribute("href")).includes(
          "/en/",
        ),
      );
      await p.keyboard.press("Escape");
      for (const lang of ["zh", "en"]) {
        await p.goto(url + `/${lang}/items/#teesimulator-detector`);
        const timingEntry = p.locator("details.entry").filter({
          has: p.locator("h3#teesimulator-detector"),
        });
        assert.equal(await timingEntry.count(), 1);
        assert(await timingEntry.evaluate((el) => el.open));
        assert((await timingEntry.innerText()).includes("4.5.6(69)"));
        assert(
          await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          `${lang} timing item: no horizontal overflow`,
        );
        await p.locator("#search-open").click();
        await p.locator("#query").fill("TEESimulator detector");
        await p.waitForFunction(() =>
          document.querySelector("#results a")?.textContent === "TEESimulator detector",
        );
        assert.equal(
          await p.locator("#results a").first().getAttribute("href"),
          base + `/${lang}/items/#teesimulator-detector`,
        );
        await p.keyboard.press("Escape");
        if ((width === 390 && colorScheme === "light") ||
            (width === 1440 && colorScheme === "dark")) {
          // Scroll the entry into view, then capture the viewport: element
          // screenshots of tall entries are unreliable in this suite
          // (content-visibility:auto can skip offscreen regions in captures).
          await p.evaluate(() => {
            document
              .querySelector("h3#teesimulator-detector")
              ?.scrollIntoView({ block: "start" });
          });
          await p.waitForTimeout(300);
          await p.screenshot({
            path: `test-results/teesimulator-${lang}-${width}-${colorScheme}.png`,
          });
        }
      }
      assert.deepEqual(errors, []);
      console.log(
        `PASS browser ${width}px ${colorScheme}: folding, hash reveal, search, theme, navigation; bilingual timing entry`,
      );
      await ctx.close();
    }
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto(url + "/zh/items/");
  const count = await p.locator(".entry").count();
  assert.equal(await p.locator(".entry[open]").count(), count);
  await p.locator(".entry summary").first().click();
  assert.equal(await p.locator(".entry[open]").count(), count - 1);
  await ctx.close();
  console.log("PASS no-JS reading and native disclosures");
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
