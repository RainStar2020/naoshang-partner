import areas from 'china-area-data'

const book = areas?.['86'] ? areas : areas?.default || areas

function pickRegionCode(item = {}) {
  const fields = [item.regionCode, item.region_code, item.regionLabel, item.region_label, item.label, item.detail]
  for (const value of fields) {
    const match = String(value ?? '').match(/\d{6}/)
    if (match) return match[0]
  }
  return ''
}

export function agencyDisplayName(item = {}) {
  const type = String(item.agencyType || item.regionType || item.region_type || '').toUpperCase()
  if (type === 'STORE') return item.store_name || item.storeName || item.store?.store_name || item.store?.name || '单店代理'
  const code = pickRegionCode(item)
  const province = code.slice(0, 2) + '0000'
  const city = code.slice(0, 4) + '00'
  const name = type === 'PROVINCE' ? book['86']?.[province]
    : type === 'CITY' ? book[province]?.[city]
    : type === 'COUNTY' || type === 'DISTRICT' ? book[city]?.[code]
    : ''
  const suffix = type === 'PROVINCE' ? '省代' : type === 'CITY' ? '市代'
    : type === 'COUNTY' || type === 'DISTRICT' ? (name?.endsWith('县') ? '县代' : '区代') : ''
  if (name && suffix) return name + suffix
  const fallback = String(item.regionLabel || item.label || '').trim()
  if (fallback && !/^\d{6}$/.test(fallback)) return fallback
  return suffix === '县代' || suffix === '区代' ? '区县代理' : suffix || '区域代理'
}
