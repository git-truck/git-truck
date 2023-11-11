import clsx from "clsx";
import type { ReactNode } from "react";
import { useState } from "react"

export type MenuItem = {
  title: string
  content: ReactNode
  onChange?: (index: number) => void
}

export const MenuTab = ({ items, lightBackground, selectedItemIndex }: { items: MenuItem[], lightBackground?: boolean, selectedItemIndex?: number }) => {
  const [ currentIdx, setCurrentIdx ] = useState(0)
  const selectedIdx = selectedItemIndex ? selectedItemIndex : currentIdx
  return (
    <>
      <div className="flex flex-row justify-center overflow-hidden w-full">
        { items.map((item, idx) => (
          <>
            <a
              href="#"
              key={ item.title + idx + "--tab" }
              className={clsx("flex-1 btn", {
                        "btn--outlined--light": !lightBackground,
                        "btn--outlined": lightBackground,
                        "opacity-50": selectedIdx == idx,
                        "rounded-tr-none rounded-br-none": idx != (items.length-1),
                        "rounded-tl-none rounded-bl-none": idx == (items.length-1)
                    })}
              onClick={(event) => {
                event.preventDefault();
                if (item.onChange) {
                  item.onChange(idx)
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
        idx == selectedIdx ? <div className="border-t-0" key={selectedIdx + item.title + "--selected"}>{ item.content }</div> : null
      )) }
    </>
  )
}
