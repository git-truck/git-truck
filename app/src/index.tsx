import type {} from "react/next"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./vars.css"
import "./index.css"
import App from "./App"
import reportWebVitals from "./reportWebVitals"

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Failed to find the root element")
const root = createRoot(rootElement)

root.render(
  <StrictMode>
    <App />
  </StrictMode>
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
