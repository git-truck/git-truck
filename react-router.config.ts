import type { Config } from "@react-router/dev/config"

export default {
  appDirectory: "src",
  routeDiscovery: {
    mode: "initial"
  },
  future: {
    v8_middleware: true
  }
} satisfies Config
