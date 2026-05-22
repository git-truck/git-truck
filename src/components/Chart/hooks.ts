import { useReducer } from "react"
import LayoutWorker from "~/components/Chart/layout-worker?worker"
import { type DatabaseInfo } from "~/shared/model"

// 1. We want to invoke the worker

const layoutCache = new WeakMap<DatabaseInfo, Hiearc>()

const useLayoutWorker = function (opts) {
  const [state, dispatch] = useReducer()

  const worker = new LayoutWorker({
    name: "layout-worker"
  })
  worker.onmessage = (event) => {
    console.log(event.data)
  }
  console.log("posting message to worker")
  return (opts) => {
    return worker.postMessage(opts)
  }
}
