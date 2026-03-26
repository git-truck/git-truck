import { Form } from "react-router"
import { useViewAction } from "~/hooks"

export function ShuffleColorsForm({ children }: { children: React.ReactNode }) {
  const viewAction = useViewAction()

  return (
    <Form method="post" action={viewAction}>
      <input type="hidden" name="rerollColors" value="" />
      {children}
    </Form>
  )
}
