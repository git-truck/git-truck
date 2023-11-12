import clsx from "clsx";
import type { PropsWithChildren, ReactNode } from "react";
import { Children, isValidElement, useState  } from "react"

const MenuItemTypeString = "MENUITEM";

type InternalMenuItem = {
  title: string
  children: ReactNode
}

export type MenuItemProps = {
  title: string
  __TYPE: typeof MenuItemTypeString
}

export type MenuTabProps = {
  lightBackground?: boolean
  onChange?: (index: number) => void
  selectedItemIndex?: number
}

export const MenuItem = (props: PropsWithChildren<MenuItemProps>) => {
  return props.children
}

MenuItem.defaultProps = {
  "__TYPE": MenuItemTypeString
}

export const MenuTab = (props: PropsWithChildren<MenuTabProps>) => {
  const [ currentIdx, setCurrentIdx ] = useState(0)
  const selectedIdx = props.selectedItemIndex ? props.selectedItemIndex : currentIdx
  const items = Children.toArray(props.children).map(item => {
    if(!isValidElement(item)) return false
    console.log(item);
    if (item.props.__TYPE && item.props.__TYPE == MenuItemTypeString) {
      return { title: item.props.title, children: item.props.children }
    }
  }) as InternalMenuItem[];
  return (
    <>
      <div className="flex flex-row justify-center overflow-hidden w-full">
        { items.map((item, idx) => (
          <>
            <a
              href="#"
              key={ item.title + idx + "--tab" }
              className={clsx("flex-1 btn", {
                        "btn--outlined--light": !props.lightBackground,
                        "btn--outlined": props.lightBackground,
                        "opacity-50": selectedIdx == idx,
                        "rounded-tr-none rounded-br-none": idx != (items.length-1),
                        "rounded-tl-none rounded-bl-none": idx == (items.length-1)
                    })}
              onClick={(event) => {
                event.preventDefault();
                if (props.onChange) {
                  props.onChange(idx)
                }
                setCurrentIdx((currentValue) => (currentValue !== idx ? idx : currentValue))
              } }
            >
              { item.title }
            </a>
          </>
        )) }
      </div>
      { items.map((item, idx) => (
        idx == selectedIdx ? <div className="border-t-0" key={selectedIdx + item.title + "--selected"}>{ item.children }</div> : null
      )) }
    </>
  )
}
