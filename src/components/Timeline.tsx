import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "remix";
import semverCompare from "semver-compare";
import styled from "styled-components"
import { useData } from "~/contexts/DataContext";
import { Box, BoxSubTitle } from "./util"

export function TimeLine() {

  const location = useLocation()
  const branchTagOrCommit = location.pathname.split("/").splice(2).join("/")

  const navigate = useNavigate()
  const data = useData()

  const selectedRef = useRef<HTMLInputElement | null>(null)

  const scrollToMiddle = () => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  
  useEffect(() => {
    scrollToMiddle()
    setChecked()
  }, [branchTagOrCommit])

  const setChecked = () => {
    if (selectedRef.current)
      selectedRef.current.checked = true
  }

  const tags = Object.entries(data.repo.refs.Tags).sort(([a], [b]) => semverCompare(a,b)).reverse()
  const items = tags

  const radioHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectedRef.current = event.target
    setChecked()
    const value = event.target.value
    navigate(["", data.repo.name, value].join("/"))
  };

  return (
    <StyledBox
      onMouseLeave={() => scrollToMiddle()}
    >
      <BoxSubTitle>Timeline ({branchTagOrCommit})</BoxSubTitle>
      <TimeLineContainer
        defaultValue={branchTagOrCommit}
      >
        <Line></Line>
        <TimeLineEntries>
          {
            (items.length === 0)
            ? <TimeLineEntry>
                <RadioText>No git tags found</RadioText>
                <CustomRadio></CustomRadio>
              </TimeLineEntry>
            : items.map(([value, hash]) => {
                const conditionalRadioProps = (value === branchTagOrCommit) ? { ref: selectedRef, checked: true } : { checked: false };
                return (
                  <TimeLineEntry
                    htmlFor={hash}
                    key={hash}
                  >
                    <RadioText>{value}</RadioText>
                    <Radio
                      name="hashes"
                      type="radio"
                      id={hash}
                      value={value}
                      onChange={radioHandler}
                      {...conditionalRadioProps}
                    />
                    <CustomRadio></CustomRadio>
                  </TimeLineEntry>
                )
              }
            )
          }
        </TimeLineEntries>
      </TimeLineContainer>
    </StyledBox>
  )
}

const Line = styled.div`
  grid-area: 1/-1;
  background-color: hsl(0, 0%, 90%);
  width: 2px;
  height: 100%;
  margin-left: calc(var(--unit) + 5px);
  border-radius: 10000px;
`

const RadioText = styled.label`
  font-size: 0.9em;
  width: 100%;
  pointer-events: none;
`

const CustomRadio = styled.label`
  grid-area: 1/1;
  height: 12px;
  width: 12px;
  background-color: hsl(0, 0%, 85%);
  border: 2px solid white;
  border-radius: 50%;
  pointer-events: none;
`

const Radio = styled.input`
  grid-area: 1/1;
  width: 0;
  opacity: 0;

  &:checked ~ ${CustomRadio} {
    background-color: hsl(206, 89%, 54%);
  }

  &:focus ~ ${CustomRadio} {
    outline: 2px solid hsl(206, 89%, 54%);
  }
`

const TimeLineEntry = styled.label`
  padding-left: var(--unit);
  background-color: white;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: calc(var(--unit)*2);
  cursor: pointer;
  place-items: center;

  &:hover input ~ ${CustomRadio} {
    background-color: hsl(206, 89%, 70%);
  }
`

const TimeLineEntries = styled.div`
  position: relative;
  border: none;
  grid-area: 1/-1;
  display: grid;
  gap: 5px;

  max-height: 65px;

  overflow: auto;
  scroll-snap-type: y mandatory;
  scroll-padding-block: 10px;

  & > * {
    scroll-snap-align: center;
  }
`

const TimeLineContainer = styled.fieldset`
  border: none;
  display: grid;
  margin-top: var(--unit);
`

const StyledBox = styled(Box)`
  &:hover ${TimeLineEntries} {
    max-height: 400px;
  }
`