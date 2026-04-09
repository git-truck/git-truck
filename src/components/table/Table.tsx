// import type { Person } from "~/shared/model"

// function Table<DataType>({
//   columns
// }: {
//   data: Array<DataType>
//   columns: {
//     name: string
//     getter: (data: DataType) => DataType[keyof DataType]
//     align: "left" | "center" | "right"
//   }
// }) {
//   return null
// }

// type PersonWithDetails = Array<Person & { contribsum: number; percentage: number; count: number }>

// const contributors: Array<Person & { contribsum: number; percentage: number; count: number }> = [
//   { name: "Alice", contribsum: 100, percentage: 50, count: 10 },
//   { name: "Bob", contribsum: 50, percentage: 25, count: 5 },
//   { name: "Charlie", contribsum: 25, percentage: 12.5, count: 2 }
// ]

// const PersonTable = Table<PersonWithDetails>

// const table = (
//   <PersonTable
//     columns={[
//       {
//         name: "Top Contributor",
//         getter: (p) => p.name,
//         align: "left"
//       },

//       { name: "# Files", getter: (p) => p.count, align: "right" }
//     ]}
//     data={contributors}
//   />
// )
