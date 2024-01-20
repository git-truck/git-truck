import Icon from "@mdi/react"
import type { AccordionData } from "./accordion/Accordion"
import Accordion from "./accordion/Accordion"
import { EnumSelect } from "./EnumSelect"
import {
  mdiCalendarRange,
  mdiHuman,
  mdiOrderAlphabeticalAscending,
  mdiOrderAlphabeticalDescending,
  mdiOrderBoolAscending,
  mdiSort,
  mdiUpdate
} from "@mdi/js"
import type { SortingMethodsType, SortingOrdersType } from "~/contexts/OptionsContext"
import { SortingMethods, SortingOrders } from "~/contexts/OptionsContext"

const sortingMethodsIcons: Record<SortingMethodsType, string> = {
  DATE: mdiCalendarRange,
  AUTHOR: mdiHuman
}

const sortingOrdersIcons: Record<SortingOrdersType, string> = {
  ASCENDING: mdiOrderAlphabeticalAscending,
  DESCENDING: mdiOrderAlphabeticalDescending
}

export function CommitSettings() {
  const sortingItems: Array<AccordionData> = new Array<AccordionData>()
  const defaultSortingMethod = Object.keys(SortingMethods)[0] as SortingMethodsType
  const defaultSortingOrder = Object.keys(SortingOrders(true))[0] as SortingOrdersType

  sortingItems.push({
    title: "Sorting and filtering",
    content: (
      <>
        <fieldset className="rounded-lg border p-2">
          <legend className="card__title ml-1.5 justify-start gap-2">
            <Icon path={mdiSort} size="1.25em" />
            Sorting
          </legend>
          <EnumSelect
            enum={SortingMethods}
            defaultValue={defaultSortingMethod}
            onChange={(hiearchyType: SortingMethodsType) => {
              console.log(hiearchyType)
            }}
            iconMap={sortingMethodsIcons}
          />
        </fieldset>
        <fieldset className="rounded-lg border p-2">
          <legend className="card__title ml-1.5 justify-start gap-2">
            <Icon path={mdiOrderBoolAscending} size="1.25em" />
            Sorting order
          </legend>
          <EnumSelect
            enum={SortingOrders(true)}
            defaultValue={defaultSortingOrder}
            onChange={(sortingOrder: SortingOrdersType) => {
              console.log(sortingOrder)
            }}
            iconMap={sortingOrdersIcons}
          />
        </fieldset>
        <fieldset className="rounded-lg border p-2">
          <legend className="card__title ml-1.5 justify-start gap-2">
            <Icon path={mdiUpdate} size="1.25em" />
            Dates
          </legend>
          <p className="mb-1">
            From: <input type="date" />
          </p>
          <p>
            To: <input type="date" />
          </p>
        </fieldset>
      </>
    )
  })

  return (
    <Accordion
      key={sortingItems.length > 0 ? sortingItems[0].title : new Date().toDateString()}
      titleLabels={true}
      multipleOpen={false}
      openByDefault={false}
      items={sortingItems}
    />
  )
}
