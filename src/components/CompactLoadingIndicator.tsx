import drivingTruckGif from "~/assets/drivingTruck_32x.gif"
import { cn } from "~/styling"

export function CompactLoadingIndicator({ className }: { className?: string }) {
  return <img src={drivingTruckGif} alt="Loading..." className={cn("pixelated h-full aspect-square", className)} />
}
