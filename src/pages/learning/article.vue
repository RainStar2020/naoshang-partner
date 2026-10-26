<template><LessonReader ref="reader" :query="query"/></template>
<script setup>
import {ref} from 'vue'
import {onLoad,onHide,onUnload} from '@dcloudio/uni-app'
import LessonReader from '../../components/LessonReader.vue'
const query=ref(null),reader=ref(null)
onLoad(q=>{query.value=q})
onHide(()=>{void reader.value?.flush()})
onUnload(()=>{void reader.value?.flush()})
</script>
