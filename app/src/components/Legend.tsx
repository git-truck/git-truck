interface LegendProps {
  entries: string[]
}

export function Legend(props: LegendProps) {
  if (props.entries.length == 0) return <></>
  return (
    <div className="legendbox">
      {props.entries.map((entry) => {
        let [extension, color] = entry.split("|")
        return (
          <div style={{ position: "relative", margin: "1em" }}>
            <div
              style={{
                position: "absolute",
                height: "100%",
                aspectRatio: "1",
                backgroundColor: color,
                borderRadius: "50%",
              }}
            ></div>
            <p
              style={{
                marginLeft: "2em",
                fontSize: "medium",
              }}
            >
              {extension}
            </p>
          </div>
        )
      })}
    </div>
  )
}
