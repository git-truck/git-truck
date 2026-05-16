import { createLoader, createSerializer, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server"
import { TimeUnitValues, type TimeUnit } from "~/shared/utils/time"

export const viewSearchParamsConfig = {
  path: parseAsString.withOptions({ shallow: false }),
  objectPath: parseAsString.withOptions({ shallow: false }),
  zoomPath: parseAsString.withOptions({ shallow: false }),
  branch: parseAsString.withOptions({ shallow: false }),
  timeUnit: parseAsStringLiteral<TimeUnit>(TimeUnitValues).withOptions({ shallow: false }),
  start: parseAsInteger.withOptions({ shallow: false }),
  end: parseAsInteger.withOptions({ shallow: false })
}

export const viewSerializer = createSerializer(viewSearchParamsConfig)
export const loadViewSearchParams = createLoader(viewSearchParamsConfig)
