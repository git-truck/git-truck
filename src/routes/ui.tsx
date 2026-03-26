import { useState } from "react"
import { LoadingIndicator } from "~/components/LoadingIndicator"
import { ChevronButton } from "~/components/ChevronButton"
import { IconRadioGroup } from "~/components/EnumSelect"
import { Breadcrumb } from "~/components/Breadcrumb"
import { SearchCard } from "~/components/SearchCard"
import { Providers } from "~/components/Providers"
import type { RepoData } from "~/shared/model"
import { Tooltip } from "~/components/Tooltip"
import { Icon } from "~/components/Icon"
import { mdiCog, mdiHelpCircle, mdiPlus } from "@mdi/js"
import { GitTruckInfo } from "~/components/GitTruckInfo"
import { RevisionSelect } from "~/components/RevisionSelect"
import { Handle, Track, SliderRail, TicksByCount } from "~/components/sliderUtils"
import { Slider, Rail, Handles, Tracks } from "react-compound-slider"

// Minimal mock RepoData for context providers
const mockRepoData: RepoData = {
  repo: {
    repositoryName: "mock-repo",
    repositoryPath: "mock/path",
    parentDirPath: "mock",
    parentDirName: "mock",
    status: "Success",
    isAnalyzed: true,
    refs: { Branches: {}, Tags: {} },
    reasons: [],
    currentHead: "main",
    lastChanged: 0
  },
  databaseInfo: {
    topContributors: {},
    commitCounts: {},
    fileSizes: {},
    lastChanged: {},
    contributorCounts: {},
    maxCommitCount: 0,
    minCommitCount: 0,
    newestChangeDate: 0,
    oldestChangeDate: 0,
    maxFileSize: 0,
    minFileSize: 0,
    contributors: [],
    contributorGroups: [],
    fileTree: { type: "tree" as const, name: "root", path: "", hash: "", children: [] },
    hiddenFiles: [],
    lastRunInfo: { time: 0, hash: "" },
    fileCount: 0,
    repo: "mock-repo",
    branch: "main",
    timerange: [0, 0],
    colorSeed: null,
    contributorColors: {},
    commitCountPerTimeInterval: [],
    commitCountPerTimeIntervalUnit: "day",
    selectedRange: [0, 0],
    analyzedRepos: [],
    contribSumPerFile: {},
    maxMinContribCounts: { max: 0, min: 0 },
    commitCount: 0
  }
}

function RangeSliderDemo({ handleType = "round" }: { handleType?: "round" | "square" }) {
  const domain: [number, number] = [0, 100]
  const [range, setRange] = useState<[number, number]>([20, 80])

  const handleRangeChange = (values: readonly number[]) => {
    setRange([values[0], values[1]] as [number, number])
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400">Selected window</p>
        <p className="text-lg font-semibold">
          {range[0]}% – {range[1]}%
        </p>
      </div>
      <Slider
        className="relative"
        mode={2}
        step={1}
        domain={domain}
        values={range}
        onUpdate={handleRangeChange}
        onChange={handleRangeChange}
      >
        <Rail>{SliderRail}</Rail>
        <Handles>
          {({ handles, getHandleProps }) => (
            <div>
              {handles.map((handle, index) => (
                <Handle
                  key={handle.id}
                  handle={handle}
                  domain={domain}
                  getHandleProps={getHandleProps}
                  handleType={handleType}
                  title={`Drag to adjust the ${index === 0 ? "start" : "end"} threshold`}
                />
              ))}
            </div>
          )}
        </Handles>
        <Tracks left={false} right={false}>
          {({ tracks, getTrackProps }) => (
            <div>
              {tracks.map(({ id, ...trackProps }) => (
                <Track
                  key={id}
                  trackType={handleType}
                  {...trackProps}
                  getTrackProps={getTrackProps}
                  backgroundColor="#7aa0c4"
                />
              ))}
            </div>
          )}
        </Tracks>
      </Slider>
      <div className="flex justify-between text-sm font-medium">
        <span>Start: {range[0]}%</span>
        <span>End: {range[1]}%</span>
      </div>
      <TicksByCount below count={5} tickToLabel={(tick) => `${Math.round(tick * 100)}%`} />
    </div>
  )
}

