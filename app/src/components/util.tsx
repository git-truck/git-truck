import styled from "styled-components"

export const BoxTitle = styled.h2`
  font-size: 1.5em;
  font-weight: bold;
  margin-bottom: 0;
  margin-top: 0;
  color: var(--title-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const BoxSubTitle = styled.h2`
  font-size: 1em;
  font-weight: bold;
  margin-bottom: 0;
  margin-top: 0;
  color: var(--title-color);
`

export const CloseButton = styled.button`
  background: none;
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
  grid-template-columns: var(--side-panel-width) 1fr;
  grid-template-rows: 1fr;
`

export const Box = styled.div`
  /* border: 1px var(--border-color-alpha) solid; */
  margin: var(--unit);
  color: var(--text-color);
  width: calc(var(--side-panel-width) - 6 * var(--unit));
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

export const LegendLable = styled.p`
  padding: 0px;
  margin: 0px;
  font-weight: bold;
`

export const ToggleButton = styled.button<{
  collapse: boolean
  relative: boolean
}>`
  position: ${(props) => (props.relative ? "relative" : "absolute")};
  top: ${(props) => (props.relative ? "unset" : "var(--unit)")};
  right: ${(props) => (props.relative ? "unset" : "var(--unit)")};
  border: none;
  background-color: rgba(0, 0, 0, 0);
  transition-duration: 0.4s;
  color: grey;
  transform-origin: 50% 55%;
  transform: ${(props) => (props.collapse ? "rotate(180deg)" : "none")};
  font-size: large;
  &:hover {
    color: #606060;
    cursor: pointer;
  }
`

export const LegendGradient = styled.div<{ min: string; max: string }>`
  background-image: linear-gradient(
    to right,
    ${(props) => `${props.min},${props.max}`}
  );
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
  white-space: pre;
  font-size: 0.9em;
  font-weight: 500;
  opacity: 0.7;
`

export const DetailsValue = styled.p`
  overflow-wrap: anywhere;
  font-size: 0.9em;
  text-align: right;
`

export const NavigationText = styled.text`
  &:hover {
    cursor: pointer;
    color: darkgrey;
  }
`

export const NonNavigationText = styled.text`
  &:hover {
    cursor: default;
  }
`
