import { createContext, Dispatch, SetStateAction, useContext } from "react"
import { HydratedGitBlobObject } from "../analyzer/model"

export interface ClickedBlob {
  clickedBlob: HydratedGitBlobObject | null
  setClickedBlob: Dispatch<SetStateAction<HydratedGitBlobObject | null>>
}

export const ClickedBlobContext = createContext<ClickedBlob | null>(null)

export function useClickedBlob() {
  const context = useContext(ClickedBlobContext)
  if (!context) {
    throw new Error("useClickedBlob must be used within a ClickedBlobProvider")
  }
  return context
}
