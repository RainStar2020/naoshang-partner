// API sections describe membership tiers; their L1-L5 IDs are not journey node IDs.
export function isJourneyLevelUnlocked(level, entitlements) {
  const tierSections = { 1: ['jy', 'cj'], 2: ['xn'], 3: ['ys'] }
  return entitlements.some(item => item.unlocked === true && (
    item.section
      ? tierSections[level.tier]?.includes(item.section)
      : item.id === `level-${level.number}`
  ))
}
