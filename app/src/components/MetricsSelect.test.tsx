import { render, screen } from "@testing-library/react"
import React from "react"
import { Metric } from "../metrics"
import { MetricSelect } from "./MetricSelect"

describe("MetricsSelect", () => {
  it("Renders x options", () => {
    const metrics = Object.values(Metric)

    render(<MetricSelect onChange={() => {}} />)
    for (const metric of metrics) {
      const optionElement = screen.getByText(metric)
      expect(optionElement).toBeInTheDocument()
    }
  })
})
