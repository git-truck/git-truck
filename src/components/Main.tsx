import { useMemo, useState } from "react"
import styled from "styled-components"
import { emptyGitCommitHash } from "~/analyzer/constants"
import { useData } from "~/contexts/DataContext"
import { usePath } from "~/contexts/PathContext"
import { useComponentSize } from "../hooks"
import { Chart } from "./Chart"

export const MainRoot = styled.main`
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  height: 100%;
`

const Breadcrumb = styled.div`
  margin: var(--unit);
  & > * {
    margin: 0 calc(var(--unit) * 0.5);
  }
`

export const ClickableText = styled.button`
  background: none;
  border: none;
  font-family: inherit;
  font-weight: inherit;
  font-size: inherit;
  color: hsl(210, 10%, 50%);
  cursor: pointer;
  &:hover {
    color: #8080ff;
    text-decoration-color: #8080ff;
  }
`

export const NonClickableText = styled.span`
  color: hsl(210, 10%, 30%);
  cursor: default;
`

const ChartWrapper = styled.div`
  display: grid;
  place-items: center;
  overflow: hidden;
`

export function Main() {
  const [ref, size] = useComponentSize()
  const { path, setPath } = usePath()
  const data = useData()

  let temppath = path
  let paths: [string, string][] = []

  for (let i = 0; i < 8; i++) {
    if (temppath === "") {
      break
    }
    const idx = temppath.lastIndexOf("/")
    paths.push([temppath.substring(idx + 1), temppath])
    temppath = temppath.substring(0, idx)
  }

  if (temppath !== "") {
    paths = paths.slice(0, paths.length - 1)
    paths.push(["...", ""])
    paths.push([data.repo, data.repo])
  }

  return (
    <MainRoot>
      <Breadcrumb>
        {paths.length > 1
          ? paths.reverse().map(([name, p], i) => {
              if (p === "" || i === paths.length - 1)
                if (p === "")
                  return (
                    <>
                      <NonClickableText key={p}>{name}</NonClickableText>
                      <span>{"\u203A"}</span>
                    </>
                  )
                else return <NonClickableText key={p}>{name}</NonClickableText>
              else
                return (
                  <>
                    <ClickableText key={p} onClick={() => setPath(p)}>
                      {name}
                    </ClickableText>
                    <span>{"\u203A"}</span>
                  </>
                )
            })
          : null}
      </Breadcrumb>
      <ChartWrapper ref={ref}>
        <Chart size={size} />
      </ChartWrapper>
      <HistoryStuff />
    </MainRoot>
  )
}

const HistoryStuffContainer = styled.div`
  /* border: 2px solid black; */
`

const StyledRangeInput = styled.input`
  width: 100%;
`

const BarChart = styled.div`
  display: flex;
  align-items: flex-end;
  flex-direction: row;
  height: 50px;
`

const Bar = styled.div`
  background-color: red;
  width: 100%;
`

export function HistoryStuff() {
  const data = useData()

  // Create a list of commits on the main branch
  const mainBranchCommitHashes: string[] = []
  let curr = data.historicGraph.head
  while (curr != emptyGitCommitHash) {
    if (curr == emptyGitCommitHash) break
    mainBranchCommitHashes.push(curr)
    const parent1 = data.hashToGitCommitObjectLight[curr].parent
    curr = parent1
  }
  mainBranchCommitHashes.reverse()

  const values = useMemo(
    () => mainBranchCommitHashes.map((x) => Math.floor(Math.random() * 100)),
    []
  )

  const [commitIndex, setCommitIndex] = useState(
    mainBranchCommitHashes.length - 1
  )

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setCommitIndex(Number.parseInt(e.target.value))
  }

  const commitHashShort = mainBranchCommitHashes[commitIndex].substring(0, 6)
  const commitMessageSnippet =
    data.hashToGitCommitObjectLight[
      mainBranchCommitHashes[commitIndex]
    ].message.split("\n")[0]

  return (
    <HistoryStuffContainer>
      <BarChart>
        {mainBranchCommitHashes.map((hash: string, i: number) => {
          return (
            <Bar
              key={hash}
              style={{
                height: `${values[i]}%`,
              }}
            ></Bar>
          )
        })}
      </BarChart>
      <StyledRangeInput
        type="range"
        min={0}
        max={mainBranchCommitHashes.length - 1}
        value={commitIndex}
        onChange={handleChange}
      ></StyledRangeInput>
      <div>{`[#${commitHashShort}] ${commitMessageSnippet}`}</div>
    </HistoryStuffContainer>
  )
}
