<template>
  <view class="shop-page transfer-page">
    <BusinessPageHeader title="选择转入门店" />
    <view class="shop-body">
      <FeaturePageState :status="status" :error="error" @retry="load" />
      <template v-if="data">
        <view class="region-bar">
          <text>区域选择</text>
          <RegionPicker
            plain
            allow-all
            :levels="2"
            :label="regionLabel"
            :codes="regionCodes"
            @change="regionChanged"
          />
          <button
            v-if="regionCodes.length"
            class="region-clear"
            @click="clearRegion"
          >
            清除
          </button>
        </view>
        <view class="store-list">
          <button
            v-if="data.headquarters"
            class="store-card hq-card"
            @click="ask(data.headquarters)"
          >
            <view class="store-copy">
              <view class="store-name">{{
                data.headquarters.name || "总部服务"
              }}</view>
              <text class="store-meta">{{
                data.headquarters.description ||
                "当前地区没有可服务门店，可选择总部服务"
              }}</text>
            </view>
            <image
              class="chevron"
              src="/static/common/icon-chevron-right.png"
              mode="aspectFit"
            />
          </button>
          <button
            v-for="store in stores"
            :key="store.id"
            class="store-card"
            @click="ask(store)"
          >
            <image
              class="store-cover"
              :class="{ placeholder: !store.coverUrl }"
              :src="coverOf(store)"
              :mode="store.coverUrl ? 'aspectFill' : 'aspectFit'"
            />
            <view class="store-copy">
              <view class="store-name"
                >{{ store.name
                }}<text v-if="store.number" class="store-tag">{{
                  store.number
                }}</text></view
              >
              <text v-if="managerLabel(store)" class="store-meta"
                >店长信息：{{ managerLabel(store) }}</text
              >
              <text v-else class="store-meta">店长信息：暂无</text>
              <text class="store-meta">{{
                store.address || "地址待完善"
              }}</text>
            </view>
            <image
              class="chevron"
              src="/static/common/icon-chevron-right.png"
              mode="aspectFit"
            />
          </button>
          <EmptyState v-if="!stores.length" text="当前地区没有可服务门店" />
        </view>
      </template>
    </view>
    <view
      v-if="pending"
      class="confirm-mask"
      @click="!busy && (pending = null)"
    >
      <view
        class="confirm-dialog"
        role="dialog"
        aria-label="申请转店"
        @click.stop
      >
        <view>确定要申请转入该门店吗?</view>
        <view class="confirm-actions"
          ><button :disabled="busy" @click="submit">确定</button
          ><button :disabled="busy" @click="pending = null">取消</button></view
        >
      </view>
    </view>
  </view>
</template>
<script setup>
  import { computed, ref, watch } from "vue";
  import { onLoad } from "@dcloudio/uni-app";
  import { useAuth } from "../../composables/useAuth";
  import { useAsyncPage } from "../../composables/useAsyncPage";
  import {
    getTransferOptions,
    applyStoreTransfer,
  } from "../../services/training";
  import { commerceRequestKey } from "../../services/commerce";
  import BusinessPageHeader from "../../components/BusinessPageHeader.vue";
  import RegionPicker from "../../components/RegionPicker.vue";
  import FeaturePageState from "../../components/FeaturePageState.vue";
  import EmptyState from "../../components/EmptyState.vue";
  useAuth();
  const fallbackCover = "/static/common/icon-store.png";
  let contextId = "",
    memberId = "",
    key = "",
    fingerprint = "",
    regionReady = false;
  const regionNames = ref([]),
    regionCodes = ref([]),
    pending = ref(null),
    busy = ref(false);
  const regionLabel = computed(() => regionNames.value.join("") || "全部");
  const { data, status, error, load } = useAsyncPage(
    () => getTransferOptions(contextId, memberId),
    false,
  );
  // API regionCodes look like ["331002-S1"]; match selected province/city adcode prefix to the zip before "-".
  function storeZipCodes(store) {
    return (store?.regionCodes || [])
      .map((raw) => {
        const head = String(raw || "")
          .split("-")[0]
          .trim();
        const digits = head.replace(/\D/g, "");
        return digits || head;
      })
      .filter(Boolean);
  }
  function selectedZipPrefix(codes) {
    const list = (codes || []).map(String).filter(Boolean);
    if (!list.length) return "";
    const city = list[1]?.replace(/\D/g, "") || "";
    const province = list[0]?.replace(/\D/g, "") || "";
    if (city) return city.slice(0, 4);
    return province.slice(0, 2);
  }
  function storeMatchesRegion(store, codes) {
    const prefix = selectedZipPrefix(codes);
    if (!prefix) return true;
    const zips = storeZipCodes(store);
    if (zips.length) return zips.some((zip) => zip.startsWith(prefix));
    // Legacy mock shape: ["410000","410100","410103"]
    const legacy = store?.regionCodes || [];
    if (legacy.length && !String(legacy[0]).includes("-")) {
      return codes.every(
        (code, index) => String(legacy[index] || "") === String(code),
      );
    }
    return false;
  }
  const stores = computed(() => {
    const list = data.value?.stores || [];
    const codes = regionCodes.value.map(String).filter(Boolean).slice(0, 2);
    if (!codes.length) return list;
    if (!list.some((store) => (store.regionCodes || []).length)) return list;
    return list.filter((store) => storeMatchesRegion(store, codes));
  });
  function coverOf(store) {
    return store?.coverUrl || fallbackCover;
  }
  function managerLabel(store) {
    const name = store?.managerName || store?.manager || "";
    const phone = store?.phone || store?.contact || "";
    if (!name && !phone) return "";
    return phone ? `${name}/${phone}` : name;
  }
  function regionChanged(value) {
    regionReady = true;
    regionNames.value = [...(value.names || [])].slice(0, 2);
    regionCodes.value = [...(value.codes || [])].slice(0, 2);
    pending.value = null;
  }
  function clearRegion() {
    regionReady = true;
    regionNames.value = [];
    regionCodes.value = [];
    pending.value = null;
  }
  watch(data, (value) => {
    pending.value = null;
    if (regionReady || !value?.defaultRegion?.codes?.length) return;
    regionReady = true;
    // Transfer filter uses province + city only (frontend).
    regionNames.value = [...value.defaultRegion.names].slice(0, 2);
    regionCodes.value = [...value.defaultRegion.codes].slice(0, 2);
  });
  function ask(store) {
    if (busy.value) return;
    pending.value = store;
  }
  function goBack() {
    uni.navigateBack({
      fail: () =>
        uni.redirectTo({
          url: `/pages/members/detail?contextId=${encodeURIComponent(contextId)}&memberId=${encodeURIComponent(memberId)}&from=store`,
        }),
    });
  }
  function alertMessage(title, content) {
    return new Promise((resolve) =>
      uni.showModal({
        title,
        content,
        showCancel: false,
        confirmText: "确认",
        success: resolve,
        fail: resolve,
      }),
    );
  }
  function errorText(reason) {
    return (
      reason?.serverMessage || reason?.message || reason?.error || "提交失败"
    );
  }
  async function submit() {
    if (busy.value || !pending.value) return;
    const target = pending.value;
    const storeName = target.name || "该门店";
    busy.value = true;
    try {
      const reason = `转店申请：申请转入${storeName}`;
      const draft = { targetStoreId: target.id, reason };
      const value = JSON.stringify(draft);
      if (value !== fingerprint) {
        fingerprint = value;
        key = commerceRequestKey();
      }
      await applyStoreTransfer(contextId, memberId, draft, key);
      pending.value = null;
      await alertMessage("申请成功", `申请成功，等待${storeName}审核中。`);
      goBack();
    } catch (reason) {
      pending.value = null;
      await alertMessage("申请失败", errorText(reason));
    } finally {
      busy.value = false;
    }
  }
  onLoad((query) => {
    contextId = query.contextId || "";
    memberId = query.memberId || "";
    load();
  });
