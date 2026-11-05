// Current client/business review timezone: Asia/Shanghai. Persist ISO instants, format only for display.
export function businessDateLabel(value){
  if(value==null||value==='')return ''
  let time
  if(typeof value==='number'&&Number.isFinite(value))time=value<1e12?value*1000:value
  else if(/^\d{10,13}$/.test(String(value).trim())){
    const raw=Number(String(value).trim())
    time=String(value).trim().length<=10?raw*1000:raw
  }else time=Date.parse(value)
  if(!Number.isFinite(time))return ''
  const local=new Date(time+8*60*60*1000),pad=part=>String(part).padStart(2,'0')
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth()+1)}-${pad(local.getUTCDate())} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}`
}

export function parseBusinessAmount(value){
  if(!/^\d+(\.\d{1,2})?$/.test(String(value)))throw new Error('金额最多输入两位小数')
  const amount=Number(Number(value).toFixed(2))
  if(!Number.isFinite(amount)||amount<=0)throw new Error('金额无效')
  return amount
}
