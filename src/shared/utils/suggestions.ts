export const mergeSuggestions = (
  saved: readonly string[],
  catalog: readonly string[]
): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of [...saved, ...catalog]) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase('ru-RU');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
};
