import { useEffect, useMemo, useTransition, useState } from "react"
import { useData } from "~/contexts/DataContext"
import type { ContributorGroup, Person } from "~/shared/model"
import { CheckboxWithLabel } from "~/components/modals/utils/CheckboxWithLabel"
import { useMetrics } from "~/contexts/MetricContext"
import { Icon } from "~/components/Icon"
import {
  mdiAccountMultiplePlus,
  mdiAccountMultipleMinus,
  mdiAccountMultipleRemove,
  mdiAccountRemove,
  mdiAccountMultipleCheck,
  mdiAccountMultiple
} from "@mdi/js"
import { LegendDot } from "~/components/util"
import { useViewSubmit } from "~/hooks"
import { Modal } from "~/components/modals/Modal"
import { missingInMapColor } from "~/const"
import { cn } from "~/styling"
import { autoBuildContributorGroups } from "~/components/modals/utils/autoBuildContributorGroups"
import { pickContributorGroupDisplayName } from "~/components/modals/utils/displayNameStrategy"

export function GroupContributorsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { databaseInfo } = useData()
  const { contributorGroups, contributors } = databaseInfo
  const [selectedContributors, setSelectedContributors] = useState<Person[]>([])
  const [localContributorGroups, setLocalContributorGroups] = useState<ContributorGroup[]>(contributorGroups)
  const [filter, setFilter] = useState("")
  const [, contributorColors] = useMetrics()
  const [, startTransition] = useTransition()
  const submit = useViewSubmit()

  // When the modal is closed, check if the contributor groups have changed. If they have, submit the new groups as custom close action.
  const handleCloseWithSubmitIfChanged = () => {
    const currentSerialized = JSON.stringify(localContributorGroups)
    const originalSerialized = JSON.stringify(contributorGroups)
    if (currentSerialized === originalSerialized) return
    const form = new FormData()
    form.append("groupedContributors", currentSerialized)
    submit(form, {
      method: "post"
    })
  }

  function makePrimaryAlias(aliasName: string, groupIndex: number) {
    setLocalContributorGroups((prev) => {
      const group = prev[groupIndex]
      if (!group || group.displayName === aliasName) return prev
      return prev.map((group, i) => (i === groupIndex ? { ...group, displayName: aliasName } : group))
    })
  }

  useEffect(() => {
    setLocalContributorGroups(contributorGroups)
  }, [contributorGroups])

  const groupedContributorsSet = useMemo(
    () => new Set(localContributorGroups.flatMap((group) => group.members).map(uniqueId)),
    [localContributorGroups]
  )

  const ungroupedContributorsSorted = useMemo(
    () =>
      contributors
        .filter((contributor) => !groupedContributorsSet.has(uniqueId(contributor)))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [contributors, groupedContributorsSet]
  )

  const ungroupedContributorsFiltered = useMemo(() => {
    return ungroupedContributorsSorted.filter((contributor) =>
      contributor.name.toLowerCase().includes(filter.toLowerCase())
    )
  }, [ungroupedContributorsSorted, filter])

  const autoGroupCandidates = useMemo(
    () => autoBuildContributorGroups(ungroupedContributorsSorted),
    [ungroupedContributorsSorted]
  )
  const autoGroupAuthorCount = useMemo(
    () => autoGroupCandidates.reduce((sum, group) => sum + group.members.length, 0),
    [autoGroupCandidates]
  )

  const getColorFromDisplayName = (displayName: string) => contributorColors.get(displayName) ?? "#333"

  const ungroupedContributorsEntries = ungroupedContributorsFiltered.map((contributor) => {
    const isContributorSelected = selectedContributors.some((selected) => uniqueId(selected) === uniqueId(contributor))
    return (
      <CheckboxWithLabel
        key={uniqueId(contributor) + isContributorSelected}
        className="contents"
        checkBoxClassName="ml-auto"
        checked={isContributorSelected}
        onChange={(e) => {
          setSelectedContributors((prev) => {
            if (e.target?.checked) return [...prev, contributor]
            else return prev.filter((selected) => uniqueId(selected) !== uniqueId(contributor))
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
            title={contributor.email}
          >
            {contributor.email}
          </p>
        </div>
      </CheckboxWithLabel>
    )
  })

  const groupedContributorsEntries = localContributorGroups.map(({ displayName, members }, aliasGroupIndex) => {
    const color = getColorFromDisplayName(displayName)

    return (
      <div
        key={aliasGroupIndex}
        className="card bg-primary-bg dark:bg-primary-bg-dark group m-0 flex h-full flex-col justify-between p-2"
        title={displayName}
      >
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full flex-row justify-between gap-1">
            <div className="bg-secondary-bg dark:bg-secondary-bg-dark flex w-full flex-row items-center gap-2 rounded-md px-2 py-1">
              <LegendDot dotColor={color} />
              <select
                className="w-full truncate pr-2 text-sm font-bold"
                value={displayName}
                onChange={(e) => makePrimaryAlias(e.target.value, aliasGroupIndex)}
              >
                {Array.from(new Set([displayName, ...members.map((member) => member.name)])).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-full opacity-0 transition-opacity group-hover:opacity-100">
              <div className="h-full max-w-0 overflow-hidden transition-[max-width] group-hover:max-w-20">
                <button
                  className="btn btn--danger h-full w-fit"
                  title="Ungroup"
                  onClick={() => setLocalContributorGroups((prev) => prev.filter((_, i) => i !== aliasGroupIndex))}
                >
                  <Icon path={mdiAccountMultipleRemove} size={0.75} />
                </button>
              </div>
            </div>
          </div>
          <div>
            {members
              .filter((value, index, array) => array.map((v) => v.email).indexOf(value.email) === index)
              .map((contributor) => (
                <AliasEntry
                  key={uniqueId(contributor)}
                  contributor={contributor}
                  onClick={() =>
                    setLocalContributorGroups((prev) =>
                      prev.flatMap((group, i) => {
                        if (i !== aliasGroupIndex) return [group]
                        const remainingMembers = group.members.filter((member) => member.email !== contributor.email)
                        return remainingMembers.length > 0 ? [{ ...group, members: remainingMembers }] : []
                      })
                    )
                  }
                />
              ))}
          </div>
        </div>
        <div
          className={cn(
            "relative flex h-full w-full origin-top items-end justify-end transition-all delay-50 duration-100",
            selectedContributors.length === 0 ? "max-h-0 scale-y-0 opacity-0" : "max-h-10 scale-y-100 opacity-100"
          )}
        >
          <button
            className="btn btn--primary right bottom absolute h-fit w-fit px-2 py-1 text-xs shadow-lg"
            title="Add selected contributors to this group"
            disabled={selectedContributors.length === 0}
            onClick={() => {
              setLocalContributorGroups((prev) => {
                return prev.map((group, i) =>
                  i === aliasGroupIndex ? { ...group, members: group.members.concat(selectedContributors) } : group
                )
              })
              setSelectedContributors([])
            }}
          >
            <Icon path={mdiAccountMultiplePlus} size={0.75} />
            Add contributor
          </button>
        </div>
      </div>
    )
  })

  return (
    <Modal
      open={open}
      title="Group contributors"
      icon={mdiAccountMultiple}
      onClose={() => {
        handleCloseWithSubmitIfChanged()
        onClose()
      }}
    >
      <div className="flex min-h-0 w-auto max-w-(--breakpoint-lg) min-w-0 flex-col gap-2 p-4">
        <div className="grid grid-cols-[1fr_1fr] gap-2">
          <h3 className="text-center text-lg font-bold">
            Ungrouped Contributors ({ungroupedContributorsSorted.length})
          </h3>
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
                        const next = new Map(selected.map((contributor) => [uniqueId(contributor), contributor]))
                        for (const contributor of ungroupedContributorsFiltered) {
                          next.set(uniqueId(contributor), contributor)
                        }
                        return Array.from(next.values())
                      })
                }
              >
                {selectedContributors.length === ungroupedContributorsFiltered.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="bg-primary-bg dark:bg-primary-bg-dark grid min-h-0 w-full grid-cols-[min-content_3fr_3fr_min-content] items-center gap-x-4 gap-y-1 overflow-y-auto rounded-lg p-2">
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
            <div className="grid h-min min-h-0 grid-cols-1 gap-4 rounded-md p-2 lg:grid-cols-1 xl:grid-cols-2">
              {localContributorGroups.length > 0 ? (
                groupedContributorsEntries
              ) : (
                <p className="col-span-2 text-center text-sm">No contributors have been grouped yet</p>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_1fr] gap-2">
          <div className="flex w-full flex-row justify-end gap-2">
            {autoGroupAuthorCount > 0 ? (
              <button
                className="btn btn--primary w-fit transition-all duration-100"
                title={
                  autoGroupCandidates.length === 0
                    ? "No ungrouped contributors share the same name or email"
                    : `Create ${autoGroupCandidates.length} inferred group${autoGroupCandidates.length > 1 ? "s" : ""} containing ${autoGroupAuthorCount} author${autoGroupAuthorCount > 1 ? "s" : ""}`
                }
                disabled={autoGroupCandidates.length === 0}
                onClick={() => {
                  setLocalContributorGroups((prev) => {
                    const next = prev.slice()
                    for (const autoGroup of autoGroupCandidates) next.push(autoGroup)
                    return next
                  })
                  setSelectedContributors([])
                }}
              >
                <Icon path={mdiAccountMultipleCheck} size={1} />
                Auto group ({autoGroupAuthorCount})
              </button>
            ) : null}
            <button
              className="btn btn--primary w-fit transition-all duration-100"
              title={
                selectedContributors.length < 2
                  ? "Select at least 2 contributors to group them"
                  : "Group the selected contributors"
              }
              disabled={selectedContributors.length < 2}
              onClick={() => {
                setLocalContributorGroups((prev) => [
                  ...prev,
                  { displayName: pickContributorGroupDisplayName(selectedContributors), members: selectedContributors }
                ])
                setSelectedContributors([])
              }}
            >
              <Icon path={mdiAccountMultiplePlus} size={1} />
              Create new group
            </button>
          </div>
          <div className="flex w-full flex-row justify-end gap-2">
            <button
              className="btn btn--danger w-fit transition-all duration-100"
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
      </div>
    </Modal>
  )
}

function AliasEntry({
  contributor,
  onClick,
  disabled
}: {
  contributor: Person
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <div className="flex w-full items-center gap-2 pl-2">
      <LegendDot dotColor={missingInMapColor} className="size-2" />
      <button
        className="group/alias grid w-full grid-cols-[minmax(0,1fr)_1rem] items-center gap-2 text-sm"
        disabled={disabled}
        title="Make display name for this grouping"
        onClick={onClick}
      >
        <span
          title={contributor.email}
          className="label group min-w-0 truncate text-start text-xs group-hover/alias:text-red-500"
        >
          {contributor.email}
        </span>
        <div className="flex opacity-0 transition-opacity duration-200 group-hover/alias:opacity-100">
          <Icon path={mdiAccountRemove} size={0.75} />
        </div>
      </button>
    </div>
  )
}

function uniqueId(person: Person) {
  return `${person.name}\u0000${person.email ?? ""}`
}
