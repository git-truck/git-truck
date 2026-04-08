import { Activity, useEffect, useRef, type ReactNode } from "react"
import { Icon } from "~/components/Icon"
import { CloseButton } from "~/components/util"

export function Modal({
  open,
  onClose,
  children,
  title,
  icon
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  title: ReactNode
  icon: string
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    if (open) {
      document.body.style.setProperty("overflow", "hidden")
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      document.body.style.setProperty("overflow", null)
      if (dialog.open) {
        dialog.close()
      }
    }

    return () => {
      document.body.style.setProperty("overflow", null)
    }
  }, [open])

  return (
    <Activity mode={open ? "visible" : "hidden"}>
      <dialog
        ref={dialogRef}
        aria-modal
        open={false}
        // reason: closedby is a valid attribute on <dialog> elements, but React doesn't know about it
        // eslint-disable-next-line react/no-unknown-property
        closedby="any"
        className="z-10 m-auto flex flex-col bg-transparent text-inherit backdrop:bg-gray-400/75 backdrop:backdrop-blur-xs dark:backdrop:bg-gray-800/75"
        onClose={onClose}
      >
        <div className="card flex min-h-0 max-w-(--breakpoint-2xl) gap-2 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between gap-2">
            <div className="flex flex-row items-center gap-2">
              <Icon path={icon} size="1.75em" />
              <h2 className="text-2xl font-semibold">{title}</h2>
            </div>
            <CloseButton absolute={false} className="justify-self-end px-1" onClick={onClose} />
          </div>
          <span className="w-full border-b-3 border-gray-500 px-20"></span>
          {children}
        </div>
      </dialog>
    </Activity>
  )
}

function ModalHeader({ icon, children, onClose }: { icon: string; children: ReactNode; onClose: () => void }) {
  return <></>
}
