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
  mdiSortCalendarAscending,
  mdiSortCalendarDescending,
  mdiUpdate
} from "@mdi/js"
import type { CommitSortingMethodsType, CommitSortingOrdersType } from "~/contexts/OptionsContext"
import { SortingMethods, SortingOrders, useOptions } from "~/contexts/OptionsContext"

const sortingMethodsIcons: Record<SortingMethodsType, string> = {
  DATE: mdiCalendarRange,
  AUTHOR: mdiHuman
}

const sortingOrdersIcons: Record<CommitSortingOrdersType, string> = (isDate: boolean) => {
  return {
    ASCENDING: isDate ? mdiSortCalendarAscending : mdiOrderAlphabeticalAscending,
    DESCENDING: isDate ? mdiSortCalendarDescending : mdiOrderAlphabeticalDescending
  }
}

export function CommitSettings() {
  const items: Array<AccordionData> = new Array<AccordionData>()
  const { commitSortingMethodsType, commitSortingOrdersType, setCommitSortingMethodsType, setCommitSortingOrdersType } =
    useOptions()
  const isDateSortingMethod: boolean = commitSortingMethodsType == Object.keys(SortingMethods)[0]

  items.push({
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
            defaultValue={commitSortingMethodsType}
            onChange={(sortingMethodType: CommitSortingMethodsType) => {
              return setCommitSortingMethodsType(sortingMethodType)
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
            enum={SortingOrders(isDateSortingMethod)}
            defaultValue={commitSortingOrdersType}
            onChange={(sortingOrder: CommitSortingOrdersType) => {
              return setCommitSortingOrdersType(sortingOrder)
            }}
            iconMap={sortingOrdersIcons(isDateSortingMethod)}
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
      key={items.length > 0 ? items[0].title : new Date().toDateString()}
      titleLabels={true}
      multipleOpen={false}
      openByDefault={false}
      items={items}
    />
  )
}
