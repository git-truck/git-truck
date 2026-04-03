import { useTransition, useState } from "react"
import { useNavigation, Form } from "react-router"
import { useData } from "~/contexts/DataContext"
import { CheckboxWithLabel } from "~/components/modals/utils/CheckboxWithLabel"
import { useMetrics } from "~/contexts/MetricContext"
import { Icon } from "~/components/Icon"
import { mdiArrowUp, mdiAccountMultiplePlus, mdiAccountMultipleMinus } from "@mdi/js"
import { LegendDot } from "~/components/util"
import { useViewAction, useViewSubmit } from "~/hooks"

export function GroupContributorsModal() {
  const { databaseInfo } = useData()
  const submit = useViewSubmit()
  const { contributorGroups, contributors: contributors } = databaseInfo
  const [selectedContributors, setSelectedContributors] = useState<string[]>([])
  const [filter, setFilter] = useState("")
  const navigationData = useNavigation()
  const [, contributorColors] = useMetrics()
  const [, startTransition] = useTransition()
  const viewAction = useViewAction()

  const flattedUnionedContributor = contributorGroups
    .reduce((acc, group) => {
      return [...acc, ...group]
    }, [] as string[])
    .sort(stringSorter)

  function ungroup(groupToUnGroup: number) {
    const newContributorGroups = contributorGroups.filter((_, i) => i !== groupToUnGroup)
    const form = new FormData()
    form.append("groupedContributors", JSON.stringify(newContributorGroups))

    submit(form, {
      method: "post"
    })
  }

  function ungroupAll() {
    const form = new FormData()
    form.append("groupedContributors", JSON.stringify([]))

    submit(form, {
      method: "post"
    })
  }

  function groupSelectedContributors() {
    if (selectedContributors.length < 2) return
    const form = new FormData()
    form.append("groupedContributors", JSON.stringify([...contributorGroups, selectedContributors]))

    submit(form, {
      method: "post"
    })
    setSelectedContributors([])
  }

  function makePrimaryAlias(alias: string, groupIndex: number) {
    const newContributorUnions = contributorGroups.map((group, i) => {
      if (i === groupIndex) {
        return [alias, ...group.filter((a) => a !== alias)]
      }
      return group
    })
    const form = new FormData()
    form.append("groupedContributors", JSON.stringify(newContributorUnions))

    submit(form, {
      method: "post"
    })
  }

  const disabled = navigationData.state !== "idle"

  const ungroupedContributorsSorted = contributors
    .filter((a) => !flattedUnionedContributor.includes(a))
    .slice(0)
    .sort(stringSorter)

  const getColorFromDisplayName = (displayName: string) => contributorColors.get(displayName) ?? "#333"

  const ungroupedContributorsFiltered = ungroupedContributorsSorted.filter((contributor) =>
    contributor.toLowerCase().includes(filter.toLowerCase())
  )
  const ungroupedContributorsEntries = ungroupedContributorsFiltered.map((contributor) => {
    const isContributorSelected = selectedContributors.includes(contributor)
    return (
      <CheckboxWithLabel
        key={contributor + isContributorSelected}
        className="hover:opacity-70"
        checked={isContributorSelected}
        onChange={(e) => {
          const newSelectedContributors = e.target?.checked
            ? [...selectedContributors, contributor]
            : selectedContributors.filter((a) => a !== contributor)
          setSelectedContributors(newSelectedContributors)
        }}
      >
        <div className="inline-flex flex-1 flex-row place-items-center gap-2">
          <LegendDot dotColor={getColorFromDisplayName(contributor)} />
          {contributor}
        </div>
      </CheckboxWithLabel>
    )
  })

  const groupedContributorsEntries = contributorGroups.map((aliasGroup, aliasGroupIndex) => {
    const displayName = aliasGroup[0]
    const disabled = navigationData.state !== "idle"
    const color = getColorFromDisplayName(displayName)

    return (
      <div
        key={aliasGroupIndex}
        className="card bg-tertiary-bg dark:bg-tertiary-bg-dark group m-0 flex h-full flex-col p-2"
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
            <AliasEntry
              key={alias}
              alias={alias}
              disabled={disabled}
              onClick={() => makePrimaryAlias(alias, aliasGroupIndex)}
            />
          ))}
        <div className="grow" />
        <div className="flex items-end justify-end gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <Form method="post" action={viewAction}>
            <input type="hidden" name="groupedContributors" value={JSON.stringify(contributorGroups)} />
            <button
              className="btn"
              title="Add selected contributors to this group"
              disabled={disabled || selectedContributors.length === 0}
              onClick={() => {
                const newContributorUnions = contributorGroups.map(([displayName, ...group], i) => {
                  if (i === aliasGroupIndex) {
                    return [displayName, ...group, ...selectedContributors]
                  }
                  return [displayName, ...group]
                })
                const form = new FormData()
                form.append("groupedContributors", JSON.stringify(newContributorUnions))

                submit(form, {
                  method: "post"
                })
                setSelectedContributors([])
              }}
            >
              Add selected
            </button>
          </Form>
          <button className="btn" title="Ungroup" disabled={disabled} onClick={() => ungroup(aliasGroupIndex)}>
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
              disabled={disabled || selectedContributors.length === 0}
              className="btn btn--outlined w-max grow"
              title="Clear selection"
              onClick={() => setSelectedContributors([])}
            >
              Clear
            </button>
            <button
              disabled={ungroupedContributorsSorted.length === 0}
              className="btn btn--outlined w-max grow"
              title="Clear selection"
              onClick={() =>
                selectedContributors.length === ungroupedContributorsFiltered.length
                  ? setSelectedContributors([])
                  : setSelectedContributors((selected) =>
                      Array.from(new Set([...selected, ...ungroupedContributorsFiltered]))
                    )
              }
            >
              {selectedContributors.length === ungroupedContributorsFiltered.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="min-h-0 w-full flex-1 justify-between overflow-y-auto p-2">
            {ungroupedContributorsEntries.length > 0 ? (
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
            {contributorGroups.length > 0 ? (
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
            disabled || selectedContributors.length < 2
              ? "Select at least 2 contributors to group them"
              : "Group the selected contributors"
          }
          disabled={disabled || selectedContributors.length < 2}
          onClick={groupSelectedContributors}
        >
          <Icon path={mdiAccountMultiplePlus} size={1} />
          Create group
        </button>
        <button
          className="btn btn--danger mx-auto w-fit"
          disabled={disabled || contributorGroups.length === 0}
          onClick={() => {
            if (confirm("Are you sure you want to ungroup all grouped contributors?")) ungroupAll()
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
