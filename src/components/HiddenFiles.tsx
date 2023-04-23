import { useBoolean } from "react-use"
import { useData } from "~/contexts/DataContext"
import { Form, useLocation, useNavigation } from "@remix-run/react"
import { VisibilityOff as HiddenIcon, Visibility as ShownIcon } from "@styled-icons/material"
import { ChevronButton } from "./ChevronButton"

function hiddenFileFormat(ignored: string) {
  if (!ignored.includes("/")) return ignored
  const split = ignored.split("/")
  return split[split.length - 1]
}

export function HiddenFiles() {
  const location = useLocation()
  const [expanded, setExpanded] = useBoolean(false)
  const navigationState = useNavigation()
  const { analyzerData } = useData()
  return (
    <div className="card flex flex-col gap-2">
      <h2 className="card__title">Hidden files ({analyzerData.hiddenFiles.length})</h2>
      <ChevronButton className="absolute bottom-2 right-2" open={expanded} onClick={() => setExpanded(!expanded)} />
      {expanded ? (
        <div>
          {analyzerData.hiddenFiles.map((hidden) => (
            <div className="grid grid-cols-[auto_1fr] gap-2" key={hidden} title={hidden}>
              <Form className="w-4" method="post" action={location.pathname}>
                <input type="hidden" name="unignore" value={hidden} />
                <button
                  className="btn--icon btn--hover-swap h-4"
                  title="Show file"
                  disabled={navigationState.state !== "idle"}
                >
                  <HiddenIcon className="inline-block h-full" />
                  <ShownIcon className="hover-swap inline-block h-full" />
                </button>
              </Form>
              <span className="text-sm opacity-70">{hiddenFileFormat(hidden)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
