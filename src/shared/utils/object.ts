type SharedKeys<T> = keyof {
  [K in keyof T[keyof T] as T[keyof T] extends Record<K, unknown> ? K : never]: true
}

export function pickKey<T extends Record<PropertyKey, Record<PropertyKey, unknown>>, K extends SharedKeys<T>>(
  obj: T,
  key: K
): { [P in keyof T]: T[P][K] } {
  const result: Partial<{ [P in keyof T]: T[P][K] }> = {}

  for (const k in obj) {
    result[k] = obj[k][key]
  }

  return result as { [P in keyof T]: T[P][K] }
}
