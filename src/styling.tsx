import { type ClassValue, clsx } from "clsx"
import { useMediaQuery } from "~/hooks"
import { twMerge } from "tailwind-merge"

export const cn = (...args: ClassValue[]) => twMerge(clsx(args))

export function usePrefersLightMode() {
  return useMediaQuery("(prefers-color-scheme: light)")
}
