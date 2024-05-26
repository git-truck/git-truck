import { mdiForum } from "@mdi/js"
import Icon from "@mdi/react"
import { memo } from "react"
import GitHubButton from "react-github-btn"
import { Code } from "./util"

export const FeedbackCard = memo(function FeedbackCard() {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="card__title">Try Git Truck version 2.0!</h3>
        <Icon path={mdiForum} size={1} />
      </div>
      <div className="dark:hue-rotate-180 dark:filter">
        <h2>The newest version is now in testing, with many new features. To get started, run:</h2>
        <Code>npx git-truck@duck</Code>
        <h2>We would love to hear your thoughts about the new features</h2>
        <a href="https://forms.gle/HdQQudQdThCXKaYN7">
          <GitHubButton data-icon="octicon-issue-opened" href="">
            Brief survey about v2.0
          </GitHubButton>
        </a>
        {/* <div className="flex items-center justify-between dark:contrast-75 dark:invert dark:sepia dark:filter">
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
        </div> */}
      </div>
    </div>
  )
})
