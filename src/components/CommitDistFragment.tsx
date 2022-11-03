import { Fragment } from "react"
import type { Commit } from "~/analyzer/model"
import { dateFormatLong } from "~/util"
import { DetailsKey, DetailsValue, LegendLabel } from "./util"

interface CommitDistFragProps {
  items: Commit[]
  show: boolean
}

export function CommitDistFragment(props: CommitDistFragProps) {
  if (!props.show) return null

  return (
    <>
      {props.items.map((commit) => {
        console.log(commit)
        return (
          <Fragment key={commit.date.toString() + commit.message}>
            <DetailsKey title={commit.message} grow>
              <LegendLabel style={{ opacity: 0.7 }}>{commit.message}</LegendLabel>
            </DetailsKey>
            <DetailsValue>{dateFormatLong(commit.date)}</DetailsValue>
          </Fragment>
        )
      })}
    </>
  )
}
