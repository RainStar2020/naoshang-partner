import areas from 'china-area-data'

/** Beijing, Tianjin, Shanghai, Chongqing. They have no city-agent tier. */
export const MUNICIPALITY_PROVINCE_CODES = Object.freeze(['110000', '120000', '310000', '500000'])
/** Placeholder city codes under those municipalities. City applications must not submit them. */
export const MUNICIPALITY_CITY_CODES = Object.freeze(['110100', '120100', '310100', '500100', '500200'])

export function isMunicipalityProvince(code) {
  return MUNICIPALITY_PROVINCE_CODES.includes(String(code || '').trim())
}

export function isMunicipalityCityCode(code) {
  return MUNICIPALITY_CITY_CODES.includes(String(code || '').trim())
}

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
