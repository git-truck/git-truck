import { useState } from "react"
import styled from "styled-components"
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
      {paths.length > 1 ? (
        <Breadcrumb>
          {paths.reverse().map(([name, p], i) => {
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
          })}
        </Breadcrumb>
      ) : (
        <Breadcrumb></Breadcrumb>
      )}
      <ChartWrapper ref={ref}>
        <Chart size={size} />
      </ChartWrapper>
      <HistoryStuff />
    </MainRoot>
  )
}

const HistoryStuffContainer = styled.div`
  display: grid;
`

const StyledRangeInput = styled.input`
  width: 100%;
  height: 100%;
  grid-area: 2/1;
  opacity: 0;
  cursor: col-resize;
`

const BarChartWrapper = styled.div`
  display: grid;
`

const BarChart = styled.div`
  display: flex;
  align-items: flex-end;
  flex-direction: row;
  height: 50px;
  grid-area: 2/1;
`

const Bar = styled.div`
  background-color: hsl(0, 0%, 80%);
  width: 100%;
`

export function HistoryStuff() {
  const data = useData()

  const linearHistory: string[] = data.commit.linearHistory

  const lineChangeCountLogarithmic: Record<string, number> = {}
  for (const hash in data.commit.lineChangeCount) {
    if (Object.prototype.hasOwnProperty.call(data.commit.lineChangeCount, hash)) {
      const value = data.commit.lineChangeCount[hash]
      lineChangeCountLogarithmic[hash] = Math.log(value)
    }
  }

  let maxLineChangeCount = 0
  for (const lineChangeCount of Object.values(lineChangeCountLogarithmic))
    if (lineChangeCount > maxLineChangeCount) maxLineChangeCount = lineChangeCount

  // maxLineChangeCount = 2

  const [commitIndex, setCommitIndex] = useState(linearHistory.length - 1)

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setCommitIndex(Number.parseInt(e.target.value))
  }

  const commitHashShort = linearHistory[commitIndex].substring(0, 6)
  const currLineChangeCount = lineChangeCountLogarithmic[linearHistory[commitIndex]]
  const currLineChangeCountNotLogarithmic = data.commit.lineChangeCount[linearHistory[commitIndex]]

  return (
    <HistoryStuffContainer>
      <BarChartWrapper>
        <BarChart>
          {linearHistory.map((hash: string, i: number) => {
            const getHeight =
              Math.floor((10000 * lineChangeCountLogarithmic[linearHistory[i]]) / maxLineChangeCount) / 100
            return (
              <Bar
                key={hash}
                style={{
                  height: `${getHeight ?? 1}%`,
                  backgroundColor: i <= commitIndex ? "hsl(0, 50%, 50%)" : "hsl(0, 0%, 80%)",
                }}
              ></Bar>
            )
          })}
        </BarChart>
        <StyledRangeInput
          type="range"
          min={0}
          max={linearHistory.length - 1}
          value={commitIndex}
          onChange={handleChange}
        ></StyledRangeInput>
      </BarChartWrapper>
      <div>{`[#${commitHashShort}] lines: ${currLineChangeCountNotLogarithmic}`}</div>
    </HistoryStuffContainer>
  )
}
