export const map = <O extends Record<string, unknown>, R = unknown>(
  o: O,
  fn: <K extends keyof O>(v: O[K], k: K) => R
): { [K in keyof O]: R } =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fn(v as O[keyof O], k as keyof O)])) as { [K in keyof O]: R }

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
