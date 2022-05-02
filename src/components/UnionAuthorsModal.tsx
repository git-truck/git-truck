import { useId } from "@react-aria/utils"
import { useState } from "react"
import { useSubmit } from "remix"
import styled from "styled-components"
import { useData } from "~/contexts/DataContext"
import { Spacer } from "./Spacer"
import { getPathFromRepoAndHead } from "~/util"
import { Box, Label, Actions, Grower } from "~/components/util"

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
    .sort()

  function ungroup(groupToUnGroup: number) {
    const newAuthorUnions = authorUnions.filter((_, i) => i !== groupToUnGroup)
    const form = new FormData()
    form.append("unionedAuthors", JSON.stringify(newAuthorUnions))

    submit(form, {
      action: `/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`,
      method: "post",
    })
  }

  function group() {
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

  if (!visible) return null

  const ungroupedUsersSorted = authors.filter((a) => !flattedUnionedAuthors.includes(a)).slice(0).sort()
  return (
    <ModalWrapper>
      <Modal>
        <ModalHeader>
          <ModalTitle>Merge duplicate users</ModalTitle>
          {/* <BoxTitle>Authors</BoxTitle> */}
        </ModalHeader>
        <Spacer xl />
        <h3>Grouped users</h3>
        <Spacer sm />
        <GroupedUsers>
          {authorUnions.length === 0 ? (
            <p>There are no grouped users</p>
          ) : (
            authorUnions.map((aliasGroup, aliasGroupIndex) => {
              return (
                <StyledBox key={aliasGroupIndex}>
                  <b>{aliasGroup[0]}</b>
                  <Spacer />
                  {aliasGroup.slice(0).sort().map((alias) => (
                    <AliasEntry key={alias}>
                      <div>
                        <button
                          title={`Make primary display name for ${aliasGroup[0]}`}
                          onClick={() => makePrimaryAlias(alias, aliasGroupIndex)}
                        >
                          ⏫
                        </button>
                        <Spacer horizontal />
                        {alias}
                      </div>
                    </AliasEntry>
                  ))}
                  {/* <Grower /> */}
                  <Actions>
                    <Grower />
                    <button onClick={() => ungroup(aliasGroupIndex)} title={`Unmerge this group`}>
                      Unmerge
                    </button>
                  </Actions>
                </StyledBox>
              )
            })
          )}
        </GroupedUsers>
        <Spacer xl />
        <h3>Ungrouped users</h3>
        <Spacer sm />
        <p>
          {ungroupedUsersSorted.length === 0
            ? "All detected users have been grouped"
            : "Select the users that you know are the same person"}
        </p>
        <Spacer />
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
              {author}
            </CheckboxWithLabel>
          ))}
        </UngroupedUsers>
        <Spacer xl />
        <ModalFooter>
          <Actions>
            <Button onClick={group} title={`Group the selected people`}>
              Group
            </Button>
            <Grower />
            <button onClick={onClose}>Done</button>
          </Actions>
        </ModalFooter>
      </Modal>
    </ModalWrapper>
  )
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

const ModalWrapper = styled.div`
  position: fixed;
  inset: 0;
  padding: calc(4 * var(--unit));
  background-color: hsla(0, 0%, 0%, 0.5);
  /* Blur background */
  /* backdrop-filter: blur(var(--unit)); */
`
const Modal = styled(Box)`
  margin: auto;
  max-width: 1000px;
  max-height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`
const ModalHeader = styled.div``
const ModalTitle = styled.h2``
const GroupedUsers = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  grid-gap: var(--unit);
`

const UngroupedUsers = styled.div`
  overflow-y: auto;
`

const StyledBox = styled(Box)`
  margin: 0;
  display: flex;
  flex-direction: column;
`

const AliasEntry = styled.div`
  display: flex;
`
const ModalFooter = styled.div``
const Button = styled.button``
const CheckboxWrapper = styled.div``
const Checkbox = styled.input.attrs({ type: "checkbox" })``
