import { Spacer } from "./Spacer"
import { makePercentResponsibilityDistribution } from "./Chart"
import { Box, BoxTitle, CloseButton } from "./util"
import { useOptions } from "../contexts/OptionsContext"
import { HydratedGitBlobObject } from "../../../parser/src/model"
import { dateFormatLong } from "../util"
import styled from "styled-components"

const DetailsEntry = styled.div`
  display: flex;
  align-items: baseline;
`

const DetailsSectionHeading = styled.h3`
  font-size: calc(var(--unit) * 2);
  letter-spacing: calc(var(--unit) / 6);
  text-transform: uppercase;
  opacity: 0.6;
  padding-top: calc(var(--unit));
  padding-bottom: calc(var(--unit) / 2);
  border-bottom: 1px solid var(--border-color);
`

const DetailsLabel = styled.span<{ grow?: boolean }>`
  ${({ grow }) => (grow ? "flex-grow: 1" : "")};
  font-weight: bold;
  opacity: 0.75;
  margin-right: var(--unit);
  white-space: pre;
`

export function Details() {
  const { setClickedBlob, clickedBlob } = useOptions()
  if (clickedBlob === null) return null
  return (
    <Box>
      <CloseButton
        onClick={() => {
          setClickedBlob(null)
        }}
      >
        &times;
      </CloseButton>
      <BoxTitle title={clickedBlob.name}>{clickedBlob.name}</BoxTitle>
      <LineCountDiv lineCount={clickedBlob.noLines} />
      <DetailsEntry>
        <DetailsLabel grow>Commits:</DetailsLabel>
        <span>{clickedBlob.noCommits > 0 ? clickedBlob.noCommits : 0}</span>
      </DetailsEntry>
      <DetailsEntry>
        <DetailsLabel grow>Last changed:</DetailsLabel>{" "}
        {dateFormatLong(clickedBlob.lastChangeEpoch)}
      </DetailsEntry>
      <Path path={clickedBlob.path} />
      <Spacer xl />
      <AuthorDistribution currentClickedBlob={clickedBlob} />
    </Box>
  )
}

const PathSpan = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  font-family: monospace;
  font-size: calc(var(--unit) * 1.75);
  justify-content: right;
`

function Path(props: { path: string }) {
  const parts = props.path.split("/").slice(1)
  return (
    <DetailsEntry>
      <DetailsLabel>Located at:</DetailsLabel>{" "}
      <PathSpan>
        {parts.map((part, index) => (
          <span>{index === parts.length - 1 ? part : `${part}/`}</span>
        ))}
      </PathSpan>
    </DetailsEntry>
  )
}

function AuthorDistribution(props: {
  currentClickedBlob: HydratedGitBlobObject
}) {
  if (Object.values(props.currentClickedBlob.authors).length === 0) return <></>
  return (
    <>
      <DetailsSectionHeading>Author distribution</DetailsSectionHeading>
      <Spacer xs />
      {Object.entries(
        makePercentResponsibilityDistribution(props.currentClickedBlob)
      )
        .sort((a, b) => (a[1] < b[1] ? 1 : -1))
        .map(([author, contrib]) => (
          <DetailsEntry key={`${author}${contrib}`}>
            <DetailsLabel grow>{author}:</DetailsLabel>{" "}
            {Math.round(contrib * 100)}%
          </DetailsEntry>
        ))}
    </>
  )
}

function LineCountDiv(props: { lineCount: number }) {
  if (!props.lineCount) return <div>No lines (likely a binary file)</div>
  return (
    <DetailsEntry>
      <DetailsLabel grow>Line count:</DetailsLabel> {props.lineCount}
    </DetailsEntry>
  )
}
