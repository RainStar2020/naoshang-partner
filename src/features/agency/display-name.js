import areas from 'china-area-data'

export function agencyDisplayName(item = {}) {
  const type = String(item.agencyType || item.regionType || item.region_type || '').toUpperCase()
  if (type === 'STORE') return item.store_name || item.storeName || item.store?.store_name || item.store?.name || '单店代理'
  const code = String(item.regionCode || item.region_code || '').trim()
  const province = code.slice(0, 2) + '0000'
  const city = code.slice(0, 4) + '00'
  const name = type === 'PROVINCE' ? areas['86']?.[province]
    : type === 'CITY' ? areas[province]?.[city]
    : areas[city]?.[code]
  const suffix = type === 'PROVINCE' ? '省代' : type === 'CITY' ? '市代'
    : type === 'COUNTY' || type === 'DISTRICT' ? (name?.endsWith('县') ? '县代' : '区代') : ''
  return name && suffix ? name + suffix : item.regionLabel || item.label || '区域代理'
}
