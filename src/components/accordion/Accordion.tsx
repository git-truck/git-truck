import type { ReactNode} from "react";
import { useState } from "react"
import AccordionItem from "./AccordionItem"

export type AccordionData = {
  title: string
  content: ReactNode
}

export type ShowMoreLabelProps = {
  toggle: () => void
  items: Array<any>
  show: boolean
}

function Accordion({
  items,
  multipleOpen,
  openByDefault,
  titleLabels,
  currentState,
  actionClickLabels,
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
    multipleOpen
      ? setCurrentIdx((currentValue) =>
          currentValue.includes(idx) ? currentValue.filter((item) => item !== idx) : [...currentValue, idx]
        )
      : setCurrentIdx((currentValue) => (currentValue.includes(idx) ? [] : [idx]))
  }
  if (openByDefault && !multipleOpen) {
    setCurrentIdx([0]);
  }
  return (
    <ul className="block m-0 pl-4 overflow-x-hidden">
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
              if (actionClickLabels) actionClickLabels(idx);
            }}
          />
      ))}
    </ul>
  )
}


export default Accordion
