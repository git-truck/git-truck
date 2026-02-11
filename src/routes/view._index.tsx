import { mdiAppleKeyboardCommand, mdiAppleKeyboardShift } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { ClientOnly } from "~/components/util"

export default function ViewIndex() {
  return (
    <div className="space-y-4 text-sm">
      <p>Click on a file or folder to view details or commit history.</p>
      <ClientOnly>{() => <Guide />}</ClientOnly>
    </div>
  )
}

function Guide() {
  const isMac = navigator.platform.startsWith("Mac")
  const modifierTitle = isMac ? "Command key" : "Control key"
  const modifier = isMac ? <Icon path={mdiAppleKeyboardCommand} /> : "Ctrl"

  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1">
        <Key title="Scroll">Scroll</Key> to zoom in and out
      </p>

      <p className="flex items-center gap-1">
        <Key title="Shift key">
          <Icon path={mdiAppleKeyboardShift} />
        </Key>
        + <Key title="Left click">click</Key> to zoom in
      </p>

      <p className="flex items-center gap-1">
        <Key title={modifierTitle}>{modifier}</Key> + <Key title="Left click">click</Key> to zoom out
      </p>
    </div>
  )
}

function Key({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <kbd
      className="bg-primary-bg dark:bg-primary-bg-dark h-button flex w-max items-center rounded-sm border px-2"
      title={title}
    >
      {children}
    </kbd>
  )
}
