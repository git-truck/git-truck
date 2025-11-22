import { redirect } from "react-router"

export const loader = async () => {
  throw redirect("browse")
}
