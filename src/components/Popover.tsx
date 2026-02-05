import { ArrowContainer, Popover as ReactPopower, type PopoverState } from "react-tiny-popover"
import { CloseButton } from "./util"
import { useState } from "react"

export function Popover({
  popoverTitle,
  positions = ["top", "bottom", "left", "right"],
  trigger: Trigger,
  triggerOnHover = false,
  triggerClassName = "",
  children,
  ...props
}: Omit<React.ComponentProps<typeof ReactPopower>, "content" | "isOpen"> & {
  popoverTitle?: string
  className?: string
  triggerOnHover?: boolean
  trigger: (props: { isOpen: boolean; onOpen: () => void; onClose: () => void; onClick: () => void }) => React.ReactNode
  triggerClassName?: string
}) {
  const [isOpen, setOpen] = useState(false)

  const onOpen = () => setOpen(true)
  const onClose = () => setOpen(false)
  const onClick = () => setOpen(!isOpen)

  return (
    <ReactPopower
      positions={positions}
      {...props}
      isOpen={isOpen}
      onClickOutside={onClose}
      content={(popoverProps: PopoverState) => (
        <ArrowContainer
          {...popoverProps}
          arrowSize={10}
          arrowColor="currentColor"
          arrowClassName="text-tertiary-bg dark:text-secondary-bg-dark z-30"
        >
          <div className="bg-secondary-bg starting:opacity-0 transition-opacity  opacity-100 dark:bg-secondary-bg-dark relative z-30 max-w-lg rounded p-2 pr-10 shadow-2xl">
            {popoverTitle ? <h2 className="card__title">{popoverTitle}</h2> : null}
            {triggerOnHover ? null : <CloseButton onClick={onClose} />}
            <div className="text-secondary-text dark:text-secondary-text-dark flex flex-col gap-1">{children}</div>
          </div>
        </ArrowContainer>
      )}
    >
      <div className={triggerClassName} {...(triggerOnHover ? { onMouseEnter: onOpen, onMouseLeave: onClose } : {})}>
        <Trigger isOpen={isOpen} onOpen={onOpen} onClose={onClose} onClick={onClick} />
      </div>
    </ReactPopower>
  )
}
