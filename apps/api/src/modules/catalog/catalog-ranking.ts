export function normalizeSearchValue(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\u0980-\u09ff]+/g, " ")
    .trim();
}

function editDistance(leftValue: string, rightValue: string) {
  const left = normalizeSearchValue(leftValue);
  const right = normalizeSearchValue(rightValue);
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0]!;
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const previous = row[rightIndex]!;
      row[rightIndex] = Math.min(
        row[rightIndex]! + 1,
        row[rightIndex - 1]! + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
      diagonal = previous;
    }
  }

  return row[right.length]!;
}

export function fuzzySearchScore(query: string, value: string) {
  const needle = normalizeSearchValue(query);
  const candidate = normalizeSearchValue(value);
  if (!needle || !candidate) return Number.POSITIVE_INFINITY;
  if (candidate.startsWith(needle)) return -20;
  if (candidate.includes(needle)) return -10;
  return Math.min(
    ...candidate.split(" ").map((part) => editDistance(needle, part)),
    editDistance(needle, candidate)
  );
}

export function fuzzySearchThreshold(query: string) {
  return Math.max(2, Math.ceil(normalizeSearchValue(query).length * 0.34));
}