export default function UI() {
  // Use state to simulate hover for tooltip demo
  const [tooltipHovered, setTooltipHovered] = useState(false)

  // Minimal mock blob object for tooltip
  const mockBlob = {
    type: "blob" as const,
    name: "demo.txt",
    path: "src/demo.txt",
    hash: "abc123",
    extension: "txt",
    sizeInBytes: 42
  }
  return (
    <Providers data={mockRepoData}>
      <div className="mx-auto max-w-3xl space-y-8 p-2">
        <h1 className="mb-4 text-2xl font-bold">UI Components</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card">
            <h2 className="card__title">Default Card</h2>
            <p className="text-sm">This is a simple card with some text content.</p>
          </div>
          <div className="card">
            <div className="card__header">
              <span className="icon">🚚</span>
              <h2 className="card__title">Card with Header</h2>
            </div>
            <div className="card__content">
              <p className="text-sm">Card with header, subtitle, and content.</p>
            </div>
          </div>
          {/* Button Variants */}
          <div className="card">
            <h2 className="card__title">Buttons</h2>
            <div className="flex flex-wrap gap-2">
              <button className="btn">Default</button>
              <button className="btn btn--text">Default text</button>

              <button className="btn btn--primary">Primary</button>
              <button className="btn btn--primary btn--outlined">Primary Outlined</button>
              <button className="btn btn--primary btn--text">Primary Text</button>

              <button className="btn btn--danger">Danger</button>
              <button className="btn btn--danger btn--outlined">Danger Outlined</button>
              <button className="btn btn--danger btn--text">Danger Text</button>

              <button className="btn btn--icon">
                <Icon path={mdiPlus} size="1.25em" />
              </button>
              <button className="btn btn--icon btn--primary">
                <Icon path={mdiCog} size="1.25em" />
              </button>
              <button className="btn btn--icon btn--outlined">
                <Icon path={mdiHelpCircle} size="1.25em" />
              </button>
              <button className="btn btn--hover-swap">
                <span>Hover me</span>
                <span className="hover-swap">🎉</span>
              </button>
              <ChevronButton open={false} />
              <ChevronButton open={true} />
              <button className="btn btn--icon">
                <Icon path={mdiPlus} size="1.25em" />
                <span className="badge">13</span>
              </button>
            </div>
          </div>
          {/* Button disabled variants */}
          <div className="card">
            <h2 className="card__title">Disabled Buttons</h2>
            <div className="flex flex-wrap gap-2">
              <button disabled className="btn">
                Default
              </button>
              <button disabled className="btn btn--text">
                Default text
              </button>

              <button disabled className="btn btn--primary">
                Primary
              </button>
              <button disabled className="btn btn--primary btn--outlined">
                Primary Outlined
              </button>
              <button disabled className="btn btn--primary btn--text">
                Primary Text
              </button>

              <button disabled className="btn btn--danger">
                Danger
              </button>
              <button disabled className="btn btn--danger btn--outlined">
                Danger Outlined
              </button>
              <button disabled className="btn btn--danger btn--text">
                Danger Text
              </button>

              <button disabled className="btn btn--icon">
                <Icon path={mdiPlus} size="1.25em" />
              </button>
              <button disabled className="btn btn--icon btn--primary">
                <Icon path={mdiCog} size="1.25em" />
              </button>
              <button disabled className="btn btn--icon btn--outlined">
                <Icon path={mdiHelpCircle} size="1.25em" />
              </button>
              <button disabled className="btn btn--hover-swap">
                <span>Hover me</span>
                <span className="hover-swap">🎉</span>
              </button>
              <ChevronButton open={false} />
              <ChevronButton open={true} />
              <button disabled className="btn btn--icon">
                <Icon path={mdiPlus} size="1.25em" />
                <span className="badge">13</span>
              </button>
            </div>
          </div>
          {/* Inputs & Labels */}
          <div className="card">
            <h2 className="card__title">Inputs & Labels</h2>
            <div className="flex flex-col gap-2">
              <label className="label" htmlFor="input1">
                Label
              </label>
              <input className="input" id="input1" placeholder="Type here..." />
              <label className="label" htmlFor="select1">
                Select
              </label>
              <select className="input" id="select1">
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
              <label className="label" htmlFor="revisionSelect">
                Revision Select
              </label>
              <RevisionSelect
                headGroups={{
                  Branches: {
                    main: "abcdef"
                  },
                  Tags: {}
                }}
                disabled={false}
                analyzedBranches={[]}
              />
            </div>
          </div>
          {/* LoadingIndicator Demo */}
          <div className="card">
            <h2 className="card__title">LoadingIndicator</h2>
            <LoadingIndicator loadingText="Loading something..." showProgress={false} />
          </div>
          {/* Git Truck Info Demo */}
          <div className="card">
            <GitTruckInfo installedVersion="1.0.0" latestVersion="1.0.0" />
          </div>
          <div className="card">
            <GitTruckInfo installedVersion="1.0.0" latestVersion="1.0.1" />
          </div>
          <div className="card">
            <GitTruckInfo installedVersion="0.0.0-98822df" latestVersion="1.0.1" />
          </div>
          {/* Slider */}
          <div className="card">
            <h2 className="card__title">Slider, round handles</h2>
            <p className="text-sm">
              Demonstrates the same rail, handles, and tracks that power the in-app time range picker.
            </p>
            <RangeSliderDemo handleType="round" />
          </div>
          <div className="card">
            <h2 className="card__title">Slider, qquare Handles</h2>
            <p className="text-sm">Same range selector with the column-style handles used in tighter layouts.</p>
            <RangeSliderDemo handleType="square" />
          </div>
          {/* IconRadioGroup Demo */}
          <div className="card">
            <h2 className="card__title">IconRadioGroup</h2>
            {/* Fix typing for IconRadioGroup demo */}
            {(() => {
              type DemoEnum = "A" | "B" | "C"
              const group: Record<DemoEnum, string> = { A: "Alpha", B: "Beta", C: "Gamma" }
              const iconMap: Record<DemoEnum, string> = {
                A: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
                B: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",
                C: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"
              }
              return (
                <IconRadioGroup
                  ariaLabel="Select demo option"
                  group={group}
                  defaultValue="A"
                  iconMap={iconMap}
                  onChange={() => {}}
                />
              )
            })()}
            {(() => {
              type DemoEnum = "A" | "B" | "C"
              const enumObj: Record<DemoEnum, string> = { A: "Alpha", B: "Beta", C: "Gamma" }
              const iconMap: Record<DemoEnum, string> = {
                A: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
                B: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",
                C: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"
              }
              return (
                <IconRadioGroup
                  large
                  ariaLabel="Select demo option large"
                  group={enumObj}
                  defaultValue="A"
                  iconMap={iconMap}
                  onChange={() => {}}
                />
              )
            })()}
          </div>
          {/* Breadcrumb Demo */}
          <div className="card">
            <h2 className="card__title">Breadcrumb</h2>
            <Breadcrumb />
          </div>
          {/* SearchCard Demo */}
          <div className="card relative">
            <SearchCard />
          </div>
          {/* Tooltip Demo (with context and hoveredObject) */}
          <div className="card">
            <h2 className="card__title">Tooltip (Demo)</h2>
            <div className="flex flex-col items-start gap-2 p-4">
              <span>Hover over the button to show tooltip:</span>
              <div className="">
                <button
                  className="btn btn--icon"
                  onMouseEnter={() => setTooltipHovered(true)}
                  onMouseLeave={() => setTooltipHovered(false)}
                >
                  <span className="icon">🛈</span> Hover me
                </button>
                {tooltipHovered && <Tooltip hoveredObject={mockBlob} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Providers>
  )
}
