import { useStore } from "../StoreContext"
import { Spacer } from "./Spacer"
import { Box, BoxTitle } from "./util"

export function GlobalInfo() {
  const { data } = useStore()
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
