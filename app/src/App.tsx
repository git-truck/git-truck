import "./App.css"
import { Main } from "./components/Main"
import { Container } from "./components/util"
import { SidePanel } from "./components/SidePanel"
import { Providers } from "./components/Providers"

function App() {
  return (
    <Providers>
      <Container>
        <SidePanel />
        <Main />
      </Container>
    </Providers>
  )
}

export default App
