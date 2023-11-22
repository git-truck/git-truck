import { mdiForum } from "@mdi/js"
import { Icon } from "@mdi/react"
import { memo } from "react"
import GitHubButton from "react-github-btn"

export const FeedbackCard = memo(function FeedbackCard() {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="card__title">Support Git Truck</h3>
        <Icon path={mdiForum} size={1} />
      </div>
      <div className="flex items-center justify-between dark:contrast-75 dark:invert dark:sepia dark:filter">
        <GitHubButton
          href="https://github.com/git-truck/git-truck"
          data-icon="octicon-star"
          data-size="large"
          data-show-count="true"
        >
          Star Git Truck
        </GitHubButton>
        <GitHubButton
          href="https://github.com/git-truck/git-truck/issues/new?template=user-issue.md"
          data-icon="octicon-issue-opened"
          data-size="large"
          data-show-count="true"
        >
          Open an issue
        </GitHubButton>
      </div>
    </div>
  )
})
