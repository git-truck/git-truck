import { mdiDice5 } from "@mdi/js"
import type { ReactNode } from "react"
import { useNavigation } from "react-router"
import { ShuffleColorsForm } from "~/components/forms/ShuffleColorsForm"
import { Icon } from "~/components/Icon"
import { useOptions } from "~/contexts/OptionsContext"
import { cn } from "~/styling"

export function ContributorTableHeader({ children }: { children: ReactNode }) {
  const navigationState = useNavigation().state
  const { metricType } = useOptions()
  const isAuthorRelatedLegend = metricType === "TOP_CONTRIBUTOR" || metricType === "CONTRIBUTORS"
  return (
    <>
      <span className="bg-border-secondary dark:bg-border-secondary-dark col-span-full h-0.5 w-full" />
      <div className="text-primary-text dark:text-primary-text-dark contents text-sm font-bold">
        <ShuffleColorsForm>
          <button
            disabled={!isAuthorRelatedLegend}
            className={cn("btn--icon m-0 mt-1 h-min text-xs", {
              "opacity-0": !isAuthorRelatedLegend
            })}
            title="Shuffle contributor colors"
          >
            <Icon
              className={cn("transition-transform duration-100 hover:rotate-20", {
                "animate-spin transition-all starting:rotate-0": navigationState !== "idle"
              })}
              path={mdiDice5}
              size="1.5em"
            />
          </button>
        </ShuffleColorsForm>
        {children}
      </div>
      <span className="bg-border-secondary dark:bg-border-secondary-dark col-span-full mb-1 h-0.5 w-full" />
    </>
  )
}
