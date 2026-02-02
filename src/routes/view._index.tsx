import { href, redirect } from "react-router"

export function loader() {
  throw redirect(href("/view/home"))
}
