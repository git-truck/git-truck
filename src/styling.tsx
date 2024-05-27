import { type ClassValue, clsx } from "clsx"
import type { Dispatch, ReactNode, SetStateAction } from "react"
import { createContext, useContext } from "react"
import { useLocalStorage } from "react-use"
import { twMerge } from "tailwind-merge"
import { useMediaQuery } from "./hooks"

export const cn = (...args: ClassValue[]) => twMerge(clsx(args))

export const Themes = {
  SYSTEM: "System",
  LIGHT: "Light",
  DARK: "Dark"
} as const

export type Theme = keyof typeof Themes

export const ThemeContext = createContext<[Theme, Dispatch<SetStateAction<Theme | undefined>>]>([
  "SYSTEM",
  () => {
    throw new Error("ThemeContext not in the tree")
  }
])

export const useTheme = () => useContext(ThemeContext)

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useLocalStorage<Theme>("themeType", undefined)

  return (
    <ThemeContext.Provider value={[theme === undefined ? "SYSTEM" : theme, setTheme]}>{children}</ThemeContext.Provider>
  )
}

function useMQPrefersColorSchemeLight() {
  return useMediaQuery("(prefers-color-scheme: light)")
}

export function usePrefersLightMode() {
  const prefersLight = useMQPrefersColorSchemeLight()
  const [theme] = useTheme()

  return theme === "SYSTEM" || theme === undefined ? prefersLight : theme === "LIGHT"
}
