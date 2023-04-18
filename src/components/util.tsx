import { Close as CloseIcon } from "@styled-icons/material"
import styled from "styled-components"
import type { HTMLAttributes } from "react"
import { useId } from "react"

export const SearchResultSpan = styled.span`
  overflow: hidden;
  white-space: nowrap;
  display: block;
  text-overflow: ellipsis;
`

export const CloseButton = ({ className = "", ...props }: HTMLAttributes<HTMLButtonElement>) => (
  <button
    className={`absolute top-2 right-2 inline-grid text-lg leading-none text-gray-900 hover:text-gray-500 ${className}`}
    title="Close"
    {...props}
  >
    <CloseIcon display="inline-block" height="1em" />
  </button>
)

export const Label = styled.label`
  padding-left: calc(var(--unit) + var(--border-width));
  font-weight: bold;
  cursor: pointer;
`

export const Select = styled.select`
  width: 100%;
  display: block;
  padding: var(--unit);
  border: 1px var(--border-color) solid;
  border-radius: calc(0.5 * var(--unit));
`

export const SearchField = styled.input`
  border: 1px var(--border-color) solid;
  flex-grow: 1;
  border-radius: calc(0.5 * var(--unit));
  padding: var(--unit);
`

export const LegendEntry = styled.div`
  font-size: small;
  position: relative;
  display: flex;
  flex-direction: row;
  place-items: center;
  line-height: 100%;
  margin: 0px;
`

export const LegendDot = styled.div<{ dotColor: string }>`
  height: 1em;
  aspect-ratio: 1;
  width: 1em;
  border-radius: 50%;
  background-color: ${({ dotColor }) => dotColor};
  box-shadow: var(--small-shadow);
`

export const LegendLabel = styled.p`
  padding: 0px;
  margin: 0px;
  font-weight: bold;
  cursor: default;
  overflow: hidden;
  white-space: pre;
  text-overflow: ellipsis;
`

export const LegendGradient = styled.div<{ min: string; max: string }>`
  background-image: linear-gradient(to right, ${(props) => `${props.min},${props.max}`});
  width: 100%;
  height: 20px;
  border-radius: calc(var(--unit) * 0.5);
`

export const GradientLegendDiv = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`

export const DetailsKey = styled.div<{ grow?: boolean }>`
  display: flex;
  align-items: center;
  font-size: 0.9em;
  font-weight: 500;
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const DetailsValue = styled.p`
  overflow-wrap: anywhere;
  word-wrap: break-word;
  overflow: hidden;
  font-size: 0.9em;
`

export const Code = styled.code<{ inline?: boolean }>`
  display: ${(props) => (props.inline ? "inline-block" : "block")};
  font-family: monospace;
  font-size: 1.2em;
  white-space: pre;
`

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
      <Label htmlFor={id}>{children}</Label>
    </div>
  )
}
