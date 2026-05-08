import * as fs from "fs"

const dataStr = `[
  { "date": "2024-01-01", "count": 0 },
  { "date": "2024-01-02", "count": 10 },
  { "date": "2024-01-03", "count": 100 }
]`

const scale = "log"
const data = JSON.parse(dataStr).map((e) => ({
  ...e,
  countLogged: scale === "log" ? Math.log10(e.count + 1) : e.count
}))

console.log(data)
