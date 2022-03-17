import { useData } from "../contexts/DataContext"
import { useFolder } from "../contexts/FolderContext"
import { Spacer } from "./Spacer"
import { Box, BoxTitle, NavigationText, NonNavigationText } from "./util"

export function GlobalInfo() {
  const data = useData()
  const {path, setPath} = useFolder()

  let temppath = path
  let paths : [string, string][] = []

  for(let i = 0; i < 3; i++) {
    if (temppath === "") { break; }
    const idx = temppath.lastIndexOf("/")
    paths.push([temppath.substring(idx+1), temppath])
    temppath = temppath.substring(0,idx)
  }
  if (temppath !== "") {
    paths = paths.slice(0,paths.length-1); 
    paths.push(["...",""]); 
    paths.push([data.repo,data.repo])
  }

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
        {paths.reverse().map(([name, p]) => {
          if (p === "") return <NonNavigationText>/{name}</NonNavigationText>
          else return <NavigationText onClick={() => setPath(p)}>/{name}</NavigationText>
        })}
      </div>
    </Box>
  )
}
