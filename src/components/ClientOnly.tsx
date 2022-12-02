import { useState, useEffect } from "react"

export function ClientOnly({
  children,
  fallback = undefined,
}: {
  children: React.ReactElement
  fallback?: React.ReactElement
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return fallback ?? null

  return children
}
