import { useEffect, useMemo, useRef, useTransition, useState } from "react"
import { useData } from "~/contexts/DataContext"
import type { Person } from "~/shared/model"
import { CheckboxWithLabel } from "~/components/modals/utils/CheckboxWithLabel"
import { useMetrics } from "~/contexts/MetricContext"
import { Icon } from "~/components/Icon"
import { mdiArrowUp, mdiAccountMultiplePlus, mdiAccountMultipleMinus } from "@mdi/js"
import { LegendDot } from "~/components/util"
import { useViewSubmit } from "~/hooks"
import { useModal } from "~/components/modals/ModalManager"

export function GroupContributorsModal() {
  const { databaseInfo } = useData()
  const { contributorGroups, contributors } = databaseInfo
  const [selectedContributors, setSelectedContributors] = useState<Person[]>([])
  const [localContributorGroups, setLocalContributorGroups] = useState<string[][]>(contributorGroups)
  const [filter, setFilter] = useState("")
  const [, contributorColors] = useMetrics()
  const [, startTransition] = useTransition()
  const submit = useViewSubmit()

  const submitRef = useRef(submit)
  useEffect(() => {
    submitRef.current = submit
  }, [submit])

  // When the modal is closed, check if the contributor groups have changed. If they have, submit the new groups as custom close action.
  const { setCustomCloseAction } = useModal("group-contributors")
  useEffect(() => {
    const handleCloseWithSubmitIfChanged = () => {
      const currentGroups = localContributorGroups
      const originalGroups = contributorGroups
      if (JSON.stringify(currentGroups) === JSON.stringify(originalGroups)) return
      const form = new FormData()
      form.append("groupedContributors", JSON.stringify(currentGroups))
      submitRef.current(form, {
        method: "post"
      })
    }
    setCustomCloseAction(handleCloseWithSubmitIfChanged)
    return () => setCustomCloseAction(undefined)
  }, [setCustomCloseAction, contributorGroups, localContributorGroups])

  function makePrimaryAlias(alias: string, groupIndex: number) {
    const newContributorUnions = localContributorGroups.map((group, i) => {
      if (i === groupIndex) {
        return [alias, ...group.filter((a) => a !== alias)]
      }
      return group
    })
    setLocalContributorGroups(newContributorUnions)
  }

  const groupedContributorsSet = useMemo(() => new Set(localContributorGroups.flat()), [localContributorGroups])

  const ungroupedContributorsSorted = useMemo(
    () =>
      contributors
        .filter((contributor) => !groupedContributorsSet.has(contributor.name))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [contributors, groupedContributorsSet]
  )

  const ungroupedContributorsFiltered = useMemo(() => {
    return ungroupedContributorsSorted.filter((contributor) =>
      contributor.name.toLowerCase().includes(filter.toLowerCase())
    )
  }, [ungroupedContributorsSorted, filter])

  const getColorFromDisplayName = (displayName: string) => contributorColors.get(displayName) ?? "#333"

  const ungroupedContributorsEntries = ungroupedContributorsFiltered.map((contributor) => {
    const isContributorSelected = selectedContributors.some((selected) => selected.name === contributor.name)
    return (
      <CheckboxWithLabel
        key={contributor.name + isContributorSelected}
        className="contents"
        checkBoxClassName="ml-auto"
        checked={isContributorSelected}
        onChange={(e) => {
          setSelectedContributors((prev) => {
            if (e.target?.checked) return [...prev, contributor]
            else return prev.filter((selected) => selected.name !== contributor.name)
          })
        }}
      >
        <div className="contents">
          <LegendDot dotColor={getColorFromDisplayName(contributor.name)} />
          <span className="truncate font-bold" title={contributor.name}>
            {contributor.name}
          </span>
          <p
            className="text-secondary-text dark:text-secondary-text-dark truncate text-xs leading-tight"
            title={contributor.email ?? "<unknown>"}
          >
            {contributor.email ?? "<unknown>"}
          </p>
        </div>
      </CheckboxWithLabel>
    )
  })

  const groupedContributorsEntries = localContributorGroups.map((aliasGroup, aliasGroupIndex) => {
    const displayName = aliasGroup[0]
    const color = getColorFromDisplayName(displayName)

    return (
      <div
        key={aliasGroupIndex}
        className="card bg-primary-bg dark:bg-primary-bg-dark group m-0 flex h-full flex-col p-2"
      >
        <div className="inline-flex flex-row place-items-center gap-2">
          <LegendDot dotColor={color} />
          <b className="truncate" title={displayName}>
            {displayName}
          </b>
        </div>
        {aliasGroup
          .slice(1)
          .sort(stringSorter)
          .map((alias) => (
            <AliasEntry key={alias} alias={alias} onClick={() => makePrimaryAlias(alias, aliasGroupIndex)} />
          ))}
        <div className="grow" />
        <div className="flex items-end justify-end gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            className="btn"
            title="Add selected contributors to this group"
            disabled={selectedContributors.length === 0}
            onClick={() => {
              const newContributorUnions = localContributorGroups.map(([groupDisplayName, ...group], i) => {
                if (i === aliasGroupIndex) {
                  return [groupDisplayName, ...group, ...selectedContributors.map((contributor) => contributor.name)]
                }
                return [groupDisplayName, ...group]
              })
              setLocalContributorGroups(newContributorUnions)
              setSelectedContributors([])
            }}
          >
            Add selected
          </button>
          <button
            className="btn"
            title="Ungroup"
            onClick={() =>
              setLocalContributorGroups((prev) => {
                const newContributorGroups = prev.filter((_, i) => i !== aliasGroupIndex)
                return newContributorGroups
              })
            }
          >
            Ungroup
          </button>
        </div>
      </div>
    )
  })

  return (
    <div className="flex min-h-0 w-auto max-w-(--breakpoint-lg) min-w-0 flex-col gap-2 p-4">
      <div className="grid grid-cols-[1fr_1fr] gap-2">
        <h3 className="text-center text-lg font-bold">Ungrouped Contributors ({ungroupedContributorsSorted.length})</h3>
        <h3 className="text-center text-lg font-bold">Contributor Groups ({groupedContributorsEntries.length})</h3>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_1fr] gap-2">
        <div className="flex min-h-0 flex-col rounded-md">
          <div className="flex gap-2 p-2">
            <input
              className="input min-w-0"
              type="search"
              placeholder="Filter..."
              disabled={ungroupedContributorsSorted.length === 0}
              onChange={(e) => startTransition(() => setFilter(e.target.value))}
            />
            <button
              disabled={selectedContributors.length === 0}
              className="btn w-max grow"
              title="Clear selection"
              onClick={() => setSelectedContributors([])}
            >
              Clear
            </button>
            <button
              disabled={ungroupedContributorsSorted.length === 0}
              className="btn w-max grow"
              title="Clear selection"
              onClick={() =>
                selectedContributors.length === ungroupedContributorsFiltered.length
                  ? setSelectedContributors([])
                  : setSelectedContributors((selected) => {
                      const next = new Map(selected.map((contributor) => [contributor.name, contributor]))
                      for (const contributor of ungroupedContributorsFiltered) {
                        next.set(contributor.name, contributor)
                      }
                      return Array.from(next.values())
                    })
              }
            >
              {selectedContributors.length === ungroupedContributorsFiltered.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="grid min-h-0 w-full grid-cols-[min-content_3fr_3fr_min-content] items-center gap-x-4 gap-y-1 overflow-y-auto p-2">
            {ungroupedContributorsFiltered.length > 0 ? (
              ungroupedContributorsEntries
            ) : (
              <p className="place-self-center text-sm">
                {filter.length > 0 ? "No contributors found" : "All contributors have been grouped"}
              </p>
            )}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto">
          <div className="grid h-min min-h-0 grid-cols-1 gap-4 rounded-md p-2 lg:grid-cols-2 xl:grid-cols-3">
            {localContributorGroups.length > 0 ? (
              groupedContributorsEntries
            ) : (
              <p className="col-span-2 text-center text-sm">No contributors have been grouped yet</p>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_1fr] gap-2">
        <button
          className="btn btn--primary mx-auto w-fit"
          title={
            selectedContributors.length < 2
              ? "Select at least 2 contributors to group them"
              : "Group the selected contributors"
          }
          disabled={selectedContributors.length < 2}
          onClick={() => {
            setLocalContributorGroups((prev) => [...prev, selectedContributors.map((contributor) => contributor.name)])
            setSelectedContributors([])
          }}
        >
          <Icon path={mdiAccountMultiplePlus} size={1} />
          Create group
        </button>
        <button
          className="btn btn--danger mx-auto w-fit"
          disabled={localContributorGroups.length === 0}
          onClick={() => {
            if (confirm("Are you sure you want to ungroup all grouped contributors?")) setLocalContributorGroups([])
          }}
        >
          <Icon path={mdiAccountMultipleMinus} size={1} />
          Ungroup all
        </button>
      </div>
    </div>
  )
}

function AliasEntry({ alias, onClick, disabled }: { alias: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      className="btn flex grid-flow-col gap-2 text-sm [&:hover>svg]:opacity-50 [&>svg]:opacity-0"
      disabled={disabled}
      title="Make display name for this grouping"
      onClick={onClick}
    >
      <Icon path={mdiArrowUp} size={0.75} />
      <label title={alias} className="label truncate">
        {alias}
      </label>
    </button>
  )
}

const stringSorter = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase())
