<template>
  <view class="business-page-shell feature-page"
    ><BusinessPageHeader :title="heading" /><BusinessStore
      ref="page"
      :page-query="query"
  /></view>
</template>
<script setup>
  import { computed, ref } from "vue";
  import BusinessPageHeader from "../../components/BusinessPageHeader.vue";
  import { onLoad } from "@dcloudio/uni-app";
  import { useAuth } from "../../composables/useAuth";
  import { useBusinessReturn } from "../../composables/useBusinessReturn";
  import { useFreshOnShow } from "../../composables/useFreshOnShow";
  import BusinessStore from "../../components/BusinessStore.vue";
  useAuth();
  useBusinessReturn();
  const page = ref(null),
    query = ref(null);
  let initialShow = true;
  const heading = computed(
    () =>
      ({
        members: "门店用户",
        approvals: "门店审批",
        info: "门店信息",
        edit: "编辑门店信息",
      })[query.value?.view] || "门店管理",
  );
  onLoad((options) => {
    query.value = options;
  });
  useFreshOnShow(() => {
    // The query watcher owns the first load. Skip only the page's initial
    // onShow so it cannot issue a duplicate request before that load finishes.
    if (initialShow) {
      initialShow = false;
      return null;
    }
    if (!query.value) return null;
    return (opts) => page.value?.refresh?.(opts);
  });
</script>

<style>
  .business-page-shell {
    min-height: 100vh;
    background: #272c47;
    font-size: clamp(14px, 3.7vw, 16px);
  }
  .business-page-shell > .account-page {
    min-height: calc(100vh - 3.2em);
  }
</style>
