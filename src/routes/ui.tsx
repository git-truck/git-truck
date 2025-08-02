import React, { useState } from "react"
import { LoadingIndicator } from "../components/LoadingIndicator"
import { ChevronButton } from "../components/ChevronButton"
import { AuthorOptions } from "../components/AuthorOptions"
import { EnumSelect } from "../components/EnumSelect"
import { Breadcrumb } from "../components/Breadcrumb"
import { SearchCard } from "../components/SearchCard"
import { Providers } from "../components/Providers"
import type { RepoData } from "../shared/model"
import { Tooltip } from "../components/Tooltip"
import Icon from "@mdi/react"
import { mdiCog, mdiHelpCircle, mdiPlus } from "@mdi/js"
import { GitTruckInfo } from "~/components/GitTruckInfo"
import { RevisionSelect } from "~/components/RevisionSelect"

// Minimal mock AnalyzerData for RepoData
const mockAnalyzerData = {
  cached: false,
  interfaceVersion: 16 as const,
  hiddenFiles: [],
  repo: "mock-repo",
  branch: "main",
  commit: {
    type: "commit" as const,
    hash: "",
    tree: { type: "tree" as const, name: "root", path: "", hash: "", children: [] },
    parent: "",
    parent2: null,
    author: { name: "", email: "", timestamp: 0, timezone: "" },
    committer: { name: "", email: "", timestamp: 0, timezone: "" },
    message: "",
    description: "",
    coauthors: [],
    fileCount: 0
  },
  authors: [],
  authorsUnion: [],
  currentVersion: "",
  lastRunEpoch: 0,
  commits: {}
}

// Minimal mock RepoData for context providers
const mockRepoData: RepoData = {
  repo: {
    path: "mock/path",
    parentDirPath: "mock",
    name: "mock-repo",
    status: "Success",
    isAnalyzed: true,
    refs: { Branches: {}, Tags: {} },
    reasons: [],
    analyzedHeads: {},
    data: mockAnalyzerData,
    currentHead: "main"
  },
  databaseInfo: {
    dominantAuthors: {},
    commitCounts: {},
    lastChanged: {},
    authorCounts: {},
    maxCommitCount: 0,
    minCommitCount: 0,
    newestChangeDate: 0,
    oldestChangeDate: 0,
    authors: [],
    authorUnions: [],
    fileTree: { type: "tree" as const, name: "root", path: "", hash: "", children: [] },
    hiddenFiles: [],
    lastRunInfo: { time: 0, hash: "" },
    fileCount: 0,
    repo: "mock-repo",
    branch: "main",
    timerange: [0, 0],
    colorSeed: null,
    authorColors: {},
    commitCountPerDay: [],
    selectedRange: [0, 0],
    analyzedRepos: [],
    contribSumPerFile: {},
    maxMinContribCounts: { max: 0, min: 0 },
    commitCount: 0
  }
}

export default function UI() {
  return (
    <Providers data={mockRepoData}>
      <div className="mx-auto max-w-3xl space-y-8 p-2">
        <h1 className="mb-4 text-2xl font-bold">UI Components</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card">
            <h2 className="card__title">Default Card</h2>
            <p className="card-p">This is a simple card with some text content.</p>
          </div>
          <div className="card">
            <div className="card__header">
              <span className="icon">🚚</span>
              <h2 className="card__title">Card with Header</h2>
            </div>
            <div className="card__content">
              <p className="card-p">Card with header, subtitle, and content.</p>
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
                className="input"
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
          {/* AuthorOptions Demo (mock handler) */}
          <div className="card">
            <h2 className="card__title">AuthorOptions</h2>
            <AuthorOptions showUnionAuthorsModal={() => alert("Show union authors modal")} />
          </div>
          {/* EnumSelect Demo */}
          <div className="card">
            <h2 className="card__title">EnumSelect</h2>
            {/* Fix typing for EnumSelect demo */}
            {(() => {
              type DemoEnum = "A" | "B" | "C"
              const enumObj: Record<DemoEnum, string> = { A: "Alpha", B: "Beta", C: "Gamma" }
              const iconMap: Record<DemoEnum, string> = {
                A: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
                B: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",
                C: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"
              }
              return <EnumSelect<DemoEnum> enum={enumObj} defaultValue="A" onChange={() => {}} iconMap={iconMap} />
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
                <EnumSelect<DemoEnum> large enum={enumObj} defaultValue="A" onChange={() => {}} iconMap={iconMap} />
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
              {(() => {
                // Minimal mock blob object for tooltip
                const mockBlob = {
                  type: "blob" as const,
                  name: "demo.txt",
                  path: "src/demo.txt",
                  hash: "abc123",
                  sizeInBytes: 42
                }
                // Use state to simulate hover
                const [hovered, setHovered] = useState(false)
                return (
                  <div className="">
                    <button
                      className="btn btn--icon"
                      onMouseEnter={() => setHovered(true)}
                      onMouseLeave={() => setHovered(false)}
                    >
                      <span className="icon">🛈</span> Hover me
                    </button>
                    {hovered && <Tooltip hoveredObject={mockBlob} />}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
    </Providers>
  )
}
