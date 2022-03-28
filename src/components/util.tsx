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
  grid-template-columns: var(--side-panel-width) 1fr var(--side-panel-width) ;
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

export const LegendLable = styled.p`
  padding: 0px;
  margin: 0px;
  font-weight: bold;
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

export const ClickableText = styled.button`
  background: none;
  border: none;
  font-family: inherit;
  font-weight: inherit;
  font-size: inherit;
  color: inherit;
  cursor: pointer;
  &:hover {
    color: darkgrey;
  }
`

export const NonClickableText = styled.span`
  cursor: default;
`

export const InlineCode = styled.code`
  display: inline-block;
  font-family: monospace;
`

export const Grower = styled.div`
  flex-grow: 1;
`
