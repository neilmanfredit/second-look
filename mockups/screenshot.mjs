import puppeteer from "puppeteer";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = "/home/nixadmin/repos/second-look/mockups";

const pages = [
  { file: "outlook-flagged.html",   out: "outlook-flagged.png",   w: 1200, h: 800 },
  { file: "outlook-clean.html",     out: "outlook-clean.png",     w: 1200, h: 800 },
  { file: "teams-passive-flag.html",out: "teams-passive-flag.png",w: 1200, h: 800 },
  { file: "teams-report-dialog.html",out:"teams-report-dialog.png",w:1200, h: 800 },
];

const browser = await puppeteer.launch({ args: ["--no-sandbox"] });

for (const { file, out, w, h } of pages) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await page.goto(`file://${path.join(__dirname, file)}`);
  await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {});
  await page.screenshot({ path: path.join(__dirname, out), fullPage: false });
  console.log(`✓ ${out}`);
  await page.close();
}

await browser.close();
