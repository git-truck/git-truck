import anitruck from "~/assets/truck.gif"

export function AnalyzingIndicator() {
  return (
    <div
      className="grid h-screen w-screen place-items-center"
      style={{
        backgroundColor: "var(--global-bg-color)",
      }}
    >
      <div className="flex animate-hide-initially flex-col px-2 py-2 opacity-0">
        <p className="text-center text-3xl font-bold uppercase tracking-[0.5em] opacity-70">Analyzing</p>
        <img src={anitruck} alt={"🚛"} className="w-full min-w-0 max-w-sm" />
      </div>
    </div>
  )
}
