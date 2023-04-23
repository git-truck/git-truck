import { RateReview as ReviewIcon } from "@styled-icons/material"

export function FeedbackCard() {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="card__subtitle">Help improve Git Truck</h3>
        <ReviewIcon height="1rem" />
      </div>
      <a
        className="btn"
        href="https://docs.google.com/forms/d/e/1FAIpQLSclLnUCPb0wLZx5RulQLaI_N_4wjNkd6z7YLkA3BzNVFjfiEg/viewform?usp=sf_link"
        target="_blank"
        rel="noopener noreferrer"
      >
        Answer questionnaire
      </a>
      <a
        className="btn"
        href="https://github.com/git-truck/git-truck/issues/new?template=user-issue.md"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open an issue
      </a>
    </div>
  )
}
