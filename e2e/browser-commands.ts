import type { BrowserCommand, BrowserCommandContext } from "vitest/node"
import type { BrowserContext, Page } from "playwright"

type LoadState = "load" | "domcontentloaded" | "networkidle"
type Role = "heading" | "link"
type PlaywrightCommandContext = BrowserCommandContext & {
  context: BrowserContext
}

const appBaseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000"
const pages = new Map<string, Page>()

const appUrl = (path: string) => new URL(path, appBaseUrl).toString()

const getBrowserContext = (context: BrowserCommandContext) => {
  if (context.provider.name !== "playwright") {
    throw new Error(`E2E browser commands require the playwright provider, received ${context.provider.name}`)
  }

  return (context as PlaywrightCommandContext).context
}

const getAppPage = async (context: BrowserCommandContext) => {
  const existingPage = pages.get(context.sessionId)
  if (existingPage && !existingPage.isClosed()) {
    return existingPage
  }

  const browserContext = getBrowserContext(context)
  const page = await browserContext.newPage()
  pages.set(context.sessionId, page)
  return page
}

const appGoto: BrowserCommand<[path: string], void> = async (context, path) => {
  const page = await getAppPage(context)
  await page.goto(appUrl(path))
}

const appTitle: BrowserCommand<[], string> = async (context) => {
  const page = await getAppPage(context)
  return page.title()
}

const appUrlCommand: BrowserCommand<[], string> = async (context) => {
  const page = await getAppPage(context)
  return page.url()
}

const appTextByTestId: BrowserCommand<[testId: string], string | null> = async (context, testId) => {
  const page = await getAppPage(context)
  return page.getByTestId(testId).textContent()
}

const appSelectByTestId: BrowserCommand<[testId: string, value: string], void> = async (context, testId, value) => {
  const page = await getAppPage(context)
  await page.getByTestId(testId).selectOption(value)
}

const appClickByTitle: BrowserCommand<[title: string, options?: { exact?: boolean }], void> = async (
  context,
  title,
  options
) => {
  const page = await getAppPage(context)
  await page.getByTitle(title, options).click()
}

const appClickByRole: BrowserCommand<[role: Role, name: string], void> = async (context, role, name) => {
  const page = await getAppPage(context)
  await page.getByRole(role, { name }).click()
}

const appWaitForUrl: BrowserCommand<[path: string], void> = async (context, path) => {
  const page = await getAppPage(context)
  await page.waitForURL(appUrl(path))
}

const appWaitForSelector: BrowserCommand<[selector: string], void> = async (context, selector) => {
  const page = await getAppPage(context)
  await page.waitForSelector(selector)
}

const appWaitForLoadState: BrowserCommand<[state: LoadState], void> = async (context, state) => {
  const page = await getAppPage(context)
  await page.waitForLoadState(state)
}

const appWaitForRole: BrowserCommand<[role: Role, name: string], void> = async (context, role, name) => {
  const page = await getAppPage(context)
  await page.getByRole(role, { name }).waitFor()
}

const appClose: BrowserCommand<[], void> = async (context) => {
  const page = pages.get(context.sessionId)
  pages.delete(context.sessionId)

  if (page && !page.isClosed()) {
    await page.close()
  }
}

export const browserCommands = {
  appClickByRole,
  appClickByTitle,
  appClose,
  appGoto,
  appSelectByTestId,
  appTextByTestId,
  appTitle,
  appUrl: appUrlCommand,
  appWaitForLoadState,
  appWaitForRole,
  appWaitForSelector,
  appWaitForUrl
}
