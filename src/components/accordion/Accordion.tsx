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
  itemsCutoff,
  multipleOpen,
  openByDefault,
  titleLabels,
  currentState,
  actionClickLabels,
}: {
  items: Array<AccordionData>
  itemsCutoff: number
  multipleOpen: boolean
  openByDefault: boolean
  titleLabels?: boolean
  currentState?: Array<boolean>
  actionClickLabels?: (id: number) => void
}) {
  const [currentIdx, setCurrentIdx] = useState(new Array<number>())
  const [showFullList, setShowFullList] = useState(false)
  const btnOnClick = (idx: number) => {
    multipleOpen
      ? setCurrentIdx((currentValue) =>
          currentValue.includes(idx) ? currentValue.filter((item) => item !== idx) : [...currentValue, idx]
        )
      : setCurrentIdx((currentValue) => (currentValue.includes(idx) ? [] : [idx]))
  }
  const cutItems = showFullList ? items : items.slice(0, itemsCutoff)
  if (openByDefault && !multipleOpen) {
    setCurrentIdx([0]);
  }
  return (
    <ul className="block m-0 pl-4 overflow-x-hidden">
      {cutItems.map((item, idx) => (
        <>
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
          <br />
        </>
      ))}
      <ShowMoreLabel
        show={!showFullList && items.length > itemsCutoff}
        items={items.slice(itemsCutoff)}
        toggle={() => setShowFullList(!showFullList)}
      />
    </ul>
  )
}

export function ShowMoreLabel(props: ShowMoreLabelProps) {
  if (!props.show) return null
  return <span className="whitespace-pre text-xs font-medium opacity-70 hover:cursor-pointer" onClick={props.toggle}>+{props.items.length} day(s) more</span>
}

export default Accordion
