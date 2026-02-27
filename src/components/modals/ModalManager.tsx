import { parseAsStringLiteral, useQueryState } from "nuqs"
import { useEffect, useRef, type ReactNode } from "react"
import { GroupAuthorsModal } from "./GroupAuthorsModal"
import { SettingsModal } from "../modals/SettingsModal"
import { CloseButton } from "../util"
import { mdiAccountMultipleCheck, mdiCog } from "@mdi/js"
import { Icon } from "../Icon"

const modals = {
  "group-authors": { content: <GroupAuthorsModal />, title: "Group Authors", icon: mdiAccountMultipleCheck },
  "app-settings": { content: <SettingsModal />, title: "Settings", icon: mdiCog }
} as const satisfies Record<string, { content: ReactNode; title: string; icon: string }>
const MODAL_KEYS = Object.keys(modals) as Array<keyof typeof modals>
type ModalKey = (typeof MODAL_KEYS)[number] | null

const modalSearchParamConfig = parseAsStringLiteral(MODAL_KEYS)

export function useModal(modalKey: ModalKey | null = null) {
  const [modal, setModal] = useQueryState("modal", modalSearchParamConfig)

  const openModal = (modal: ModalKey = modalKey) => void setModal(modal)
  const closeModal = () => setModal(null)
  return { modal, openModal, closeModal }
}

export function ModalManager() {
  const [modalKey, setModal] = useQueryState("modal", modalSearchParamConfig)
  const dialogRef = useRef<HTMLDialogElement>(null)

  const onClose = () => setModal(null)

  useEffect(() => {
    if (!dialogRef.current) {
      return
    }

    const dialog = dialogRef.current

    if (modalKey) {
      dialogRef.current.showModal()
      return
    }
    dialog.close()
    return () => dialog.close()
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
      // eslint-disable-next-line react/no-unknown-property
      closedby="any"
      className="z-10 m-auto flex flex-col items-start justify-stretch bg-transparent text-inherit backdrop:bg-gray-500/75 backdrop:p-0"
      onClose={onClose}
    >
      <div className="card m-auto h-full w-full max-w-(--breakpoint-2xl) gap-2 overflow-hidden rounded-xl bg-gray-100 p-4 shadow-sm">
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
