import styled, { css } from "styled-components"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

const titleBaseStyles = css`
  font-weight: bold;
  margin-bottom: 0;
  margin-top: 0;
  color: var(--title-color);
  text-overflow: ellipsis;
  word-break: keep-all;
  white-space: nowrap;
  overflow-x: hidden;
`

export const BoxTitle = styled.h2`
  ${titleBaseStyles}
  font-size: 1.5em;
`

export const BoxSubTitle = styled.h2`
  ${titleBaseStyles}
  font-size: 1em;
`

export const StyledP = styled.p`
  font-size: 0.9em;
  opacity: 0.7;
  margin: 0.5em 0 0.5em 0;
`

export const LightFontAwesomeIcon = styled(FontAwesomeIcon)`
  opacity: 0.5;
`

export const TextButton = styled.button`
  background: var(--button-bg);
  width: fit-content;
  border: none;
  border-radius: calc(2 * var(--unit));
  padding: var(--unit) calc(2 * var(--unit));
  /* color: #fff; */
  cursor: pointer;
  transition: backround-color var(--hover-transition-duration);
  &:hover {
    background-color: var(--button-hovered-bg);
  }
`

export const SearchResultButton = styled(TextButton)`
  border-radius: 3px;
  padding: 1px;
  padding-left: 5px;
  width: 100%;
  text-align: left;
  background: none;
`

export const SearchResultSpan = styled.span`
  overflow: hidden;
  white-space: nowrap;
  display: block;
  text-overflow: ellipsis;
`

export const NavigateBackButton = styled.button`
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

export const Container = styled.div`
  height: 100%;
  display: grid;
  grid-template-columns: var(--side-panel-width) 1fr var(--side-panel-width);
  grid-template-rows: 1fr;
`

export const Box = styled.div`
  /* border: 1px var(--border-color-alpha) solid; */
  margin: var(--unit);
  color: var(--text-color);
  width: auto;
  background-color: #fff;
  border-radius: var(--unit);
  padding: calc(2 * var(--unit));
  position: relative;
  /* Generated with: https://shadows.brumm.af/ */
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

export const SelectWithEllipsis = styled.select`
  text-overflow: ellipsis;
  overflow: scroll;
  width: 100%;

  font-size: 0.9em;
  padding: 0.2em 0;

  background: none;
  border-radius: 4px;

  transition: border-color 0.1s;
  border: 2px solid hsla(0, 0%, 50%, 0);

  &:not([disabled]):hover,
  &:not([disabled]):active {
    border: 2px solid hsla(0, 0%, 50%, 1);
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
