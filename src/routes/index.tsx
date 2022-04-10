import { ActionFunction, json, Link, LoaderFunction, useLoaderData, useNavigate, useSubmit, useTransition } from "remix"
import styled from "styled-components"
import { getArgsWithDefaults } from "~/analyzer/args.server"
import { getBaseDirFromPath, getDirName, scanForRepositories } from "~/analyzer/util.server"
import { Spacer } from "~/components/Spacer"
import { Box, BoxSubTitle, Code } from "~/components/util"
import { AnalyzingIndicator } from "~/components/AnalyzingIndicator"
import { resolve } from "path"
import { Repository } from "~/analyzer/model"
import { useEffect } from "react"

interface IndexData {
  repositories: Repository[]
  baseDir: string
  baseDirName: string
  repo: Repository | null
  hasRedirected: boolean
}

let hasRedirected = false

export const loader: LoaderFunction = async () => {
  const args = await getArgsWithDefaults()

  // If this file is moved, this should be updated
  const basePath = resolve(__dirname, "..", "..")
  const [repo, repositories] = await scanForRepositories(basePath, args.path)
  const baseDir = resolve(repo ? getBaseDirFromPath(args.path) : args.path)
  const repositoriesResponse = json<IndexData>({
    repositories,
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
  const { repositories, baseDir, baseDirName, repo, hasRedirected } = useLoaderData<IndexData>()
  const transitionData = useTransition()
  const navigate = useNavigate()
  const submit = useSubmit()

  const willRedirect = repo && !hasRedirected
  useEffect(() => {
    if (willRedirect) {
      const data = new FormData()
      data.append("hasRedirected", "true")
      submit(data, { method: "post" })
      navigate(`/${repo.name}`)
    }
  }, [])

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
      ) : null}
      <Spacer />
      <nav>
        <Ul>
          {repositories.map(({ name }) => (
            <Li key={name}>
              <Box>
                <BoxSubTitle>{name}</BoxSubTitle>
                <Actions>
                  <SLink to={name}>Analyze</SLink>
                </Actions>
              </Box>
            </Li>
          ))}
        </Ul>
      </nav>
    </Wrapper>
  )
}

const Wrapper = styled.div`
  width: calc(100vw - 2 * var(--side-panel-width));
  margin: auto;
`
const H1 = styled.h1`
  font-family: "Courier New", Courier, monospace;
`

const Ul = styled.ul`
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`

const Li = styled.li``

const Actions = styled.div`
  text-align: right;
`

const SLink = styled(Link)``
