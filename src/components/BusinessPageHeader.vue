<template><view class="business-page-header"><button role="button" aria-label="返回" @click="back"><image src="/static/common/icon-back.png" mode="aspectFit"/></button><text>{{title}}</text></view></template>
<script setup>
const props=defineProps({title:String,fallback:{type:String,default:'/pages/partners/index'}})
function back(){
  const pages=getCurrentPages(),previous=pages[pages.length-2]?.route
  if(previous&&!['','/','pages/login/index','pages/register/index','pages/forgot-password/index'].includes(previous))uni.navigateBack({fail:()=>uni.switchTab({url:props.fallback})})
  else uni.switchTab({url:props.fallback})
}
</script>
<style scoped>.business-page-header{display:flex;align-items:center;gap:1em;min-height:3.2em;padding:calc(.6em + var(--status-bar-height,0px)) 6em .6em 1em;background:#343a5b;color:#fff;position:sticky;top:0;z-index:80}.business-page-header button{background:none;padding:0;margin:0;line-height:1;flex-shrink:0}.business-page-header image{height:1.8em;width:1.8em}.business-page-header>text{font-family:var(--font-page-title);font-size:1.1em;line-height:1.6;font-weight:700;min-width:0;overflow-wrap:anywhere}</style>
