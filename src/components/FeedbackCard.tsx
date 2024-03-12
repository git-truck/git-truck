import { mdiMessageDraw, mdiAlertCircleOutline, mdiForum } from "@mdi/js"
import Icon from "@mdi/react"
import { memo } from "react"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import yearOfRat from "year-of-rat"

export const FeedbackCard = memo(function FeedbackCard() {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="card__title">Help improve Git Truck</h3>
        <Icon path={mdiForum} size={1} />
      </div>
      <a
        className="btn"
        href="https://docs.google.com/forms/d/e/1FAIpQLSclLnUCPb0wLZx5RulQLaI_N_4wjNkd6z7YLkA3BzNVFjfiEg/viewform?usp=sf_link"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon path={mdiMessageDraw} />
        Answer questionnaire
      </a>
      <a
        className="btn"
        href="https://github.com/git-truck/git-truck/issues/new?template=user-issue.md"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon path={mdiAlertCircleOutline} />
        Open an issue
      </a>
      {yearOfRat() ?
        <p>It's ratting time 🐀🧀</p>
        : null
      }
    </div>
  )
})
