import { mdiFullscreenExit, mdiFullscreen } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useFullscreen } from "~/hooks"
import { cn } from "~/styling"

export function FullscreenButton() {
  const { isFullscreen, toggleFullscreen } = useFullscreen(() => document.documentElement)
  return (
    <button
      className={cn("btn aspect-square p-1", { "btn--primary": isFullscreen })}
      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      onClick={toggleFullscreen}
    >
      <Icon path={isFullscreen ? mdiFullscreenExit : mdiFullscreen} size={1} />
    </button>
  )
}
