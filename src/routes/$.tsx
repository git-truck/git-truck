import { Link } from "react-router"
import { ErrorPage } from "~/components/ErrorPage"

export default function NotFound() {
  return (
    <ErrorPage message="404 - Page Not Found">
      <Link className="btn btn--primary mt-4" to="/">
        Go back home
      </Link>
    </ErrorPage>
  )
}
