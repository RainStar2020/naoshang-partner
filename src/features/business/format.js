// Current client/business review timezone: Asia/Shanghai. Persist ISO instants, format only for display.
export function businessDateLabel(value){
  const time=Date.parse(value)
  if(!Number.isFinite(time))return ''
  const local=new Date(time+8*60*60*1000),pad=value=>String(value).padStart(2,'0')
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth()+1)}-${pad(local.getUTCDate())} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}`
}

export function parseBusinessAmount(value){
  if(!/^\d+(\.\d{1,2})?$/.test(String(value)))throw new Error('金额最多输入两位小数')
  const amount=Number(Number(value).toFixed(2))
  if(!Number.isFinite(amount)||amount<=0)throw new Error('金额无效')
  return amount
}
