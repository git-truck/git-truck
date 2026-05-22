import { chromium } from "playwright"

const defaultPath = "/view"
const output = process.argv[3] ?? "figure.pdf"
const requestedUrl = process.argv[2] ?? process.env["GIT_TRUCK_URL"]
const defaultOrigin = `http://localhost:${process.env["PORT"] ?? "3000"}`

const isUrl = (value: string) => {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

const url = requestedUrl
  ? isUrl(requestedUrl)
    ? requestedUrl
    : new URL(requestedUrl, defaultOrigin).toString()
  : new URL(defaultPath, defaultOrigin).toString()

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium-browser",
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
})

const page = await browser.newPage({
  viewport: { width: 1200, height: 800 }
})

page.setDefaultTimeout(120_000)
page.setDefaultNavigationTimeout(120_000)

await page.goto(url, { waitUntil: "domcontentloaded" })
await page.emulateMedia({ media: "print" })
await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined)
await page.locator("svg").first().waitFor({ state: "visible" })
await page.waitForTimeout(100)

await page.pdf({
  path: output,
  width: "210mm",
  height: "297mm",
  printBackground: true,
  pageRanges: "1"
})

await browser.close()

console.log(`Saved ${output} from ${url}`)
