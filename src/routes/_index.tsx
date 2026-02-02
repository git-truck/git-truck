import { href, redirect } from "react-router"

export const loader = async () => {
  throw redirect(href("/browse"))
}
