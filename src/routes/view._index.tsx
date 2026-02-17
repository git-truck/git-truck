export default function ViewIndex() {
  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1">
        <p className="flex items-center gap-1">
          <Key title="Left click">Click</Key> to inspect
        </p>
        <p className="flex items-center gap-1">
          <Key title="Double click">Double click</Key> or <Key title="Scroll">Scroll</Key> to zoom
        </p>
      </div>
    </div>
  )
}

function Key({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <kbd
      className="bg-primary-bg dark:bg-primary-bg-dark h-button flex w-max min-w-max items-center rounded-sm border px-2"
      title={title}
    >
      {children}
    </kbd>
  )
}
