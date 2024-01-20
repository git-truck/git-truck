import Icon from "@mdi/react"
import type { AccordionData } from "./accordion/Accordion"
import Accordion from "./accordion/Accordion"
import { EnumSelect } from "./EnumSelect"
import {
  mdiCalendarRange,
  mdiChat,
  mdiHuman,
  mdiOrderAlphabeticalAscending,
  mdiOrderAlphabeticalDescending,
  mdiOrderBoolAscending,
  mdiSort,
  mdiSortCalendarAscending,
  mdiSortCalendarDescending
} from "@mdi/js"
import type { CommitSortingMethodsType, CommitSortingOrdersType } from "~/contexts/OptionsContext"
import { SortingMethods, SortingOrders, useOptions } from "~/contexts/OptionsContext"
import { useId } from "react"

const sortingMethodsIcons: Record<CommitSortingMethodsType, string> = {
  DATE: mdiCalendarRange,
  AUTHOR: mdiHuman
}

function getSortingOrdersIcons(isDate: boolean): Record<CommitSortingOrdersType, string> {
  return {
    ASCENDING: isDate ? mdiSortCalendarAscending : mdiOrderAlphabeticalAscending,
    DESCENDING: isDate ? mdiSortCalendarDescending : mdiOrderAlphabeticalDescending
  }
}

export function CommitSettings() {
  const id = useId()
  const items: Array<AccordionData> = new Array<AccordionData>()
  const {
    commitSearch,
    commitSortingMethodsType,
    commitSortingOrdersType,
    setCommitSearch,
    setCommitSortingMethodsType,
    setCommitSortingOrdersType
  } = useOptions()
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
            iconMap={getSortingOrdersIcons(isDateSortingMethod)}
          />
        </fieldset>
        <fieldset className="rounded-lg border p-2">
          <legend className="card__title ml-1.5 justify-start gap-2">
            <Icon path={mdiChat} size="1.25em" />
            Part of the message
          </legend>
          <input
            className="input"
            id={id}
            type="search"
            placeholder="Search for a commit..."
            value={commitSearch}
            onChange={(event) => {
              const value = event.target.value
              setCommitSearch(value)
            }}
          />
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
