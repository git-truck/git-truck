export function debugLog(message: unknown) {
  if (process.env.DEBUG) {
    console.log(message)
  }
}
