import { Fragment } from "react"
import styled from "styled-components"

interface AuthorDistFragProps {
  items: [string, number][]
  show: boolean
}

const DetailsKey = styled.span<{ grow?: boolean }>`
  white-space: pre;
  font-size: 0.9em;
  font-weight: 500;
  opacity: 0.7;
`

const DetailsValue = styled.p`
  overflow-wrap: anywhere;
  font-size: 0.9em;
  text-align: right;
`

export function AuthorDistFragment(props: AuthorDistFragProps) {
  if (!props.show) return null
  return (
    <>
      {props.items.map((legendItem) => {
        const [author, contrib] = legendItem
        const roundedContrib = Math.round(contrib * 100)
        return (
          <Fragment key={author + contrib}>
            <DetailsKey grow>{author}</DetailsKey>
            <DetailsValue>
              {roundedContrib === 0 ? "<1" : roundedContrib}%
            </DetailsValue>
          </Fragment>
        )
      })}
    </>
  )
}
