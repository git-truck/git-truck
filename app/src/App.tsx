import { Main } from "./components/Main"
import { Container } from "./components/util"
import { SidePanel } from "./components/SidePanel"
import { Providers } from "./components/Providers"
import { ParserData } from "parser/src/model"

function App(
  props: { data: ParserData }
) {
  return (
    <Providers
      data={props.data}
    >
      <Container>
        <SidePanel />
        <Main />
      </Container>
    </Providers>
  )
}

export default App
