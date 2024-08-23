import type { SliderItem, GetHandleProps, GetTrackProps } from "react-compound-slider"

interface IHandleProps {
  domain: number[]
  handle: SliderItem
  getHandleProps: GetHandleProps
  disabled?: boolean
}
// TODO: allow setting specific date by clicking the date
export function Handle(props: IHandleProps) {
  return (
    <div
      role="slider"
      aria-valuemin={props.domain[0]}
      aria-valuemax={props.domain[1]}
      aria-valuenow={props.handle.value}
      style={{
        left: `${props.handle.percent}%`,
        position: "absolute",
        marginLeft: "-11px",
        marginTop: "-6px",
        zIndex: 2,
        width: 24,
        height: 24,
        cursor: "pointer",
        borderRadius: "50%",
        boxShadow: "1px 1px 1px 1px rgba(0, 0, 0, 0.2)",
        backgroundColor: `${props.disabled ? "grey" : "#34568f"}`
      }}
      {...props.getHandleProps(props.handle.id)}
    />
  )
}

interface ITrackProps {
  source: SliderItem
  target: SliderItem
  getTrackProps: GetTrackProps
  disabled?: boolean
  backgroundColor: string
}

export function Track(props: ITrackProps) {
  return (
    <div
      style={{
        position: "absolute",
        height: 14,
        zIndex: 1,
        backgroundColor: `${props.disabled ? "grey" : props.backgroundColor}`,
        borderRadius: 7,
        cursor: "pointer",
        left: `${props.source.percent}%`,
        width: `${props.target.percent - props.source.percent}%`
      }}
      {...props.getTrackProps()}
    />
  )
}
