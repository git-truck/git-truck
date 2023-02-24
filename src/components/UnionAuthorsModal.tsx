import { useId } from "react"
import type { MouseEvent } from "react"
import { useState } from "react"
import { useSubmit, useTransition } from "@remix-run/react"
import styled from "styled-components"
import { useData } from "~/contexts/DataContext"
import { Spacer } from "./Spacer"
import { getPathFromRepoAndHead } from "~/util"
import { CloseButton, Label, Actions, Grower, IconButton, LegendDot } from "~/components/util"
import { ArrowUp } from "@styled-icons/octicons"
import { useMetrics } from "~/contexts/MetricContext"
import { MergeType as MergeIcon } from "@styled-icons/material"
import { useKey } from "react-use"

export function UnionAuthorsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { repo, analyzerData, truckConfig } = useData()
  const submit = useSubmit()
  const { authors } = analyzerData
  const authorUnions = truckConfig.unionedAuthors ?? []
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([])
  const flattedUnionedAuthors = authorUnions
    .reduce((acc, union) => {
      return [...acc, ...union]
    }, [] as string[])
    .sort(stringSorter)

  function unmergeGroup(groupToUnGroup: number) {
    const newAuthorUnions = authorUnions.filter((_, i) => i !== groupToUnGroup)
    const form = new FormData()
    form.append("unionedAuthors", JSON.stringify(newAuthorUnions))

    submit(form, {
      action: `/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`,
      method: "post",
    })
  }

  function mergeSelectedUsers() {
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

  const transitionData = useTransition()
  const disabled = transitionData.state !== "idle"
  const [, authorColors] = useMetrics()

  const ungroupedUsersSorted = authors
    .filter((a) => !flattedUnionedAuthors.includes(a))
    .slice(0)
    .sort(stringSorter)

  function handleModalWrapperClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  useKey("Escape", onClose)

  const getColorFromDisplayName = (displayName: string) => authorColors.get(displayName) ?? "#333"

  if (!visible) return null

  /*
position: relative;
  margin: auto;
  max-width: 1000px;
  max-height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  */

  return (
    <ModalWrapper onClick={handleModalWrapperClick}>
      <div className="box relative max-w-screen-lg overflow-hidden flex max-h-full">
        <div>
          <h2>Merge duplicate users</h2>
        </div>
        <Spacer xl />
        <h3>Ungrouped users</h3>
        <Spacer sm />
        <p>
          {ungroupedUsersSorted.length === 0
            ? "All detected users have been grouped"
            : "Select the users that you know are the same person"}
        </p>
        <Spacer xl />
        <UngroupedUsers>
          {ungroupedUsersSorted.map((author) => (
            <CheckboxWithLabel
              key={author}
              checked={selectedAuthors.includes(author)}
              onChange={(e) => {
                const newSelectedAuthors = e.target.checked
                  ? [...selectedAuthors, author]
                  : selectedAuthors.filter((a) => a !== author)
                setSelectedAuthors(newSelectedAuthors)
              }}
            >
              <DisplayName>
                <LegendDot dotColor={getColorFromDisplayName(author)} />
                <Spacer horizontal />
                {author}
              </DisplayName>
            </CheckboxWithLabel>
          ))}
        </UngroupedUsers>
        <Spacer xl />
        {ungroupedUsersSorted.length > 0 ? (
          <Actions>
            <button className="btn"
              onClick={mergeSelectedUsers}
              title={`Merge the selected users`}
              disabled={disabled || selectedAuthors.length === 0}
            >
              <MergeIcon display="inline-block" height="1rem" />
              Merge
            </button>
          </Actions>
        ) : null}
        <Spacer />
        <h3>Grouped users</h3>
        <Spacer sm />
        <GroupedUsers>
          {authorUnions.length === 0 ? (
            <p>There are no grouped users</p>
          ) : (
            authorUnions.map((aliasGroup, aliasGroupIndex) => {
              const displayName = aliasGroup[0]
              const disabled = transitionData.state !== "idle"
              const color = getColorFromDisplayName(displayName)
              return (
                <div className="box flex m-0" key={aliasGroupIndex}>
                  <DisplayName>
                    <LegendDot dotColor={color} />
                    <Spacer horizontal />
                    <b>{displayName}</b>
                  </DisplayName>
                  <Spacer />
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
                  <Grower />
                  <Actions>
                    <Grower />
                    <button className="btn"
                      onClick={() => unmergeGroup(aliasGroupIndex)}
                      title="Unmerge this group"
                      disabled={disabled}
                    >
                      Unmerge
                    </button>
                  </Actions>
                </div>
              )
            })
          )}
        </GroupedUsers>
        <CloseButton onClick={onClose} />
      </div>
    </ModalWrapper>
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
      <AliasEntryRoot key={alias}>
        <div>
          <StyledIconButton disabled={disabled} onClick={onClick} title="Make display name for this group">
            <ArrowUp display="inline-block" height="1rem" />
            <Label>{alias}</Label>
          </StyledIconButton>
        </div>
      </AliasEntryRoot>
    )
  }
}

// Checkbox with label
function CheckboxWithLabel({
  children,
  checked,
  onChange,
}: {
  children: React.ReactNode
  checked: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const id = useId()
  return (
    <CheckboxWrapper>
      <Checkbox checked={checked} onChange={onChange} id={id} />
      <Label htmlFor={id}>{children}</Label>
    </CheckboxWrapper>
  )
}

const stringSorter = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase())

const ModalWrapper = styled.div`
  position: fixed;
  inset: 0;
  padding: calc(4 * var(--unit));
  background-color: hsla(0, 0%, 0%, 0.5);
`

const GroupedUsers = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  grid-gap: var(--unit);
`

const UngroupedUsers = styled.div`
  overflow-y: auto;
`

const DisplayName = styled.div`
  display: inline-flex;
  flex-direction: row;
  place-items: center;
  line-height: 100%;
  margin: 0px;
`

const StyledIconButton = styled(IconButton)`
  grid-auto-flow: column;
  & > svg {
    opacity: 0;
  }
  &:hover > svg {
    opacity: 1;
  }
`

const AliasEntryRoot = styled.div`
  display: flex;
`
const CheckboxWrapper = styled.div``
const Checkbox = styled.input.attrs({ type: "checkbox" })``
