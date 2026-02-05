import { useNavigate } from "react-router"
import { UnionAuthorsModal } from "~/components/UnionAuthorsModal"

export default function MergeAuthorsView() {
  const navigate = useNavigate()
  return <UnionAuthorsModal open onClose={() => navigate("..")} />
}
