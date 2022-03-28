import { Fragment } from "react"
import { DetailsKey, DetailsValue } from "./util"

interface AuthorDistFragProps {
  items: [string, number][]
  show: boolean
}

export function AuthorDistFragment(props: AuthorDistFragProps) {
  if (!props.show) return null
  return (
    <>
      {props.items.map((legendItem) => {
        const [author, contrib] = legendItem
        const roundedContrib = Math.round(contrib * 100)
        return (
          <Fragment key={author + contrib}>
            <DetailsKey title={author} grow>{author}</DetailsKey>
            <DetailsValue>
              {roundedContrib === 0 ? "<1" : roundedContrib}%
            </DetailsValue>
          </Fragment>
        )
      })}
    </>
  )
}
