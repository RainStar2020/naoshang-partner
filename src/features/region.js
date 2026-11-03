import areas from 'china-area-data'

/** Resolve province/city/district display names from admin division codes. */
export function resolveRegionNames(codes) {
  if (!Array.isArray(codes) || codes.length !== 3) return []
  const [provinceCode, cityCode, districtCode] = codes
  const provinceName = areas['86']?.[provinceCode]
  if (!provinceName) return []
  const cityName = areas[provinceCode]?.[cityCode]
  if (!cityName) return []
  const districtName = areas[cityCode]?.[districtCode]
  if (!districtName) return []
  return [provinceName, cityName, districtName]
}

export function ensureRegionNames(codes, names) {
  if (Array.isArray(names) && names.length === 3 && names.every(item => typeof item === 'string' && item)) return [...names]
  return resolveRegionNames(codes)
}
