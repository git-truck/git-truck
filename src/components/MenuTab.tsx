import clsx from "clsx"
import type { PropsWithChildren, ReactNode } from "react"
import { Children, isValidElement, useState } from "react"

const MenuItemTypeString = "MENUITEM"

type InternalMenuItem = {
  title: string
  children: ReactNode
}

export type MenuItemProps = {
  title: string
  __TYPE: typeof MenuItemTypeString
}

export type MenuTabProps = {
  onChange?: (index: number) => void
  selectedItemIndex?: number
}

export const MenuItem = (props: PropsWithChildren<MenuItemProps>) => {
  return props.children
}

MenuItem.defaultProps = {
  __TYPE: MenuItemTypeString
}

export const MenuTab = (props: PropsWithChildren<MenuTabProps>) => {
  const [currentIdx, setCurrentIdx] = useState(0)
  const selectedIdx = props.selectedItemIndex ? props.selectedItemIndex : currentIdx
  const items = Children.toArray(props.children).map((item) => {
    if (!isValidElement(item)) return false
    if (item.props.__TYPE && item.props.__TYPE == MenuItemTypeString) {
      return { title: item.props.title, children: item.props.children }
    }
    return false
  }) as InternalMenuItem[]
  return (
    <>
      <div className="flex w-full flex-row justify-center overflow-hidden">
        {items.map((item, idx) => (
          <button
            key={item.title + idx + "--tab"}
            className={clsx("btn btn--outlined flex-1", {
              "opacity-50": selectedIdx === idx,
              "rounded-br-none rounded-tr-none": idx !== items.length - 1,
              "rounded-bl-none rounded-tl-none": idx === items.length - 1
            })}
            onClick={() => {
              if (props.onChange) {
                props.onChange(idx)
              }
              setCurrentIdx((currentValue) => (currentValue !== idx ? idx : currentValue))
            }}
          >
            {item.title}
          </button>
        ))}
      </div>
      {items.map((item, idx) =>
        idx == selectedIdx ? (
          <div className="border-t-0" key={selectedIdx + item.title + "--selected"}>
            {item.children}
          </div>
        ) : null
      )}
    </>
  )
}
