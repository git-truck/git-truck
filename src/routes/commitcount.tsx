import type { Route } from "./+types/commitcount"
import { currentRepositoryContext } from "~/routes/view"

export const loader = async ({ context }: Route.LoaderArgs) => {
  const { repositoryPath, instance } = context.get(currentRepositoryContext)

  if (!instance) return []
  return await instance.db.getCommitCountForPath(repositoryPath)
}
