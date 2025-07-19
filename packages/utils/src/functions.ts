// chunk an array into smaller arrays of a given size
export const chunkArray = <T>(array: T[], size: number) => {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size),
  );
};

export const filterFalsy = <T>(arr: T[]): NonNullable<T>[] =>
  arr.filter(Boolean) as NonNullable<T>[];
