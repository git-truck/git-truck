function getRenameIntervals() {
    const renames = getRenamesInTimeRangeFromDB()
    renames.sortByTimestampDescending()
    const files = getFilesInCurrentFileTree()

    const currentPathToRenameChain = new Map()
    const finishedRenameChains = []

    files.forEach(file => currentPathToRenameChain.set(file, [
      { fromName: file, toName: file, timestampStart: 0, timestampEnd: Infinity }
    ]))

    for (const currentRename of renames) {
      if (currentPathToRenameChain.get(currentRename.toName)) continue
      const existingRenameChain = currentPathToRenameChain.get(currentRename.toName)
      if  (!existingRenameChain) continue

      const previousRenameInChain = existingRenameChain.last()
      previousRenameInChain.timestampStart = currentRename.timestampEnd
      currentRename.timestampStart = previousRenameInChain.timestampStart

      if (currentRename.fromName === null) {
        previousRenameInChain.timestampStart = currentRename.timestampEnd
        finishedRenameChains.push(existingRenameChain)
      } else {
        existingRenameChain.push(currentRename)
        currentPathToRenameChain.set(currentRename.fromName, existingRenameChain)
      }

      currentPathToRenameChain.delete(currentRename.toName)
    }

    finishedRenameChains.push(...currentPathToRenameChain.values())

    const allRenamesAsList = finishedRenameChains.flatMap((chain) => {
      const existingFileName = chain[0].toName
      return chain.map((interval) => ({ ...interval, toName: existingFileName }))
    })

    return allRenamesAsList
}