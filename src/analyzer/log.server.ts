import c from "ansi-colors"

export const LOG_LEVEL = {
  SILENT: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4
} as const

export type LOG_LEVEL_KEY = keyof typeof LOG_LEVEL
export type LOG_LEVEL = (typeof LOG_LEVEL)[LOG_LEVEL_KEY]

const LOG_LEVEL_LABEL = {
  SILENT: "",
  ERROR: "ERR",
  WARN: "WRN",
  INFO: "NFO",
  DEBUG: "DBG"
} as const

export type LOG_LEVEL_LABEL = (typeof LOG_LEVEL_LABEL)[keyof typeof LOG_LEVEL_LABEL]

const { ERROR, WARN, INFO, DEBUG } = LOG_LEVEL_LABEL

const stringToLevelMap: Record<string, LOG_LEVEL> = {
  SILENT: LOG_LEVEL.SILENT,
  ERROR: LOG_LEVEL.ERROR,
  WARN: LOG_LEVEL.WARN,
  INFO: LOG_LEVEL.INFO,
  DEBUG: LOG_LEVEL.DEBUG
}

// const { ERROR, WARN, INFO, DEBUG } = LOG_LEVEL_LABEL

function setIntialLogLevel() {
  if (typeof process.env.LOG_LEVEL === "string") {
    setTimeout(() => {
      log.debug(`Setting log level to ${process.env.LOG_LEVEL} from environment variable`)
    })
    return stringToLevelMap[process.env.LOG_LEVEL.toUpperCase()]
  }
  if (typeof process.env.LOG_LEVEL === "number") {
    setTimeout(() => {
      log.debug(`Setting log level to ${process.env.LOG_LEVEL} from environment variable`)
    })
    return process.env.LOG_LEVEL
  }
  return null
}

let logLevel = setIntialLogLevel()

export const getLogLevel = () => logLevel

export function setLogLevel(level: string) {
  const newLevel = stringToLevelMap[level.trim().toUpperCase()]
  if (typeof newLevel === "undefined") {
    throw new Error(`Invalid log level: ${level}`)
  }
  logLevel = newLevel
}

export function error(...messages: unknown[]) {
  if (logLevel === null) return
  if (logLevel >= LOG_LEVEL.ERROR) {
    process.stderr.write(prefix(ERROR))
    console.error(...messages)
  }
}

export function warn(...messages: unknown[]) {
  if (logLevel === null) return
  if (logLevel >= LOG_LEVEL.WARN) {
    process.stderr.write(prefix(WARN))
    console.warn(...messages)
  }
}

export function info(...messages: unknown[]) {
  if (logLevel === null) return
  if (logLevel >= LOG_LEVEL.INFO) {
    process.stderr.write(prefix(INFO))
    console.info(...messages)
  }
}

export function time(label: string) {
  if (logLevel === null) return
  if (logLevel >= LOG_LEVEL.INFO) {
    console.time(label)
  }
}

export function timeEnd(label: string) {
  if (logLevel === null) return
  if (logLevel >= LOG_LEVEL.INFO) {
    process.stderr.write(prefix(INFO))
    console.timeEnd(label)
  }
}

export function debug(...messages: unknown[]) {
  if (logLevel === null) return
  if (logLevel >= LOG_LEVEL.DEBUG) {
    process.stderr.write(prefix(DEBUG))
    console.debug(...messages)
  }
}

function prefix(label: LOG_LEVEL_LABEL): string {
  const formatPrefix = (label: LOG_LEVEL_LABEL, colorFn = (s: string) => s) =>
    `${colorFn(` ${new Date().toLocaleTimeString()} ${label} `)} `

  if (process.env.COLOR === "0") return `[${label}] `
  switch (label) {
    case LOG_LEVEL_LABEL.ERROR:
      return formatPrefix(LOG_LEVEL_LABEL.ERROR, c.bgRedBright.black.bold)
    case LOG_LEVEL_LABEL.WARN:
      return formatPrefix(LOG_LEVEL_LABEL.WARN, c.bgYellow.black.bold)
    case LOG_LEVEL_LABEL.INFO:
      return formatPrefix(LOG_LEVEL_LABEL.INFO, c.bgBlueBright.black.bold)
    case LOG_LEVEL_LABEL.DEBUG:
      return formatPrefix(LOG_LEVEL_LABEL.DEBUG, c.bgWhite.bold)
    default:
      throw Error("Invalid log level")
  }
}

export const log = {
  error,
  warn,
  info,
  debug,
  time,
  timeEnd
}
