function findInsertionIndex<T>(arr: T[], element: T, comparatorFn: (a: T, b: T) => number): number {
  if (arr.length === 0) {
      return 0;
  }

  let low: number = 0;
  let high: number = arr.length - 1;

  while (low <= high) {
      const mid: number = Math.floor(low + (high - low) / 2);
      const comparison: number = comparatorFn(element, arr[mid]);
      if (comparison === 0) {
          return mid;
      } else if (comparison < 0) {
          high = mid - 1;
      } else {
          low = mid + 1;
      }
  }
  return low;
}

export function sortedInsert<T>(arr: T[], element: T, comparatorFn: (a: T, b: T) => number): number {
  const insertionIndex: number = findInsertionIndex(arr, element, comparatorFn);
  arr.splice(insertionIndex, 0, element);
  return insertionIndex;
}