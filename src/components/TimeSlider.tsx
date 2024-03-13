import { useSubmit, useNavigation } from '@remix-run/react';
import { useMemo, useState } from 'react';
import type { SliderItem, GetHandleProps, GetTrackProps } from 'react-compound-slider';
import { Slider, Rail, Handles, Tracks } from 'react-compound-slider';
import { useData } from '~/contexts/DataContext';
import { dateFormatShort, getPathFromRepoAndHead } from '~/util';

interface IHandleProps {
    domain: number[];
    handle: SliderItem;
    getHandleProps: GetHandleProps;
    disabled: boolean
}

function Handle(props: IHandleProps) {
    return (
        <div
            role="slider"
            aria-valuemin={props.domain[0]}
            aria-valuemax={props.domain[1]}
            aria-valuenow={props.handle.value}
            style={{
                left: `${props.handle.percent}%`,
                position: 'absolute',
                marginLeft: '-11px',
                marginTop: '-6px',
                zIndex: 2,
                width: 24,
                height: 24,
                cursor: 'pointer',
                borderRadius: '50%',
                boxShadow: '1px 1px 1px 1px rgba(0, 0, 0, 0.2)',
                backgroundColor: `${props.disabled ? "grey" : '#34568f'}`
            }}
            {...props.getHandleProps(props.handle.id)}
        />
    )
}

interface ITrackProps {
    source: SliderItem
    target: SliderItem
    getTrackProps: GetTrackProps
    disabled: boolean
}

function Track(props: ITrackProps) {
    return (
        <div
            style={{
                position: 'absolute',
                height: 14,
                zIndex: 1,
                backgroundColor: `${props.disabled ? "grey" : "#7aa0c4"}`,
                borderRadius: 7,
                cursor: 'pointer',
                left: `${props.source.percent}%`,
                width: `${props.target.percent - props.source.percent}%`
            }}
            {...props.getTrackProps()}
        />
    )
}

// interface ITickProps {
//     key: string;
//     tick: SliderItem;
//     count: number;
// }

// function Tick(props: ITickProps) {
//     return (
//         <div>
//             <div
//                 style={{
//                     position: 'absolute',
//                     marginTop: 14,
//                     width: 1,
//                     height: 5,
//                     backgroundColor: 'rgb(200,200,200)',
//                     left: `${props.tick.percent}%`
//                 }}
//             />
//             <div
//                 style={{
//                     position: 'absolute',
//                     marginTop: 22,
//                     fontSize: 10,
//                     textAlign: 'center',
//                     marginLeft: `${-(100 / props.count) / 2}%`,
//                     width: `${100 / props.count}%`,
//                     left: `${props.tick.percent}%`
//                 }}
//             >
//                 {(new Date(props.tick.value * 1000)).toISOString()}
//             </div>
//         </div>
//     )
// }


export default function TimeSlider() {
    const sliderStyle: React.CSSProperties = {
        left: '5%',
        top: '30px',
        position: 'relative',
        width: '90%'
    };

    const railStyle: React.CSSProperties = {
        position: 'absolute',
        width: '100%',
        height: 14,
        borderRadius: 7,
        cursor: 'pointer',
        backgroundColor: 'rgb(155,155,155)'
    };

    const {repodata2} = useData()
    const {timerange} = repodata2
    const submit = useSubmit()
    const [range, setRange] = useState(timerange)
    const selectedStartDate = useMemo(() => new Date(range[0] * 1000), [range])
    const selectedEndDate = useMemo(() => new Date(range[1] * 1000), [range])
    const percentageStart = useMemo(() => ((range[0]-timerange[0]) / (timerange[1]-timerange[0])) * 100, [range, timerange])
    const percentageEnd = useMemo(() => ((range[1]-timerange[0]) / (timerange[1]-timerange[0])) * 100, [range, timerange])
    const { repo } = useData()
    const navigationData = useNavigation()
    const disabled = navigationData.state !== "idle"

    return (
        <div style={{ height: 60, width: '100%' }}>
            <Slider
                mode={2}
                step={1}
                domain={timerange}
                rootStyle={sliderStyle}
                onUpdate={(e) => setRange([...e] as [number, number])}
                onChange={() => {
                    const form = new FormData()
                    form.append("timeseries", `${range[0]}-${range[1]}`)
                    submit(form, {
                        action: `/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`,
                        method: "post"
                    })
                }}
                values={range}
                disabled={disabled}
            >
                <Rail>
                    {({ getRailProps }) => (
                        <div style={railStyle} {...getRailProps()} >
                            <p style={{left: `${percentageStart}%`, bottom: "100%", position: "absolute", transform: "translate(-50%, -50%)"}}>{dateFormatShort(selectedStartDate.getTime())}</p>
                            <p style={{left: `${percentageEnd}%`, bottom: "100%", position: "absolute", transform: "translate(-50%, -50%)"}}>{dateFormatShort(selectedEndDate.getTime())}</p>
                        </div>
                    )}
                </Rail>
                <Handles>
                    {({ handles, getHandleProps }) => (
                        <div className="slider-handles">
                            {handles.map(handle => (
                                <Handle
                                    key={handle.id}
                                    handle={handle}
                                    domain={timerange}
                                    getHandleProps={getHandleProps}
                                    disabled={disabled}
                                />
                            ))}
                        </div>
                    )}
                </Handles>
                <Tracks left={false} right={false}>
                    {({ tracks, getTrackProps }) => (
                        <div className="slider-tracks">
                            {tracks.map(({ id, source, target }) => (
                                <Track
                                    key={id}
                                    source={source}
                                    target={target}
                                    getTrackProps={getTrackProps}
                                    disabled={disabled}
                                />
                            ))}
                        </div>
                    )}
                </Tracks>
                {/* <Ticks count={2}>
                    {({ ticks }) => (
                        <div className="slider-ticks">
                            {ticks.map(tick => (
                                <Tick key={tick.id} tick={tick} count={ticks.length} />
                            ))}
                        </div>
                    )}
                </Ticks> */}
            </Slider>
        </div>
    );
}