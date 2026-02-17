import truck from "~/assets/truck.png"
import { cn } from "~/styling"

export function ErrorPage({
  className,
  message,
  noTruck = false,
  children
}: {
  className?: string
  message: string
  noTruck?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className={cn("app-container", className)}>
      <div />
      <div className="grid h-full w-full place-items-center px-4 py-10">
        <div className="flex max-w-2xl flex-col items-center gap-3 text-center">
          {!noTruck ? <img src={truck} alt="Git Truck" className="w-full max-w-sm min-w-0" /> : null}
          <div className="text-4xl leading-tight font-extrabold">{message}</div>
          {children}
        </div>
      </div>
    </div>
  )
}
