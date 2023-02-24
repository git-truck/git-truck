import anitruck from "~/assets/truck.gif"

export function AnalyzingIndicator() {
  return (
    <div className="grid place-items-center h-screen w-screen" style={{
      backgroundColor: 'var(--global-bg-color)'
    }}>
      <div className="px-8 py-2 flex flex-col opacity-0 animate-hide-initially">
        <img src={anitruck} alt={"🚛"} width={400} />
        <p className="text-center">Analyzing...</p>
      </div>
    </div>
  )
}
