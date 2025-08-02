import type { ReactNode } from "react"
import React, { useState, useEffect } from "react"
import AccordionItem from "./AccordionItem"

export type AccordionData = {
  title: string
  content: ReactNode
}

function Accordion({
  items,
  multipleOpen,
  openByDefault,
  titleLabels,
  currentState,
  actionClickLabels
}: {
  items: Array<AccordionData>
  multipleOpen: boolean
  openByDefault: boolean
  titleLabels?: boolean
  currentState?: Array<boolean>
  actionClickLabels?: (id: number) => void
}) {
  const [currentIdx, setCurrentIdx] = useState(new Array<number>())
  const btnOnClick = (idx: number) => {
    if (multipleOpen) {
      setCurrentIdx((currentValue) =>
        currentValue.includes(idx) ? currentValue.filter((item) => item !== idx) : [...currentValue, idx]
      )
    } else {
      setCurrentIdx((currentValue) => (currentValue.includes(idx) ? [] : [idx]))
    }
  }

  useEffect(() => {
    if (openByDefault && !multipleOpen) {
      setCurrentIdx([0])
    }
  }, [openByDefault, multipleOpen])
  return (
    <ul className="m-0 block overflow-x-hidden">
      {items.map((item, idx) => (
        <AccordionItem
          key={item.title + idx + "--accordion"}
          data={item}
          isOpen={
            currentState && currentState[idx]
              ? currentState[idx]
              : openByDefault && multipleOpen
                ? !currentIdx.includes(idx)
                : currentIdx.includes(idx)
          }
          titleLabels={titleLabels}
          btnOnClick={() => {
            btnOnClick(idx)
            if (actionClickLabels) actionClickLabels(idx)
          }}
        />
      ))}
    </ul>
  )
}

export default Accordion
