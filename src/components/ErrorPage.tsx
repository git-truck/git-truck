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
      <div className="grid h-full w-full place-items-center px-4 py-10">
        <div className="flex max-w-2xl flex-col items-center gap-3 text-center">
          <div className="text-4xl leading-tight font-extrabold">{message}</div>
          {children}
          {truck === "crashed" ? (
            <img
              src={truck === "crashed" ? crashedTruck : parkedTruck}
              alt="Git Truck"
              className="pixelated w-full min-w-0"
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
