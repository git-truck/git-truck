import { basename, extname } from "node:path"

export const extractFileExtension = (filePath: string): string => {
  const fileExtension = extname(filePath).toLowerCase()
  if (!fileExtension) {
    return basename(filePath).toLowerCase()
  }
  return fileExtension
}
