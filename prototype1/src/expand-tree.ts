export function expandTree(input: string) {
  const children = input
    .split("\n")
    .map((line) => {
      const [_perms, type, hash, name] = line
        .split(/\s+/)
        return ({ hash, name, ...type === "blob" ? { content: ''} : { children: []} })
    });
    return children
}
