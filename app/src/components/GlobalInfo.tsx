import { useData } from "../contexts/DataContext"
import { useFolder } from "../contexts/FolderContext"
import { Spacer } from "./Spacer"
import { Box, BoxTitle } from "./util"

export function GlobalInfo() {
  const data = useData()
  const {path, setPath} = useFolder()

  let temppath = path
  let paths : [string, string][] = []

  while(temppath !== "") {
    const idx = temppath.lastIndexOf("/")
    paths.push([temppath.substring(idx+1), temppath])
    temppath = temppath.substring(0,idx)
  }
  paths.reverse()

  return (
    <Box>
      <BoxTitle>{data.repo}</BoxTitle>
      <Spacer />
      <div>
        <strong>Branch: </strong>
        {data.branch}
      </div>
      <div>
        <strong>Path: </strong>
        {paths.map(([name, p]) => <text onClick={() => setPath(p)}>/{name}</text>)}
      </div>
    </Box>
  )
}
