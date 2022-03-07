import styled from "styled-components"

export const BoxTitle = styled.h2`
  font-size: 1.5em;
  font-weight: bold;
  margin-bottom: 0;
  margin-top: 0;
  color: var(--title-color);
  overflow: hidden;
  text-overflow: ellipsis;
`

export const BoxSubTitle = styled.h3`
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
  min-width: calc(16 * var(--unit));
  background-color: #fff;
  border-radius: var(--unit);
  padding: calc(2 * var(--unit));
  position: relative;
  /* Generated with: https://shadows.brumm.af/ */
  box-shadow: 0.9px 0.9px 2.7px rgba(0, 0, 0, 0.07),
    2.2px 2.2px 6.9px rgba(0, 0, 0, 0.048),
    4.4px 4.4px 14.2px rgba(0, 0, 0, 0.039),
    9.1px 9.1px 29.2px rgba(0, 0, 0, 0.031), 25px 25px 80px rgba(0, 0, 0, 0.022);
`

export const Stack = styled.div`
  display: flex;
  flex-direction: column;
`

export const Label = styled.label`
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
  border: 0;
  flex-grow: 1;
  border-radius: 3px;
  padding: var(--unit);
`

export const LegendBox = styled(Box)`
  position: absolute;
  width: calc(var(--side-panel-width) - calc(6 * var(--unit)));
  bottom: 0px;
  left: 0px;
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
`

export const LegendLable = styled.p`
  padding: 0px;
  margin: 0px;
  font-weight: bold;
`

export const LegendButton = styled.button<{ collapse: boolean }>`
  position: absolute;
  top: var(--unit);
  right: var(--unit);
  border: none;
  background-color: rgba(0, 0, 0, 0);
  scale: 200%;
  transition-duration: 0.4s;
  color: grey;
  transform-origin: 50% 55%;
  transform: ${(props) => (props.collapse ? "rotate(180deg)" : "none")};
  &:hover {
    scale: 180%;
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
