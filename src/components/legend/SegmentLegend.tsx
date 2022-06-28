import styled from "styled-components"
import { HydratedGitBlobObject } from "~/analyzer/model"
import { estimatedLetterWidth } from "~/const"
import { useClickedObject } from "~/contexts/ClickedContext"
import { MetricLegendProps } from "./Legend"


export type SegmentLegendData = [
    steps: number,
    textGenerator: (n: number) => string,
    colorGenerator: (n: number) => string,
    offsetStepCalc: (blob: HydratedGitBlobObject) => number
]

export function SegmentLegend({ metricCache}: MetricLegendProps) {
    const [steps, textGenerator, colorGenerator, offsetStepCalc] = metricCache.legend as SegmentLegendData
    const width = 100 / steps

    let arrowVisible = false
    let arrowOffset = 0
    const { clickedObject } = useClickedObject()

    if (clickedObject?.type == "blob") {
        arrowVisible = true
        arrowOffset = (width / 2) + width * (offsetStepCalc(clickedObject))
    }

    return (
        <>
        <div style={{display: `flex`, flexDirection: `row`}}>
            {[...Array(steps).fill(1)].map((_,i) => {
            return (steps >= 4) 
                ? <MetricSegment key={`legend-${i}`} width={width} color={colorGenerator(i)} text={textGenerator(i)} top={ i % 2 === 0 }></MetricSegment>
                : <TopMetricSegment key={`legend-${i}`} width={width} color={colorGenerator(i)} text={textGenerator(i)}></TopMetricSegment>
            })}
        </div>
        <SegmentArrow visible={arrowVisible} position={arrowOffset} height={(steps >= 4 ? 50 : 10)}>
            {"\u25B2"}
        </SegmentArrow>
        </>
    )
}

const SegmentArrow = styled.i<{ visible: boolean; position: number; height: number }>`
    display: ${({ visible }) => (visible ? "initital" : "none")};
    transition: 500ms;
    position: relative;
    bottom: ${({height}) => `${height}px`};
    left: calc(${({ position }) => position}% - ${estimatedLetterWidth}px);
    filter: drop-shadow(0px -2px 0px #fff);
`

interface SegmentMetricProps {
    width: number
    color: string
    text: string
    top: boolean
}

export function MetricSegment({width, color, text, top} : SegmentMetricProps) {
    if (top) return (
        <div style={{display: 'flex', flexDirection: 'column', width: `${width}%`}}>
        <div style={{textAlign: 'left', height: '20px', marginBottom: '-6px'}}>{text}</div>
        <div style={{textAlign: 'left', height: '20px', marginBottom: '-2px'}}>{'/'}</div>
        <div style={{backgroundColor: color, height: '20px'}}></div>
        <div style={{textAlign: 'left', height: '40px'}}></div>
        </div>
    )
    else return (
        <div style={{display: 'flex', flexDirection: 'column', width: `${width}%`}}>
        <div style={{textAlign: 'left', height: '32px'}}></div>
        <div style={{backgroundColor: color, height: '20px'}}></div>
        <div style={{textAlign: 'left', height: '20px', marginTop: '-7px'}}>{'\\'}</div>
        <div style={{textAlign: 'left', height: '20px', marginTop: '-4px'}}>{text}</div>
        </div>
    )
}

interface TopSegmentMetricProps {
    width: number
    color: string
    text: string
}

export function TopMetricSegment({width, color, text} : TopSegmentMetricProps) {
    return (
        <div style={{display: 'flex', flexDirection: 'column', width: `${width}%`}}>
        <div style={{textAlign: 'left', height: '20px', marginBottom: '-6px'}}>{text}</div>
        <div style={{textAlign: 'left', height: '20px', marginBottom: '-2px'}}>{'/'}</div>
        <div style={{backgroundColor: color, height: '20px'}}></div>
        </div>
    )
}