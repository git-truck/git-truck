import { ActionFunction, json, Link, LoaderFunction, useLoaderData, useNavigate, useSubmit, useTransition } from "remix"
import styled, { css } from "styled-components"
import { getArgsWithDefaults } from "~/analyzer/args.server"
import { getBaseDirFromPath, getDirName } from "~/analyzer/util.server"
import { Spacer } from "~/components/Spacer"
import {
  Box,
  BoxSubTitle,
  Code,
  Grower,
} from "~/components/util"
import { AnalyzingIndicator } from "~/components/AnalyzingIndicator"
import { resolve } from "path"
import { Repository } from "~/analyzer/model"
import { GitCaller } from "~/analyzer/git-caller.server"
import { useMount } from "react-use"
import { getPathFromRepoAndBranch as getPathFromRepoAndHead } from "~/util"
import { ChangeEvent, useState } from "react"
import { GroupedBranchSelect } from "~/components/BranchSelect"

type RepositoryWithGroups = Repository & {
  groups: {
    "Analyzed": Record<string, string>,
    "Not analyzed": Record<string, string>,
  }
}

interface IndexData {
  repositories: RepositoryWithGroups[]
  baseDir: string
  baseDirName: string
  repo: Repository | null
  hasRedirected: boolean
}

let hasRedirected = false

export const loader: LoaderFunction = async () => {
  const args = await getArgsWithDefaults()
  const [repo, repositories] = await GitCaller.scanDirectoryForRepositories(args.path)

  const repositoriesWithGroupedBranches = repositories.map(repo => {
    const analyzedBranchNames = Object.entries(repo.analyzedBranches).map(([branchName]) => {
      return branchName
    })
    const groups = {
      Analyzed: repo.analyzedBranches,
      "Not analyzed": Object.entries(repo.refs.heads).reduce((acc, [branchName, branch]) => {
        if (!analyzedBranchNames.includes(branchName)) {
          acc[branchName] = branch
        }
        return acc
      }, {} as Record<string, string>),
    }
    return {
      ...repo,
      groups
    }
  })

  const baseDir = resolve(repo ? getBaseDirFromPath(args.path) : args.path)
  const repositoriesResponse = json<IndexData>({
    repositories: repositoriesWithGroupedBranches,
    baseDir,
    baseDirName: getDirName(baseDir),
    repo,
    hasRedirected,
  })

  const response = repositoriesResponse
  hasRedirected = true

  return response
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData()
  if (formData.has("hasRedirected")) {
    hasRedirected = true
  }
  return null
}

export default function Index() {
  const loaderData = useLoaderData<IndexData>()
  const { repositories, baseDir, baseDirName, repo, hasRedirected } = loaderData
  const transitionData = useTransition()
  const navigate = useNavigate()
  const submit = useSubmit()

  const willRedirect = repo && !hasRedirected
  useMount(() => {
    if (willRedirect) {
      const data = new FormData()
      data.append("hasRedirected", "true")
      submit(data, { method: "post" })
      navigate(`/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`)
    }
  })

  if (transitionData.state !== "idle" || willRedirect) return <AnalyzingIndicator />
  return (
    <Wrapper>
      <Spacer />
      <H1>{baseDir}</H1>
      <Spacer />
      <p>
        Found {repositories.length} git repositories in the folder <Code inline>{baseDirName}</Code>.
      </p>
      {repositories.length === 0 ? (
        <>
          <Spacer />
          <p>
            Try running <Code inline>git-truck</Code> in another folder or provide another path as argument.
          </p>
        </>
      ) : (
        <>
          <Spacer xxl />
          <nav>
            <Ul>
              {repositories.map((repo) => (
                <RepositoryEntry key={repo.path} repo={repo} />
              ))}
            </Ul>
          </nav>
        </>
      )}
    </Wrapper>
  )
}

function RepositoryEntry({ repo }: { repo: RepositoryWithGroups }): JSX.Element {
  const [head, setHead] = useState(repo.currentHead)
  const path = getPathFromRepoAndHead(repo.name, head)

  const branchIsAnalyzed = repo.analyzedBranches[head]
  const iconColor = branchIsAnalyzed ? "green" : undefined

  return (
    <Li key={repo.name}>
      <Box style={{
        outline: branchIsAnalyzed ? "1px solid green" : undefined,
      }}>
        <BoxSubTitle title={repo.name}>{repo.name}
        {branchIsAnalyzed ? <AnalyzedTag>Analyzed</AnalyzedTag> : null}
        </BoxSubTitle>
        <Spacer />
        <GroupedBranchSelect
          value={head}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setHead(e.target.value)}
          headGroups={repo.groups}
          iconColor={iconColor}
        />
        <Spacer />
        <Actions>
          <Grower />
          <SLink to={path}>{branchIsAnalyzed ? "View" : "Analyze"}</SLink>
        </Actions>
      </Box>
    </Li>
  )
}

const Wrapper = styled.div`
  width: calc(100vw - 2 * var(--side-panel-width));
  margin: auto;
  padding: var(--unit);

  @media(max-width: 1000px) {
    width: 100vw;
  }
`
const H1 = styled.h1`
  font-family: "Courier New", Courier, monospace;
`

const Ul = styled.ul`
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(225px, 1fr));
`

const Li = styled.li`
  margin: 0;
`

const Actions = styled.div`
  display: flex;
`

const SLink = styled(Link)<{ green?: boolean }>`
  line-height: 100%;
  text-decoration: none;
  font-weight: bold;
  font-size: 0.9em;
  color: ${props => props.green ? " green" : css`var(--text-color)`};
  text-transform: uppercase;
  opacity: 75%;
  cursor: pointer;
  &:hover {
    opacity: 100%;
  }
`

const AnalyzedTag = styled.span`
  text-transform: uppercase;
  font-weight: normal;
  font-size: 0.6rem;
  border: 1px solid currentColor;
  color: green;
  border-radius:  100000px;
  padding: 2px 4px;
  letter-spacing: 1px;
  user-select: none;
  font-weight: bold;
  display: flex;
  place-items: center;
  line-height: 100%;
  vertical-align: middle;
  align-content: flex-start;
`
