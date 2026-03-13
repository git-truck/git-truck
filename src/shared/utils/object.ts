export const map = <O extends Record<string, unknown>, R = unknown>(
  o: O,
  fn: <K extends keyof O>(v: O[K], k: K) => R
): { [K in keyof O]: R } =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fn(v as O[keyof O], k as keyof O)])) as { [K in keyof O]: R }

export const pickKey = <V extends Record<PropertyKey, unknown>, O extends Record<string, V>, K extends keyof V>(
  o: O,
  property: K
): { [P in keyof O]: O[P][K] } =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, (v as V)[property]])) as { [P in keyof O]: O[P][K] }
