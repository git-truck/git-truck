import { afterEach } from "vitest"
import { commands } from "vitest/browser"

type LoadState = "load" | "domcontentloaded" | "networkidle"
type Role = "heading" | "link"

declare module "vitest/browser" {
  interface BrowserCommands {
    appClickByRole(role: Role, name: string): Promise<void>
    appClickByTitle(title: string, options?: { exact?: boolean }): Promise<void>
    appClose(): Promise<void>
    appGoto(path: string): Promise<void>
    appSelectByTestId(testId: string, value: string): Promise<void>
    appTextByTestId(testId: string): Promise<string | null>
    appTitle(): Promise<string>
    appUrl(): Promise<string>
    appWaitForLoadState(state: LoadState): Promise<void>
    appWaitForSelector(selector: string): Promise<void>
    appWaitForUrl(path: string): Promise<void>
    appWaitForRole(role: Role, name: string): Promise<void>
  }
}

afterEach(async () => {
  await commands.appClose()
})

export const app = {
  clickByRole: commands.appClickByRole,
  clickByTitle: commands.appClickByTitle,
  goto: commands.appGoto,
  selectByTestId: commands.appSelectByTestId,
  textByTestId: commands.appTextByTestId,
  title: commands.appTitle,
  url: commands.appUrl,
  waitForLoadState: commands.appWaitForLoadState,
  waitForRole: commands.appWaitForRole,
  waitForSelector: commands.appWaitForSelector,
  waitForUrl: commands.appWaitForUrl
}
