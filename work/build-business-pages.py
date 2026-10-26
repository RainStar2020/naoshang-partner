from pathlib import Path
import json
p=Path('src/services/business-operations.js');s=p.read_text(encoding='utf-8-sig')
s=s.replace("upgrade:'/partner/upgrade-quotes','bind-store'", "upgrade:'/partner/upgrade-quotes',entitlement:'/partner/entitlement-quotes','bind-store'")
s=s.replace("upgrade:'/partner/upgrade-options','bind-store'", "upgrade:'/partner/upgrade-options',entitlement:'/partner/entitlement-options','bind-store'")
s=s.replace("if(kind==='withdraw')fields.push", "if(kind==='entitlement')fields.push(enumField('planId','年度权益套餐',[{value:'demo-annual',label:'演示年度权益套餐'}]))\n    if(kind==='withdraw')fields.push")
s=s.replace('targetAccountId:input.targetAccountId,quantity:', 'planId:input.planId,targetAccountId:input.targetAccountId,quantity:')
s=s.replace("if(kind==='withdraw'){\n      if", "if(kind==='entitlement'){if(input.planId!=='demo-annual')throw new Error('请选择演示年度套餐');amount=20000;details.push({label:'演示套餐费用',kind:'money',value:amount},{label:'权益状态',value:'未支付，不开通或续期权益'})}\n    if(kind==='withdraw'){\n      if")
s=s.replace("upgrade:'/partner/upgrades','bind-store'", "upgrade:'/partner/upgrades',entitlement:'/partner/entitlement-orders','bind-store'")
s=s.replace("if(kind==='quota-purchase')result=", "if(['quota-purchase','entitlement'].includes(kind))result=")
p.write_text(s,encoding='utf8')
p=Path('src/components/BusinessDashboard.vue');s=p.read_text(encoding='utf8').replace('<strong>','<text class="business-stat-value">').replace('</strong>','</text>');p.write_text(s,encoding='utf8')
p=Path('src/styles/business.css');s=p.read_text(encoding='utf8').replace('.business-stats strong{','.business-stats .business-stat-value{');p.write_text(s,encoding='utf8')
reports=[('wholesale','income','pages/partner/income','管理收益'),('wholesale','superior','pages/partner/superior','上级信息'),('wholesale','share','pages/partner/share','分享码'),('wholesale','global-awards','pages/partner/global-awards','全球奖'),('wholesale','promotion','pages/partner/promotion','晋升任务'),('wholesale','experience','pages/partner/experience','经验明细'),('wholesale','team','pages/partner/team','团队明细'),('wholesale','quota-ledger','pages/partner/quota-ledger','进货明细'),('wholesale','quota-transfers','pages/partner/quota-transfers','划转明细'),('wholesale','quota-batches','pages/partner/quota-batches','活动VIP明细'),('costore','income','pages/costore/income','合店收益'),('costore','card-dividends','pages/costore/card-dividends','会员卡分红'),('costore','promotion-dividends','pages/costore/promotion-dividends','合店推广分红'),('agency','team','pages/agency/team','区域团队'),('agency','income','pages/agency/income','代理收益')]
operations=[('quota-transfer','pages/partner/quota-transfer','划拨名额'),('quota-purchase','pages/partner/quota-purchase','购买VIP名额'),('upgrade','pages/partner/upgrade','开通/升级'),('entitlement','pages/partner/entitlement','年度权益'),('bind-store','pages/partner/bind-store','绑定门店'),('withdraw','pages/wallet/withdraw-apply','申请提现'),('allocation','pages/income/allocation','提点分配')]
more=[('BusinessIncomeDetail','pages/income/detail','收益详情'),('BusinessTeamDetail','pages/agency/team-detail','团队详情'),('BusinessWithdrawals','pages/wallet/withdrawals','提现记录'),('BusinessStore','pages/store/index','门店管理')]
routes=[]
def wrapper(component,path,title,attrs=''):
 target=Path('src')/(path+'.vue');target.parent.mkdir(parents=True,exist_ok=True)
 target.write_text(f'''<template><{component} ref="page" :page-query="query" {attrs}/></template>
<script setup>
import {{ref}} from 'vue'
import {{onLoad,onShow}} from '@dcloudio/uni-app'
import {{useAuth}} from '../../composables/useAuth'
import {component} from '../../components/{component}.vue'
useAuth();const page=ref(null),query=ref(null)
onLoad(options=>{{query.value=options}});onShow(()=>{{if(query.value)page.value?.refresh()}})
</script>
''',encoding='utf8');routes.append((path,title,False))
for module,tool,path,title in reports:wrapper('BusinessReport',path,title,f'module="{module}" tool-id="{tool}"')
for kind,path,title in operations:wrapper('BusinessOperation',path,title,f'kind="{kind}"')
for component,path,title in more:wrapper(component,path,title)
for module,path in [('','pages/partners/index'),('costore','pages/costore/index'),('agency','pages/agency/index')]:
 target=Path('src')/(path+'.vue');target.parent.mkdir(parents=True,exist_ok=True)
 target.write_text(f'''<template><BusinessDashboard ref="page" initial-module="{module}"/></template>
<script setup>
import {{ref}} from 'vue'
import {{onShow}} from '@dcloudio/uni-app'
import {{useAuth}} from '../../composables/useAuth'
import {{useAppTabBar}} from '../../composables/useAppTabBar'
import BusinessDashboard from '../../components/BusinessDashboard.vue'
useAuth();useAppTabBar();const page=ref(null)
onShow(()=>page.value?.refresh())
</script>
''',encoding='utf8');routes.append((path,{'':'联营','costore':'合店老板','agency':'区域代理'}[module],True))
p=Path('src/pages.json');doc=json.loads(p.read_text(encoding='utf-8-sig'))
for path,title,custom in routes:
 if any(item['path']==path for item in doc['pages']):continue
 style={'navigationBarTitleText':title,'navigationBarBackgroundColor':'#343a5b'}
 if custom:style['navigationStyle']='custom'
 doc['pages'].append({'path':path,'style':style})
p.write_text(json.dumps(doc,ensure_ascii=False,indent=2),encoding='utf8')
print('Registered routes:',len(doc['pages']))
