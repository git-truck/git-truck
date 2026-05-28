import drivingTruckGif from "~/assets/drivingTruck_32x.gif"
import { useIsLoading } from "~/hooks"
import { cn } from "~/styling"

export function CompactLoadingIndicator() {
  const isLoading = useIsLoading()

  return (
    <div
      className={cn(
        "flex gap-2",

        "transition-opacity",
        {
          "opacity-0": !isLoading
        }
      )}
    >
      <span className="font-bold">Loading...</span>
      <div className="relative flex w-24 items-center">
        <img src={drivingTruckGif} alt="Loading..." className={cn("pixelated absolute size-24 translate-y-0.75")} />
      </div>
    </div>
  )
}
