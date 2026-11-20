const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/components/WholesaleReport.vue','utf8');
function channels(summary){
 const code=source.slice(source.indexOf('  const incomeChannelLabels ='),source.indexOf('  const incomeChannel ='));
 return vm.runInNewContext(code+';JSON.stringify(incomeChannels.value)',{computed:fn=>({get value(){return fn()}}),report:{value:{incomeSummary:summary}},items:{value:[]},incomeMetric:()=>undefined,incomeChannel:()=> '积分'});
}
test('income header uses authoritative summary including zero amounts',()=>{
 const summary=[{key:'direct',label:'直推奖',amount:0},{key:'repurchase',label:'运维补贴',amount:167.52},{key:'parity',label:'孵化补贴',amount:114}];
 assert.deepEqual(JSON.parse(channels(summary)).map(x=>x.value),[0,167.52,114]);
});
