export function SidePanel(props: { children: React.ReactNode }) {
  return <aside className="flex overflow-y-auto p-2 gap-2">{props.children}</aside>
}
