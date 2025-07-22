/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { useState, useTransition, type HTMLAttributes, type ReactNode } from "react"
import Icon from "@mdi/react"
import { mdiCheckboxOutline, mdiCheckboxBlankOutline, mdiMenuUp, mdiClose } from "@mdi/js"
import clsx from "clsx"
import anitruck from "~/assets/truck.gif"
import { Popover } from "./Popover"
import { HexColorPicker } from "react-colorful"
import { useData } from "~/contexts/DataContext"
import { useSubmit } from "react-router"
import { getPathFromRepoAndHead } from "~/shared/util"
import { cn } from "~/styling"

export const CloseButton = ({
  className = "",
  absolute = true,
  ...props
}: HTMLAttributes<HTMLButtonElement> & { absolute?: boolean }) => (
  <button
    className={clsx(
      className,
      "icon-btn inline-grid bg-transparent text-lg leading-none hover:opacity-80", // Explicitly set background to transparent
      {
        "absolute top-2 right-2 z-10": absolute
      }
    )}
    title="Close"
    {...props}
  >
    <Icon path={mdiClose} size={1} />
  </button>
)

export const LegendDot = ({
  className = "",
  style = {},
  dotColor,
  authorColorToChange = undefined
}: { dotColor: string; authorColorToChange?: string } & HTMLAttributes<HTMLDivElement>) => {
  const [color, setColor] = useState(dotColor)
  const { databaseInfo, repo } = useData()
  const submit = useSubmit()

  if (!authorColorToChange)
    return (
      <div
        className={cn("aspect-square h-4 w-4 rounded-full shadow-xs shadow-black", className)}
        style={{ ...style, backgroundColor: dotColor }}
      />
    )

  function updateColor(author: string, color: string) {
    const form = new FormData()
    form.append("authorname", author)
    form.append("authorcolor", color)
    submit(form, {
      action: `/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`,
      method: "post"
    })
  }

  return (
    <Popover
      popoverTitle="Choose color"
      positions={["left", "bottom", "top", "right"]}
      trigger={({ onClick }) => (
        <div
          className={`aspect-square h-4 w-4 rounded-full shadow-xs shadow-black ${className} cursor-pointer`}
          style={{ ...style, backgroundColor: dotColor }}
          onClick={onClick}
        />
      )}
    >
      <HexColorPicker color={color} onChange={setColor} />
      <button className="btn" onClick={() => updateColor(authorColorToChange, color)}>
        Set color
      </button>
      {databaseInfo.authorColors[authorColorToChange] ? (
        <button className="btn" onClick={() => updateColor(authorColorToChange, "")}>
          Use default color
        </button>
      ) : null}
    </Popover>
  )
}

export const Code = ({
  inline = false,
  className = "",
  ...props
}: { inline?: boolean } & HTMLAttributes<HTMLDivElement>) => (
  <code
    className={cn(
      "primary rounded border px-2 py-1 font-mono text-sm",
      inline ? "inline-block" : "block",
      {
        "select-all": inline
      },
      className
    )}
    {...props}
  />
)

export function CheckboxWithLabel({
  children,
  checked,
  onChange,
  className = "",
  checkedIcon = mdiCheckboxOutline,
  uncheckedIcon = mdiCheckboxBlankOutline,
  ...props
}: {
  children: React.ReactNode
  checked: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  checkedIcon?: string
  uncheckedIcon?: string
} & Omit<React.HTMLAttributes<HTMLLabelElement>, "onChange" | "checked">) {
  const [isTransitioning, startTransition] = useTransition()

  return (
    <label className={`label flex w-full items-center justify-start gap-2 ${className}`} {...props}>
      <span className="flex grow items-center gap-2">
        {children}
        {isTransitioning ? <img src={anitruck} alt="..." className="h-5" /> : ""}
      </span>
      <Icon className="place-self-end" path={checked ? checkedIcon : uncheckedIcon} size={1} />
      <input
        type="checkbox"
        defaultChecked={checked}
        onChange={(e) => startTransition(() => onChange(e))}
        className="hidden"
      />
    </label>
  )
}

export const LegendBarIndicator = ({ visible, offset }: { visible: boolean; offset: number }) => {
  return (
    <div
      className={clsx("absolute bottom-0 w-min -translate-x-1/2 translate-y-1/2 transition-all", {
        "opacity-0": !visible
      })}
      style={{
        left: `${offset <= 100 ? offset : -20}%`
      }}
    >
      <Icon path={mdiMenuUp} size={2} className="stroke-white" />
    </div>
  )
}

export function Tab({ title, active, onClick }: { title: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={clsx("btn btn--outlined roundend-lg mx-[-0.5px] flex-1", {
        "border-t-transparent border-r-transparent border-l-transparent": !active,
        "rounded-b-[2px]": !active,
        "rounded-b-none": active,
        "border-b-transparent": active
      })}
      onClick={onClick}
    >
      {title}
    </button>
  )
}

export function Tabs({ tabs }: { tabs: { title: string; content: ReactNode }[] }) {
  const [currentTab, setCurrentTab] = useState(tabs[0].title)

  return (
    <div>
      <div className="flex">
        {tabs.map((tab) => (
          <Tab
            key={tab.title}
            title={tab.title}
            active={currentTab === tab.title}
            onClick={() => setCurrentTab(tab.title)}
          />
        ))}
      </div>
      <div className="mt-2">{tabs.find((tab) => tab.title === currentTab)?.content}</div>
    </div>
  )
}
