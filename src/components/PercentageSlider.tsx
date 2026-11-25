import { useState } from "react"
import { Slider } from "radix-ui"
import { useOptions } from "~/contexts/OptionsContext"
import { SliderTrack, SliderThumb, LabeledTicks } from "~/components/sliderUtils"
import { cn } from "~/styling"

export function PercentageSlider({ className = "" }: { className?: string }) {
  const { topContributorCutoff, setTopContributorCutoff } = useOptions()
  const [displayPercentage, setDisplayPercentage] = useState(topContributorCutoff)

  return (
    <div className={cn("grid grid-cols-[calc(11*var(--spacing))_1fr] px-3", className)}>
      <p title="Min percentage of changes a file's top contributor must account for to be colored.">
        {displayPercentage}%
      </p>

      <div title="Adjust the top contributor percentage cutoff">
        <Slider.Root
          className="relative flex h-5 touch-none items-center select-none"
          min={0}
          max={100}
          step={1}
          value={[displayPercentage]}
          onValueChange={([value]) => setDisplayPercentage(value)}
          onValueCommit={([value]) => {
            setTopContributorCutoff(value)
          }}
        >
          <SliderTrack />
          <SliderThumb aria-label="Top contributor percentage cutoff" />
        </Slider.Root>
        <LabeledTicks
          valueMap={{
            0: "Top churner",
            50: "Majority churner",
            100: "Single churner"
          }}
        />
      </div>
    </div>
  )
}
