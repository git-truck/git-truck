import clsx from "clsx";
import type { ReactNode } from "react";
import { useState } from "react"

export type MenuItem = {
  title: string
  content: ReactNode
  onChange?: (index: number) => void
}

export const MenuTab = ({ items, lightBackground, isSelected }: { items: Array<MenuItem>, lightBackground?: boolean, isSelected?: number }) => {
  const [ currentIdx, setCurrentIdx ] = useState(0)
  const equalSplitValue = 100 / items.length + "%"
  const selectedIdx = isSelected ? isSelected : currentIdx
  return (
    <>
      <div className="flex flex-row justify-center overflow-hidden">
        { items.map((item, idx) => (
          <>
            <div
              key={ Math.random() + "--tab" }
              className={clsx("btn rounded-none", {
                        "btn--outlined--light": !lightBackground,
                        "btn--outlined": lightBackground,
                        "opacity-50": selectedIdx == idx,
                        "underline": selectedIdx == idx
                    })}
              style={{ width: equalSplitValue }}
              onClick={ () => {
                if (item.onChange) {
                  item.onChange(idx)
                }
                setCurrentIdx((currentValue) => (currentValue !== idx ? idx : currentValue))
              } }
            >
              { item.title }
            </div>
          </>
        )) }
      </div>
      { items.map((item, idx) => (
        <>{ idx == selectedIdx && <div className="border-t-0">{ item.content }</div> }</>
      )) }
    </>
  )
}
