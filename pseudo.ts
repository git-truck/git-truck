/*
function getRenameIntervals(timeRangeStart, timeRangeEnd) {
  const renames = getRenamesInTimeRange(timeRangeStart, timeRangeEnd)
  renames.sortByTimestampDescending()
  const files = getFilesInCurrentFileTree(timeRangeEnd)

  const pathToRenameChain = new Map()
  const finishedRenameChains = []

  for (const file of files) {
    pathToRenameChain[file] = 
      [{ fromName: file, toName: file, 
        timestampStart: 0, 
        timestampEnd: Infinity 
      }]
  }

  for (const currentRename of renames) {
    if (currentRename.toName === null) 
      continue
    const existingRenameChain = 
      pathToRenameChain[currentRename.toName]
    if  (existingRenameChain === null) 
      continue

    const previousRenameInChain = 
      existingRenameChain.last()

    previousRenameInChain.timestampStart = 
      currentRename.timestampEnd
      
    currentRename.timestampStart = 
      previousRenameInChain.timestampStart

    if (currentRename.fromName === null) {
      previousRenameInChain.timestampStart = 
        currentRename.timestampEnd
      finishedRenameChains.push(
        existingRenameChain)
    } else {
      existingRenameChain.push(currentRename)
      pathToRenameChain[currentRename.fromName] =
        existingRenameChain
    }

    pathToRenameChain.delete(
      currentRename.toName)
  }

  finishedRenameChains.push(
    ...pathToRenameChain.values()
  )

  const allRenamesAsList = 
    finishedRenameChains.flatMap((chain) => 
    {
      return chain.map((interval) => (
        { ...interval, 
          toName: chain[0].toName 
        }
      ))
    })

  return allRenamesAsList
}
*/