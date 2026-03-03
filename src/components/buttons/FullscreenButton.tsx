import { mdiFullscreenExit, mdiFullscreen } from "@mdi/js"
import { useFullscreen } from "~/hooks"
import { cn } from "~/styling"
import { Icon } from "~/components/Icon"

export function FullscreenButton() {
  const { isFullscreen, toggleFullscreen } = useFullscreen(() => document.documentElement)
  return (
    <button
      className={cn("btn btn--icon", { "btn--primary": isFullscreen })}
      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      onClick={toggleFullscreen}
    >
      <Icon path={isFullscreen ? mdiFullscreenExit : mdiFullscreen} size={1} />
    </button>
  )
}
