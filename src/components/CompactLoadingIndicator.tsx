import drivingTruckGif from "~/assets/drivingTruck_32x.gif"
import { cn } from "~/styling"

export function CompactLoadingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-2", className)}>
      <span className="font-bold">Loading...</span>
      <div className="relative flex w-24 items-center">
        <img src={drivingTruckGif} alt="Loading..." className={cn("pixelated absolute size-24 translate-y-0.75")} />
      </div>
    </div>
  )
}
