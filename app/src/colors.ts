//@ts-ignore
import gitcolors from "github-colors"
import { MutableRefObject } from "react"
import { HydratedGitBlobObject } from "../../parser/src/model"
import { users } from "./const"

export function getExtensionColor(
  legendSetRef: MutableRefObject<Set<string>>,
  blob: HydratedGitBlobObject
): string {
  let extension = blob.name.substring(blob.name.lastIndexOf(".") + 1)
  let lookup = gitcolors.ext(extension)
  if (typeof lookup === "undefined") return "grey"
  else {
    legendSetRef.current?.add(`${extension}|${lookup.color}`)
    return lookup.color
  }
}

export function unionAuthors(blob: HydratedGitBlobObject) {
  return Object.entries(blob.authors).reduce(
    (newAuthorOject, [author, stuff]) => {
      const authors = users.find((x) => x.includes(author))
      if (!authors) throw Error("Author not found: " + author)
      const [name] = authors
      delete newAuthorOject[author]
      newAuthorOject[name] = newAuthorOject[name] || 0
      newAuthorOject[name] += stuff
      return newAuthorOject
    },
    blob.authors
  )
}

export function getDominanceColor(
  legendSetRef: MutableRefObject<Set<string>>,
  blob: HydratedGitBlobObject
): string {
  switch (Object.keys(unionAuthors(blob)).length) {
    case 1:
      legendSetRef.current.add("Dominated|red")
      return "red"
    default:
      legendSetRef.current.add("Non-dominated|cadetblue")
      return "cadetblue"
  }
}

class SpectrumTranslater {
  readonly scale: number
  readonly offset: number
  readonly target_max: number
  readonly target_min: number

  constructor(
    input_min: number,
    input_max: number,
    target_min: number,
    target_max: number
  ) {
    this.scale = (target_max - target_min) / (input_max - input_min)
    this.offset = input_min * this.scale - target_min
    this.target_max = target_max
    this.target_min = target_min
  }

  translate(input: number) {
    return input * this.scale - this.offset
  }

  inverseTranslate(input: number) {
    return this.target_max - this.translate(input) + this.target_min
  }
}

export class ColdMapTranslater {
  readonly translator: SpectrumTranslater
  readonly min_lightness = 50
  readonly max_lightness = 90

  constructor(min: number, max: number) {
    this.translator = new SpectrumTranslater(
      min,
      max,
      this.min_lightness,
      this.max_lightness
    )
  }

  getColor(blob: HydratedGitBlobObject): string {
    return `hsl(240,100%,${this.translator.translate(blob.noCommits)}%)`
  }
}

export class HeatMapTranslater {
  readonly translator: SpectrumTranslater
  readonly min_lightness = 50
  readonly max_lightness = 95

  constructor(min: number, max: number) {
    this.translator = new SpectrumTranslater(
      min,
      max,
      this.min_lightness,
      this.max_lightness
    )
  }

  getColor(blob: HydratedGitBlobObject): string {
    return `hsl(0,100%,${this.translator.inverseTranslate(blob.noCommits)}%)`
  }
}
