import { ParserData } from "./../../parser/src/model"
import jsonData from "./data.json"

// @ts-ignore
const data: ParserData = jsonData

export const getData = () => data
