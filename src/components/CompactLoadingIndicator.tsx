import drivingTruckGif from "~/assets/drivingTruck_32x.gif"
import { cn } from "~/styling"

export function CompactLoadingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img src={drivingTruckGif} alt="Loading..." className={cn("pixelated aspect-square h-full", className)} />
      Loading...
    </div>
  )
}
