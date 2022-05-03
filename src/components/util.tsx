import { Close as CloseIcon } from "@styled-icons/material"
import styled, { css } from "styled-components"

const titleBaseStyles = css`
  font-weight: bold;
  margin-bottom: 0;
  margin-top: 0;
  color: var(--title-color);
  text-overflow: ellipsis;
  word-break: keep-all;
  white-space: nowrap;
  overflow-x: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

export const BoxTitle = styled.h2`
  ${titleBaseStyles}
  font-size: 1.5em;
`

export const BoxSubTitle = styled.h2`
  ${titleBaseStyles}
  font-size: 1em;
`

export const BoxSubTitleAndIconWrapper = styled.div`
  display: grid;
  grid-auto-flow: column;
  justify-content: left;
  align-items: center;
  gap: calc(var(--unit) * 0.5);
`

export const BoxSpan = styled.span`
  font-size: 0.9em;
  opacity: 0.7;
`

export const BoxP = styled.p`
  font-size: 0.9em;
  opacity: 0.7;
`

export const Button = styled.button`
  display: grid;
  grid-auto-flow: column;
  align-items: center;
  gap: var(--unit);

  padding: var(--unit) calc(2 * var(--unit));
  background-color: var(--button-bg);
  border: none;
  border-radius: calc(0.75 * var(--unit));

  color: var(--button-text-color);
  font-size: 0.8rem;
  text-decoration: none;
  font-weight: bold;

  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:enabled:hover {
    background-color: var(--button-hovered-bg);
    opacity: 100%;
  }
`

export const IconButton = styled.button`
  display: inline-grid;
  place-items: center;
  background: none;
  border: none;
  cursor: pointer;
  & > * {
    opacity: 0.5;
  }
  &:hover > * {
    opacity: 1;
  }
`

export const SearchResultButton = styled(Button)`
  display: grid;
  grid-auto-flow: column;
  justify-content: left;
  text-transform: none;

  background: none;
  padding: 1px;
  padding-left: var(--unit);
  width: 100%;
  text-align: left;
`

export const SearchResultSpan = styled.span`
  overflow: hidden;
  white-space: nowrap;
  display: block;
  text-overflow: ellipsis;
`

export const CloseButton = styled(IconButton)`
  color: #000;
  text-decoration: none;
  background-color: transparent;
  border: none;
  font-size: larger;
  position: absolute;
  top: calc(var(--unit));
  right: calc(var(--unit));
  cursor: pointer;
`
CloseButton.defaultProps = { children: <CloseIcon display="inline-block" height="1em" /> }

export const Box = styled.div`
  margin: var(--unit);
  color: var(--text-color);
  width: auto;
  background-color: #fff;
  border-radius: var(--unit);
  padding: calc(2 * var(--unit));
  position: relative;
  box-shadow: var(--shadow);
`

export const Stack = styled.div`
  display: flex;
  flex-direction: column;
`

export const Label = styled.label`
  padding-left: calc(var(--unit) + var(--border-width));
  font-weight: bold;
  font-size: 0.8em;
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
  height: 100%;
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

export const DetailsKey = styled.span<{ grow?: boolean }>`
  font-size: 0.9em;
  font-weight: 500;
  opacity: 0.7;
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

export const Actions = styled.div`
  display: flex;
`
