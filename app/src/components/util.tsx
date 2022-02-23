import styled from "styled-components"

export const BoxTitle = styled.h2`
  font-size: 1.5em;
  font-weight: bold;
  margin-bottom: 0;
  margin-top: 0;
  color: var(--title-color);
`

export const Main = styled.main`
  /* width: calc(100vw - var(--side-panel-width)); */
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
