export function filterKnownProgress(value, challenges) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const ids = new Set(challenges.map((challenge) => challenge.id));
  return Object.fromEntries(Object.entries(value).map(([field, entry]) => [field,
    entry && typeof entry === 'object' && !Array.isArray(entry)
      ? Object.fromEntries(Object.entries(entry).filter(([id]) => ids.has(id))) : entry,
  ]));
}
