import { createLoader, createSerializer, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server"
import { TimeUnitValues, type TimeUnit } from "~/shared/utils/time"

export const viewSearchParamsConfig = {
  path: parseAsString.withOptions({ shallow: false }),
  objectHash: parseAsString.withOptions({ shallow: false }),
  zoomPath: parseAsString,
  branch: parseAsString.withOptions({ shallow: false }),
  timeUnit: parseAsStringLiteral<TimeUnit>(TimeUnitValues),
  start: parseAsInteger.withOptions({ shallow: false }),
  end: parseAsInteger.withOptions({ shallow: false })
}

export const viewSerializer = createSerializer(viewSearchParamsConfig)
export const loadViewSearchParams = createLoader(viewSearchParamsConfig)
