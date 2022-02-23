import { useId } from "@react-aria/utils"
import { Spacer } from "./Spacer"
import { Label, Select } from "./util"

interface EnumSelectProps<T> {
  label: string
  enum: T
  onChange: (metric: keyof T) => void
}

export function EnumSelect<T>(props: EnumSelectProps<T>) {
  let id = useId()
  return (
    <div>
      <Label htmlFor={id}>{props.label}</Label>
      <Spacer xs />
      <Select
        id={id}
        onChange={(event) =>
          props.onChange(event.target.value as unknown as keyof T)
        }
      >
        {Object.entries(props.enum).map(([key, value]) => (
          <option key={value} value={key}>
            {value}
          </option>
        ))}
      </Select>
    </div>
  )
}
