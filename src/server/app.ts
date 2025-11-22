import { createRequestHandler } from "@react-router/express"
import express from "express"

export const app: express.Express = express()

app.use(
  createRequestHandler({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Virtual module provided by React Router
    // eslint-disable-next-line import/no-unresolved
    build: () => import("virtual:react-router/server-build")
  })
)
