import { useTransition, useState, type JSX } from "react"
import { useNavigation, Form } from "react-router"
import { useData } from "~/contexts/DataContext"
import { CheckboxWithLabel } from "~/components/modals/utils/CheckboxWithLabel"
import { useMetrics } from "~/contexts/MetricContext"
import { Icon } from "~/components/Icon"
import { mdiArrowUp, mdiAccountMultiplePlus, mdiAccountMultipleMinus } from "@mdi/js"
import { LegendDot } from "~/components/util"
import { useViewAction, useViewSubmit } from "~/hooks"

export function GroupAuthorsModal() {
  const { databaseInfo } = useData()
  const submit = useViewSubmit()
  const { authors } = databaseInfo
  const authorUnions = databaseInfo.authorUnions
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([])
  const [filter, setFilter] = useState("")
  const navigationData = useNavigation()
  const [, authorColors] = useMetrics()
  const [, startTransition] = useTransition()
  const viewAction = useViewAction()

  const flattedUnionedAuthors = authorUnions
    .reduce((acc, union) => {
      return [...acc, ...union]
    }, [] as string[])
    .sort(stringSorter)

  function ungroup(groupToUnGroup: number) {
    const newAuthorUnions = authorUnions.filter((_, i) => i !== groupToUnGroup)
    const form = new FormData()
    form.append("unionedAuthors", JSON.stringify(newAuthorUnions))

    submit(form, {
      method: "post"
    })
  }

  function ungroupAll() {
    const form = new FormData()
    form.append("unionedAuthors", JSON.stringify([]))

    submit(form, {
      method: "post"
    })
  }

  function groupSelectedAuthors() {
    if (selectedAuthors.length < 2) return
    const form = new FormData()
    form.append("unionedAuthors", JSON.stringify([...authorUnions, selectedAuthors]))

    submit(form, {
      method: "post"
    })
    setSelectedAuthors([])
  }

  function makePrimaryAlias(alias: string, groupIndex: number) {
    const newAuthorUnions = authorUnions.map((group, i) => {
      if (i === groupIndex) {
        return [alias, ...group.filter((a) => a !== alias)]
      }
      return group
    })
    const form = new FormData()
    form.append("unionedAuthors", JSON.stringify(newAuthorUnions))

    submit(form, {
      method: "post"
    })
  }

  const disabled = navigationData.state !== "idle"

  const ungroupedAuthorsSorted = authors
    .filter((a) => !flattedUnionedAuthors.includes(a))
    .slice(0)
    .sort(stringSorter)

  const getColorFromDisplayName = (displayName: string) => authorColors.get(displayName) ?? "#333"

  const ungroupedAuthorsFiltered = ungroupedAuthorsSorted.filter((author) =>
    author.toLowerCase().includes(filter.toLowerCase())
  )
  const ungroupedAuthorsEntries = ungroupedAuthorsFiltered.map((author) => {
    const isAuthorSelected = selectedAuthors.includes(author)
    return (
      <CheckboxWithLabel
        key={author + isAuthorSelected}
        className="hover:opacity-70"
        checked={isAuthorSelected}
        onChange={(e) => {
          const newSelectedAuthors = e.target?.checked
            ? [...selectedAuthors, author]
            : selectedAuthors.filter((a) => a !== author)
          setSelectedAuthors(newSelectedAuthors)
        }}
      >
        <div className="inline-flex flex-row place-items-center gap-2">
          <LegendDot dotColor={getColorFromDisplayName(author)} />
          {author}
        </div>
      </CheckboxWithLabel>
    )
  })

  const groupedAuthorsEntries = authorUnions.map((aliasGroup, aliasGroupIndex) => {
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
            <input type="hidden" name="unionedAuthors" value={JSON.stringify(authorUnions)} />
            <button
              className="btn"
              title="Add selected authors to this group"
              disabled={disabled || selectedAuthors.length === 0}
              onClick={() => {
                const newAuthorUnions = authorUnions.map(([displayName, ...group], i) => {
                  if (i === aliasGroupIndex) {
                    return [displayName, ...group, ...selectedAuthors]
                  }
                  return [displayName, ...group]
                })
                const form = new FormData()
                form.append("unionedAuthors", JSON.stringify(newAuthorUnions))

                submit(form, {
                  method: "post"
                })
                setSelectedAuthors([])
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
        <h3 className="text-center text-lg font-bold">Ungrouped Authors ({ungroupedAuthorsSorted.length})</h3>
        <h3 className="text-center text-lg font-bold">Author Groups ({groupedAuthorsEntries.length})</h3>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_1fr] gap-2">
        <div className="flex min-h-0 flex-col rounded-md">
          <div className="flex gap-2 p-2">
            <input
              className="input min-w-0"
              type="search"
              placeholder="Filter..."
              disabled={ungroupedAuthorsSorted.length === 0}
              onChange={(e) => startTransition(() => setFilter(e.target.value))}
            />
            <button
              disabled={disabled || selectedAuthors.length === 0}
              className="btn btn--outlined w-max grow"
              title="Clear selection"
              onClick={() => setSelectedAuthors([])}
            >
              Clear
            </button>
            <button
              disabled={ungroupedAuthorsSorted.length === 0}
              className="btn btn--outlined w-max grow"
              title="Clear selection"
              onClick={() =>
                selectedAuthors.length === ungroupedAuthorsFiltered.length
                  ? setSelectedAuthors([])
                  : setSelectedAuthors((selected) => Array.from(new Set([...selected, ...ungroupedAuthorsFiltered])))
              }
            >
              {selectedAuthors.length === ungroupedAuthorsFiltered.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {ungroupedAuthorsEntries.length > 0 ? (
              ungroupedAuthorsEntries
            ) : (
              <p className="place-self-center text-sm">
                {filter.length > 0 ? "No authors found" : "All authors have been grouped"}
              </p>
            )}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto">
          <div className="grid h-min min-h-0 grid-cols-1 gap-4 rounded-md p-2 lg:grid-cols-2 xl:grid-cols-3">
            {authorUnions.length > 0 ? (
              groupedAuthorsEntries
            ) : (
              <p className="col-span-2 text-center text-sm">No authors have been grouped yet</p>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_1fr] gap-2">
        <button
          className="btn btn--primary mx-auto w-fit"
          title={
            disabled || selectedAuthors.length < 2
              ? "Select at least 2 authors to group them"
              : "Group the selected authors"
          }
          disabled={disabled || selectedAuthors.length < 2}
          onClick={groupSelectedAuthors}
        >
          <Icon path={mdiAccountMultiplePlus} size={1} />
          Create group
        </button>
        <button
          className="btn btn--danger mx-auto w-fit"
          disabled={disabled || authorUnions.length === 0}
          onClick={() => {
            if (confirm("Are you sure you want to ungroup all grouped authors?")) ungroupAll()
          }}
        >
          <Icon path={mdiAccountMultipleMinus} size={1} />
          Ungroup all
        </button>
      </div>
    </div>
  )

  function AliasEntry({
    alias,
    onClick,
    disabled
  }: {
    alias: string
    disabled?: boolean
    onClick: () => void
  }): JSX.Element {
    return (
      <button
        key={alias}
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
}

const stringSorter = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase())
