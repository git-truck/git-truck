import { mdiAccountMultiple, mdiCog, mdiEyeOff } from "@mdi/js"
import { parseAsStringLiteral, useQueryState } from "nuqs"
import { useEffect, useRef, type ReactNode } from "react"
import { Icon } from "~/components/Icon"
import { GroupAuthorsModal } from "~/components/modals/GroupAuthorsModal"
import { HideFilesModal } from "~/components/modals/HideFilesModal"
import { SettingsModal } from "~/components/modals/SettingsModal"
import { CloseButton } from "~/components/util"

const modals = {
  "app-settings": { content: <SettingsModal />, title: "Settings", icon: mdiCog },
  "group-authors": { content: <GroupAuthorsModal />, title: "Group Authors", icon: mdiAccountMultiple },
  "ignore-files": { content: <HideFilesModal />, title: "Hide files", icon: mdiEyeOff }
} as const satisfies Record<string, { content: ReactNode; title: string; icon: string }>
const MODAL_KEYS = Object.keys(modals) as Array<keyof typeof modals>
type ModalKey = (typeof MODAL_KEYS)[number] | null

const modalSearchParamConfig = parseAsStringLiteral(MODAL_KEYS).withOptions({ shallow: false })

export function useModal(modalKey: ModalKey | null = null) {
  const [modal, setModal] = useQueryState("modal", modalSearchParamConfig)

  const openModal = (modal: ModalKey = modalKey) => void setModal(modal)
  const closeModal = () => setModal(null)
  return { modal, openModal, closeModal }
}

export function ModalManager() {
  const [modalKey, setModal] = useQueryState("modal", modalSearchParamConfig)
  const dialogRef = useRef<HTMLDialogElement>(null)

  const onClose = () => {
    return setModal(null)
  }

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    if (modalKey) {
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
  }, [modalKey])

  if (!modalKey) {
    return null
  }

  const modal = modals[modalKey]

  return (
    <dialog
      ref={dialogRef}
      aria-modal
      open={false}
      // reason: closedby is a valid attribute on <dialog> elements, but React doesn't know about it
      // oxlint-disable-next-line react/no-unknown-property
      closedby="any"
      className="z-10 m-auto flex flex-col bg-transparent text-inherit backdrop:bg-gray-400/75 backdrop:backdrop-blur-xs dark:backdrop:bg-gray-800/75"
      onClose={onClose}
    >
      <div className="card flex min-h-0 max-w-(--breakpoint-2xl) gap-2 rounded-xl p-4 shadow-sm">
        <div className="flex justify-between gap-2">
          <div className="flex flex-row items-center gap-2">
            <Icon path={modal.icon} size="1.75em" />
            <h2 className="text-2xl font-semibold">{modal.title}</h2>
          </div>
          <CloseButton absolute={false} className="justify-self-end px-1" onClick={onClose} />
        </div>
        <span className="w-full border-b-3 border-gray-500 px-20"></span>
        {modal.content ?? null}
      </div>
    </dialog>
  )
}
