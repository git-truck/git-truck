import { Link } from "remix"

export default function Index() {
  return (
    <div>
      <p>No branch specified</p>
      <Link to="..">Go back</Link>
    </div>
  )
}
