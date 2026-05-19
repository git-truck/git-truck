import parkedTruck from "~/assets/parkedTruck_48x.png"
import crashedTruck from "~/assets/crashedTruck_48x.gif"
import { cn } from "~/styling"

export function ErrorPage({
  className,
  message,
  truck = "crashed",
  children
}: {
  className?: string
  message: string
  truck?: "parked" | "crashed"
  children?: React.ReactNode
}) {
  return (
    <div className={cn("app-container", className)}>
      <div />
      <div className="flex max-w-2xl flex-col items-center gap-4 text-center">
        <img
          src={truck === "crashed" ? crashedTruck : parkedTruck}
          alt="Git Truck"
          className="pixelated w-full min-w-0"
        />
        <div className="text-4xl leading-tight font-extrabold">{message}</div>
        <div className="flex flex-col gap-8">{children}</div>
      </div>
    </div>
  )
}
