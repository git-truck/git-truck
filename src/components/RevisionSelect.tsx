import { useId, type SelectHTMLAttributes } from "react"
import type { CompletedResult, GitRefs } from "~/shared/model"
import { mdiSourceBranch } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { cn } from "~/styling"

type GroupedBranchSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  headGroups: GitRefs
  analyzedBranches: CompletedResult[]
  iconGroupColorMap?: Record<string, string>
}

export function RevisionSelect({
  headGroups,
  disabled,
  className = "",
  analyzedBranches,
  ...props
}: GroupedBranchSelectProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  const groupsEntries = Object.entries(headGroups)

  return (
    <div
      title="Change branch"
      className={cn(
        "hover:border-border dark:hover:border-border-dark hover:bg-primary-bg dark:hover:bg-primary-bg-dark flex w-min place-items-center gap-0 rounded-md border-2 border-transparent p-1 transition-colors not-hover:border-transparent not-hover:bg-transparent",
        className
      )}
    >
      <label htmlFor={id}>
        <Icon path={mdiSourceBranch} size={0.75} />
      </label>
      <select className={cn("w-full")} {...props} id={id}>
        {groupsEntries.map(([group, heads]) =>
          Object.entries(heads).length > 0 ? (
            <optgroup key={group} label={group} className="bg-transparent">
              {Object.entries(heads).map(([headName]) => {
                const isAnalyzed = analyzedBranches.find((rep) => rep.branch === headName)
                return (
                  <option
                    key={headName}
                    className="bg-transparent"
                    value={headName}
                    disabled={disabled}
                    title={isAnalyzed ? "Analyzed" : "Not analyzed"}
                  >
                    {headName}
                  </option>
                )
              })}
            </optgroup>
          ) : null
        )}
      </select>
    </div>
  )
}
