import { useData } from "../contexts/DataContext"
import { Spacer } from "./Spacer"
import { Box, BoxTitle } from "./util"

export function GlobalInfo() {
  const data = useData()
  return (
    <Box>
      <BoxTitle>{data.repo}</BoxTitle>
      <Spacer />
      <div>
        <strong>Branch: </strong>
        {data.branch}
      </div>
    </Box>
  )
}
