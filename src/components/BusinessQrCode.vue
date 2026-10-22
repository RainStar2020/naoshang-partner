<template><view class="qr-wrap"><view class="qr-code" :style="{padding:`${400/(rows.length+8)}%`}" aria-label="推广二维码"><view v-for="(row,r) in rows" :key="r" class="qr-row"><view v-for="(cell,c) in row" :key="c" class="qr-cell" :style="{background:cell?'#000':'#fff'}"/></view></view><button v-if="rows.length && showSave" class="secondary" @click="save">保存二维码</button><canvas :canvas-id="canvasId" :id="canvasId" class="qr-canvas"/></view></template>
<script setup>
import {ref,watch,getCurrentInstance} from 'vue'
import QRCode from 'qrcode/lib/core/qrcode'
const props=defineProps({value:String,showSave:{type:Boolean,default:true},posterTitle:String}),rows=ref([]),instance=getCurrentInstance(),canvasId=`qr${Date.now()}${Math.random().toString(36).slice(2)}`
watch(()=>props.value,value=>{try{if(!value){rows.value=[];return}const encoded=encodeURIComponent(value),bytes=[];for(let i=0;i<encoded.length;i++){if(encoded[i]==='%'){bytes.push(parseInt(encoded.slice(i+1,i+3),16));i+=2}else bytes.push(encoded.charCodeAt(i))}const matrix=QRCode.create([{data:new Uint8Array(bytes),mode:'byte'}],{errorCorrectionLevel:'M'}).modules,n=matrix.size;rows.value=Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>!!matrix.get(r,c)))}catch{rows.value=[]}},{immediate:true})
function save(){
 if(!rows.value.length)return
 const poster=Boolean(props.posterTitle),width=400,height=poster?520:400,n=rows.value.length,unit=Math.max(1,Math.floor((poster?300:400)/(n+8))),size=(n+8)*unit,ctx=uni.createCanvasContext(canvasId,instance.proxy)
 ctx.setFillStyle('#fff');ctx.fillRect(0,0,width,height)
 let left=0,top=0
 if(poster){ctx.setFillStyle('#4d89f7');ctx.fillRect(0,0,width,100);ctx.setFillStyle('#fff');ctx.setFontSize(26);ctx.fillText('分享码',24,42);ctx.setFontSize(20);ctx.fillText(props.posterTitle,24,77);left=(width-size)/2;top=120;ctx.setFillStyle('#888');ctx.setFontSize(15);ctx.fillText('扫码或注册填写分享码即可成功绑定',50,480)}
 ctx.setFillStyle('#000');rows.value.forEach((row,r)=>row.forEach((cell,c)=>{if(cell)ctx.fillRect(left+(c+4)*unit,top+(r+4)*unit,unit,unit)}))
 ctx.draw(false,()=>uni.canvasToTempFilePath({canvasId,width:poster?width:size,height:poster?height:size,destWidth:poster?width:size,destHeight:poster?height:size,success:result=>{
 // #ifdef H5
 const link=document.createElement('a');link.href=result.tempFilePath;link.download='share-code.png';link.click();
 // #endif
 // #ifndef H5
 uni.saveImageToPhotosAlbum({filePath:result.tempFilePath,fail:()=>uni.showToast({title:'保存失败，请检查相册权限',icon:'none'})});
 // #endif
 },fail:()=>uni.showToast({title:'图片导出失败',icon:'none'})},instance.proxy))
}
defineExpose({save})
</script>
<style scoped>.qr-wrap{margin:1.5em auto;text-align:center;max-width:20em}.qr-code{padding:1em;background:white;aspect-ratio:1;display:flex;flex-direction:column}.qr-row{display:flex;flex:1;min-height:0}.qr-cell{flex:1;min-width:0}.qr-canvas{position:fixed;left:-9999px;top:0;width:400px;height:520px}.qr-wrap>button{margin-top:1em}</style>
