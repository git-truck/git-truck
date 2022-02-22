import { render, screen } from "@testing-library/react"
import { Metric } from "../metrics"
import { EnumSelect } from "./EnumSelect"

describe("EnumSelect", () => {
  it("Renders x options", () => {
    const metrics = Object.values(Metric)

    render(
      <EnumSelect
        label="Color metric"
        enum={Metric}
        onChange={(t: keyof typeof Metric) => {}}
      />
    )
    for (const metric of metrics) {
      const optionElement = screen.getByText(metric)
      expect(optionElement).toBeInTheDocument()
    }
  })
})