</script>
<style>
  @import "../../styles/commerce.css";
</style>
<style scoped>
  .transfer-page {
    max-width: 750px;
    margin: 0 auto;
    font-size: clamp(14px, 3.7vw, 16px);
  }
  .transfer-page button {
    margin: 0;
    padding: 0;
    background: none;
    color: inherit;
    line-height: inherit;
  }
  .transfer-page button::after {
    border: 0;
  }
  .region-bar {
    display: flex;
    align-items: center;
    gap: 0.55em;
    margin-bottom: 0.9em;
  }
  .region-bar > text {
    flex: none;
    padding: 0.4em 0.9em;
    border-radius: 2em;
    background: #3c4464;
    color: #d5dced;
    font-size: 0.9em;
    line-height: 1.4;
  }
  .region-bar :deep(picker) {
    min-width: 0;
    flex: 1;
  }
  .region-bar :deep(.region-input) {
    min-height: 2.3em;
    height: auto;
    padding: 0.4em 0.85em;
    border-radius: 2em;
    background: #3c4464;
    box-sizing: border-box;
  }
  .region-bar :deep(.region-input.plain) {
    padding: 0.4em 0.85em;
    background: #3c4464;
    border-radius: 2em;
  }
  .region-bar :deep(.region-input.plain > text) {
    flex: 1;
    min-width: 0;
    text-align: left;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .region-clear {
    flex: none;
    margin: 0;
    padding: 0.4em 0.85em;
    border-radius: 2em;
    background: #2f6fbf;
    color: #fff;
    font-size: 0.86em;
    line-height: 1.4;
  }
  .store-list {
    display: flex;
    flex-direction: column;
    gap: 0.7em;
  }
  .store-card {
    display: flex;
    align-items: center;
    gap: 0.7em;
    width: 100%;
    margin: 0;
    padding: 0.85em;
    box-sizing: border-box;
    border-radius: 0.75em;
    background: #353a59;
    text-align: left;
  }
  .hq-card {
    min-height: 4.6em;
  }
  .store-cover {
    width: 5.2em;
    height: 5.2em;
    flex: none;
    border-radius: 0.45em;
    background: #444b68;
    object-fit: cover;
  }
  .store-cover.placeholder {
    padding: 0.95em;
    box-sizing: border-box;
  }
  .store-copy {
    min-width: 0;
    flex: 1;
  }
  .store-name {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35em;
    font-weight: 700;
    line-height: 1.4;
  }
  .store-tag {
    padding: 0 0.45em;
    border-radius: 1em;
    background: linear-gradient(100deg, #00b7ff, #3157ff);
    font-size: 0.68em;
    font-weight: 700;
    line-height: 1.7;
  }
  .store-meta {
    display: block;
    margin-top: 0.28em;
    color: #b7c0d8;
    font-size: 0.75em;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
  .chevron {
    width: 1em;
    height: 1em;
    flex: none;
    opacity: 0.8;
  }
  .confirm-mask {
    position: fixed;
    z-index: 120;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5em;
    background: rgba(0, 0, 0, 0.72);
    box-sizing: border-box;
  }
  .confirm-dialog {
    width: 100%;
    max-width: 20em;
    padding: 1.5em 1.2em 1.1em;
    border-radius: 1em;
    background: #343c62;
    text-align: center;
  }
  .confirm-dialog > view:first-child {
    font-size: 1em;
    line-height: 1.6;
  }
  .confirm-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin-top: 1.2em;
  }
  .confirm-actions button {
    color: #57adff;
    font-size: 1em;
    line-height: 2;
  }
</style>
