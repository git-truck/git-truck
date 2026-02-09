import { mdiFolder, mdiGit } from "@mdi/js"
import { href, useLocation, useNavigate, useMatch } from "react-router"
import { IconRadioGroup } from "~/components/EnumSelect"

export function RepoTabs() {
  const navigate = useNavigate()
  const location = useLocation()

  const isCommits = useMatch(href("/view/commits"))

  return (
    <IconRadioGroup
      large
      group={
        {
          "/details": "Details",
          "/commits": "Commits"
        } as const
      }
      iconMap={{
        "/details": mdiFolder,
        "/commits": mdiGit
      }}
      defaultValue={isCommits ? "/commits" : "/details"}
      onChange={(v) => {
        navigate(href(`/view${v}`) + location.search, { state: location.state })
      }}
    />
  )
}
