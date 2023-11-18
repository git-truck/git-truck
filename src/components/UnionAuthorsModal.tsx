import { useTransition, useState } from "react"
import type { MouseEvent } from "react"

import { useNavigation, useSubmit } from "@remix-run/react"
import { useData } from "~/contexts/DataContext"
import { getPathFromRepoAndHead } from "~/util"
import { CloseButton, LegendDot, CheckboxWithLabel } from "~/components/util"
import { useMetrics } from "~/contexts/MetricContext"
import { useKey } from "react-use"
import { Icon } from "@mdi/react"
import { mdiArrowUp, mdiAccountMultiple } from "@mdi/js"

export function UnionAuthorsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { repo, analyzerData, truckConfig } = useData()
  const submit = useSubmit()
  const { authors } = analyzerData
  const authorUnions = truckConfig.unionedAuthors ?? []
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([])
  const [filter, setFilter] = useState("")
  const navigationData = useNavigation()
  const [, authorColors] = useMetrics()
  const [, startTransition] = useTransition()

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
      action: `/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`,
      method: "post",
    })
  }

  function ungroupAll() {
    const form = new FormData()
    form.append("unionedAuthors", JSON.stringify([]))

    submit(form, {
      action: `/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`,
      method: "post",
    })
  }

  function groupSelectedAuthors() {
    if (selectedAuthors.length === 0) return
    const form = new FormData()
    form.append("unionedAuthors", JSON.stringify([...authorUnions, selectedAuthors]))

    submit(form, {
      action: `/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`,
      method: "post",
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
      action: `/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`,
      method: "post",
    })
  }

  const disabled = navigationData.state !== "idle"

  const ungroupedAuthorsSorted = authors
    .filter((a) => !flattedUnionedAuthors.includes(a))
    .slice(0)
    .sort(stringSorter)

  function handleModalWrapperClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  useKey("Escape", onClose)

  const getColorFromDisplayName = (displayName: string) => authorColors.get(displayName) ?? "#333"

  if (!visible) return null

  const ungroupedAuthorsMessage =
    ungroupedAuthorsSorted.length === 0
      ? "All detected authors have been grouped"
      : "Select the authors that you know are the same person"

  const groupedAuthorsMessage = authorUnions.length === 0 ? "No authors have been grouped yet" : ""

  const ungroupedAuthersEntries = ungroupedAuthorsSorted
    .filter((author) => author.toLowerCase().includes(filter.toLowerCase()))
    .map((author) => (
      <CheckboxWithLabel
        className="hover:opacity-70"
        key={author}
        checked={selectedAuthors.includes(author)}
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
    ))

  const groupedAuthorsEntries = authorUnions.map((aliasGroup, aliasGroupIndex) => {
    const displayName = aliasGroup[0]
    const disabled = navigationData.state !== "idle"
    const color = getColorFromDisplayName(displayName)

    return (
      <div className="card m-0 flex flex-col p-2" key={aliasGroupIndex}>
        <div className="inline-flex flex-row place-items-center gap-2">
          <LegendDot dotColor={color} />
          <b>{displayName}</b>
        </div>
        {aliasGroup
          .slice(1)
          .sort(stringSorter)
          .map((alias) => (
            <AliasEntry
              key={alias}
              alias={alias}
              onClick={() => makePrimaryAlias(alias, aliasGroupIndex)}
              disabled={disabled}
            />
          ))}
        <div className="flex justify-end">
          <button className="btn" onClick={() => ungroup(aliasGroupIndex)} title="Ungroup" disabled={disabled}>
            Ungroup
          </button>
        </div>
      </div>
    )
  })

  return (
    <div className="fixed inset-0 z-10 grid bg-black/50 p-2" onClick={handleModalWrapperClick}>
      <div className="card relative mx-auto grid h-full max-h-full w-auto max-w-screen-lg grid-flow-col grid-cols-[1fr_1fr]  grid-rows-[max-content_max-content_max-content_max-content_1fr_max-content] gap-4 overflow-hidden">
        <h2 className="col-span-2 text-2xl">Group authors</h2>

        <h3 className="text-lg font-bold">Ungrouped authors</h3>

        {ungroupedAuthorsSorted.length > 0 ? (
          <div className="flex justify-end gap-2">
            <input
              className="input"
              type="search"
              placeholder="Filter..."
              onChange={(e) => startTransition(() => setFilter(e.target.value))}
            />
            <button
              disabled={disabled || selectedAuthors.length === 0}
              onClick={() => setSelectedAuthors([])}
              className="btn flex-grow"
            >
              Clear
            </button>
            <button
              className="btn btn--primary"
              onClick={groupSelectedAuthors}
              title="Group the selected authors"
              disabled={disabled || selectedAuthors.length === 0}
            >
              <Icon path={mdiAccountMultiple} size={1} />
              Group
            </button>
          </div>
        ) : (
          <div />
        )}
        <p>{ungroupedAuthorsMessage}</p>

        <div className="min-h-0 overflow-y-auto rounded-md bg-slate-50 p-4 shadow-inner">{ungroupedAuthersEntries}</div>

        <div />

        <h3 className="text-lg font-bold">Grouped authors</h3>
        <div className="mr-6 flex justify-end gap-4">
          {authorUnions.length > 0 ? (
            <button
              className="btn btn--danger"
              disabled={disabled}
              onClick={() => {
                if (confirm("Are you sure you want to ungroup all grouped authors?")) ungroupAll()
              }}
            >
              Ungroup all
            </button>
          ) : (
            <div />
          )}
        </div>
        <p>{groupedAuthorsMessage}</p>

        <div className="flex flex-col gap-4 overflow-y-auto rounded-md bg-slate-50 p-4 shadow-inner">
          {authorUnions.length > 0 ? groupedAuthorsEntries : null}
        </div>

        <div className="mr-6 flex justify-end gap-4">
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </div>

        <CloseButton onClick={onClose} />
      </div>
    </div>
  )

  function AliasEntry({
    alias,
    onClick,
    disabled,
  }: {
    alias: string
    disabled?: boolean
    onClick: () => void
  }): JSX.Element {
    return (
      <button
        key={alias}
        className="btn--icon flex grid-flow-col gap-2 text-sm [&:hover>svg]:opacity-50 [&>svg]:opacity-0"
        disabled={disabled}
        onClick={onClick}
        title="Make display name for this grouping"
      >
        <Icon path={mdiArrowUp} size={0.75} />
        <label className="label">{alias}</label>
      </button>
    )
  }
}

const stringSorter = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase())
