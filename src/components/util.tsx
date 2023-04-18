import { Close as CloseIcon } from "@styled-icons/material"
import styled from "styled-components"
import type { HTMLAttributes } from "react"
import { useId } from "react"

export const CloseButton = ({ className = "", ...props }: HTMLAttributes<HTMLButtonElement>) => (
  <button
    className={`absolute right-2 top-2 inline-grid text-lg leading-none text-gray-900 hover:text-gray-500 ${className}`}
    title="Close"
    {...props}
  >
    <CloseIcon display="inline-block" height="1em" />
  </button>
)

export const LegendDot = ({
  className = "",
  style = {},
  dotColor,
}: { dotColor: string } & HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`aspect-square h-4 w-4 rounded-full shadow-sm shadow-black ${className}`}
    style={{ ...style, backgroundColor: dotColor }}
  />
)

export const Code = ({ inline = false, ...props }: { inline?: boolean } & HTMLAttributes<HTMLDivElement>) => (
  <code
    className={`rounded-md bg-gray-100 p-1 font-mono text-sm text-gray-900 ${
      inline ? "inline-block" : "block"
    } whitespace-pre-wrap`}
    {...props}
  />
)

export const Grower = styled.div`
  flex-grow: 1;
`

export const SelectWithEllipsis = styled.select<{ inline?: boolean }>`
  text-overflow: ellipsis;
  overflow: scroll;
  width: 100%;

  font-size: 0.9em;
  color: inherit;
  padding: ${(props) => (props.inline ? "0.2em" : "var(--unit) calc(0.5 * var(--unit))")};

  background: none;
  border-radius: 4px;

  transition: border-color 0.1s;
  border: 1px solid hsla(0, 0%, 50%, 0.3);

  &:enabled {
    cursor: pointer;
  }

  &:disabled {
    cursor: not-allowed;
  }

  &:enabled:hover,
  &:enabled:active {
    border: 1px solid hsla(0, 0%, 50%, 1);
  }
`

export const OptionWithEllipsis = styled.option`
  text-overflow: ellipsis;
  overflow: scroll;
`

export const SelectWithIconWrapper = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5em;
  place-items: center left;
`

export const SelectPlaceholder = styled.div`
  font-size: 0.9em;
  padding: 0.2em 0;
  border: 1px solid transparent;
`

export function CheckboxWithLabel({
  children,
  checked,
  onChange,
  ...props
}: {
  children: React.ReactNode
  checked: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
} & Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "checked">) {
  const id = useId()
  return (
    <div {...props}>
      <input type="checkbox" checked={checked} onChange={onChange} id={id} />
      <label className="label" htmlFor={id}>
        {children}
      </label>
    </div>
  )
}
