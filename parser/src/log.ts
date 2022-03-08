import chalk, { supportsColor } from "chalk"

export enum LOG_LEVEL {
  SILENT,
  ERROR,
  WARN,
  INFO,
  DEBUG,
}
export enum LOG_LEVEL_LABEL {
  SILENT = "",
  ERROR = "ERR",
  WARN = "WRN",
  INFO = "NFO",
  DEBUG = "DBG",
}

const stringToLevelMap: Record<string, LOG_LEVEL> = {
  ERROR: LOG_LEVEL.ERROR,
  WARN: LOG_LEVEL.WARN,
  INFO: LOG_LEVEL.INFO,
  DEBUG: LOG_LEVEL.DEBUG,
}

const { ERROR, WARN, INFO, DEBUG } = LOG_LEVEL_LABEL

export function getLogLevel() {
  if (typeof process.env.LOG_LEVEL === "string")
    return stringToLevelMap[process.env.LOG_LEVEL.toUpperCase()]
  if (typeof process.env.LOG_LEVEL === "number") return process.env.LOG_LEVEL
  return null
}

const logLevel = getLogLevel()

export function error(message: Error | unknown) {
  if (logLevel === null) return
  if (logLevel >= LOG_LEVEL.ERROR) {
    const messageString =
      message instanceof Error
        ? `${prefix(ERROR)}${message.message}\n${message.stack}`
        : `${prefix(ERROR)}${message}`
    console.error(messageString)
  }
}

export function warn(message: unknown) {
  if (logLevel === null) return
  if (logLevel >= LOG_LEVEL.WARN) {
    const messageString = `${prefix(WARN)}${message}`
    console.warn(messageString)
  }
}

export function info(message: unknown) {
  if (logLevel === null) return
  if (logLevel >= LOG_LEVEL.INFO) {
    const messageString = `${prefix(INFO)}${message}`
    console.info(messageString)
  }
}

export function debug(message: unknown) {
  if (logLevel === null) return
  if (logLevel >= LOG_LEVEL.DEBUG) {
    const messageString = `${prefix(DEBUG)}${message}`
    console.debug(messageString)
  }
}

export function raw(message: unknown) {
  if (logLevel === null) return
  if (logLevel >= LOG_LEVEL.INFO) {
    console.info(message)
  }
}

function prefix(label: LOG_LEVEL_LABEL): string {
  const formatPrefix = (label: LOG_LEVEL_LABEL, colorFn = (s: string) => s) =>
    `${colorFn(` ${label} `)} `
  if (!supportsColor || process.env.COLOR === "0") return `[${label}] `
  switch (label) {
    case LOG_LEVEL_LABEL.ERROR:
      return formatPrefix(LOG_LEVEL_LABEL.ERROR, chalk.bgRedBright.black)
    case LOG_LEVEL_LABEL.WARN:
      return formatPrefix(LOG_LEVEL_LABEL.WARN, chalk.bgYellow.black)
    case LOG_LEVEL_LABEL.INFO:
      return formatPrefix(LOG_LEVEL_LABEL.INFO, chalk.bgBlueBright.black)
    case LOG_LEVEL_LABEL.DEBUG:
      return formatPrefix(LOG_LEVEL_LABEL.DEBUG, chalk.bgGrey.white)
    default:
      throw Error("Invalid log level")
  }
}

export const log = {
  error,
  warn,
  info,
  debug,
  raw,
}
