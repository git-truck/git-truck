import { Spacer } from "./Spacer"

interface LegendProps {
  entries: string[]
}

export function Legend(props: LegendProps) {
  if (props.entries.length === 0) return null
  return (
    <div className="legend box">
      {props.entries.map((entry, i) => {
        let [extension, color] = entry.split("|")
        return (
          <>
            <div
              style={{
                fontSize: "medium",
                position: "relative",
                display: "flex",
                flexDirection: "row",
                placeItems: "center",
                lineHeight: "100%",
                margin: 0,
              }}
            >
              <div
                style={{
                  height: "100%",
                  aspectRatio: "1",
                  backgroundColor: color,
                  width: "1em",
                  borderRadius: "50%",
                }}
              ></div>
              <Spacer horizontal />
              <p
                style={{
                  padding: 0,
                  margin: 0,
                  fontWeight: "bold",
                }}
              >
                .{extension}
              </p>
            </div>
            {i < props.entries.length - 1 ? <Spacer /> : null}
          </>
        )
      })}
    </div>
  )
}
