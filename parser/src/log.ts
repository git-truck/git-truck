export enum LOG_LEVEL {
  SILENT,
  ERROR,
  WARN,
  INFO,
  DEBUG,
}
export enum LOG_LEVEL_LABEL {
  DEBUG = "DBG",
  INFO = "NFO",
  WARN = "WRN",
  ERROR = "ERR",
}

const map : Record<string, LOG_LEVEL> = {
  DEBUG: LOG_LEVEL.DEBUG,
  INFO: LOG_LEVEL.INFO,
  WARN: LOG_LEVEL.WARN,
  ERROR: LOG_LEVEL.ERROR,
}

const {
  DEBUG,
  INFO,
  WARN,
  ERROR
} = LOG_LEVEL_LABEL

export function getLogLevel() {
  if (typeof process.env.LOG_LEVEL === "string") return map[process.env.LOG_LEVEL.toUpperCase()]
  if (typeof process.env.LOG_LEVEL === "number") return process.env.LOG_LEVEL
  return LOG_LEVEL.INFO
}

export function debug(message: unknown) {
  if (getLogLevel() >= LOG_LEVEL.DEBUG) {
    const messageString = `[${DEBUG}] ${message}`
    console.debug(messageString)
  }
}

export function logNoPrefix(message: unknown) {
  if (getLogLevel() >= LOG_LEVEL.INFO) {
    console.info(message)
  }
}

export function info(message: unknown) {
  if (getLogLevel() >= LOG_LEVEL.INFO) {
    const messageString = `[${INFO}] ${message}`
    console.info(messageString)
  }
}

export function warn(message: unknown) {
  if (getLogLevel() >= LOG_LEVEL.WARN) {
    const messageString = `[${WARN}] ${message}`
    console.warn(messageString)
  }
}

export function error(message: unknown) {
  if (getLogLevel() >= LOG_LEVEL.ERROR) {
    const messageString = `[${ERROR}] ${message}`
    console.error(messageString)
  }
}

export const log = {
  debug,
  log: logNoPrefix,
  info,
  warn,
  error,
}
