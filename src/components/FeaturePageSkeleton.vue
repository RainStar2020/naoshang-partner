<template>
  <view class="page-skeleton" :class="`page-skeleton-${variant}`" aria-hidden="true">
    <template v-if="variant === 'profile'">
      <view class="sk-row sk-user">
        <view class="sk-avatar" />
        <view class="sk-col">
          <view class="sk-line sk-line-lg" />
          <view class="sk-line sk-line-sm" />
        </view>
      </view>
      <view class="sk-card">
        <view class="sk-line sk-line-md" />
        <view class="sk-line sk-line-full" />
        <view class="sk-line sk-line-full" />
      </view>
      <view class="sk-card">
        <view class="sk-line sk-line-md" />
        <view class="sk-icons">
          <view v-for="n in 4" :key="n" class="sk-icon" />
        </view>
      </view>
      <view class="sk-card">
        <view class="sk-line sk-line-md" />
        <view class="sk-icons sk-icons-wide">
          <view v-for="n in 4" :key="n" class="sk-icon" />
        </view>
      </view>
    </template>
    <template v-else-if="variant === 'list'">
      <view v-for="n in 4" :key="n" class="sk-card sk-list-row">
        <view class="sk-line sk-line-md" />
        <view class="sk-line sk-line-full" />
        <view class="sk-line sk-line-sm" />
      </view>
    </template>
    <template v-else-if="variant === 'metrics'">
      <!-- 二级报表：摘要条 + 列表行 -->
      <view class="sk-card sk-metrics-strip">
        <view class="sk-metrics">
          <view v-for="n in 3" :key="n" class="sk-metric">
            <view class="sk-line sk-line-sm" />
            <view class="sk-line sk-line-lg" />
          </view>
        </view>
      </view>
      <view v-for="n in 3" :key="n" class="sk-card sk-list-row">
        <view class="sk-line sk-line-md" />
        <view class="sk-line sk-line-full" />
        <view class="sk-line sk-line-sm" />
      </view>
    </template>
    <template v-else-if="variant === 'dialog'">
      <!-- 弹窗/Overlay 内容区：标题栏已在外层，这里只占内容 -->
      <view class="sk-card sk-dialog-card">
        <view class="sk-row sk-identity">
          <view class="sk-avatar" />
          <view class="sk-col">
            <view class="sk-line sk-line-lg" />
            <view class="sk-line sk-line-sm" />
          </view>
        </view>
        <view class="sk-line sk-line-full" />
        <view class="sk-line sk-line-md" />
        <view class="sk-metrics sk-dialog-metrics">
          <view v-for="n in 2" :key="n" class="sk-metric">
            <view class="sk-line sk-line-sm" />
            <view class="sk-line sk-line-lg" />
          </view>
        </view>
      </view>
    </template>
    <template v-else-if="variant === 'dashboard-body' || variant === 'dashboard-benefits'">
      <!-- 壳已出身份/等级后：占位尚未 ready 的下半区 -->
      <template v-if="variant === 'dashboard-body'">
        <view class="sk-tools">
          <view v-for="n in 4" :key="n" class="sk-tool">
            <view class="sk-icon" />
            <view class="sk-line sk-line-sm" />
          </view>
        </view>
        <view class="sk-metrics">
          <view v-for="n in 3" :key="n" class="sk-metric">
            <view class="sk-line sk-line-sm" />
            <view class="sk-line sk-line-lg" />
          </view>
        </view>
      </template>
      <view class="sk-card sk-benefits">
        <view class="sk-line sk-line-md sk-center" />
        <view class="sk-line sk-line-full" />
        <view class="sk-line sk-line-full" />
        <view class="sk-line sk-line-md" />
      </view>
    </template>
    <template v-else>
      <!-- dashboard: identity → metrics → tools，对齐工作台主区顺序 -->
      <view class="sk-row sk-identity">
        <view class="sk-avatar" />
        <view class="sk-col">
          <view class="sk-line sk-line-lg" />
          <view class="sk-line sk-line-sm" />
        </view>
        <view class="sk-chip" />
      </view>
      <view class="sk-card sk-rank">
        <view class="sk-line sk-line-sm" />
        <view class="sk-line sk-line-xl" />
        <view class="sk-line sk-line-md" />
      </view>
      <view class="sk-metrics">
        <view v-for="n in 3" :key="n" class="sk-metric">
          <view class="sk-line sk-line-sm" />
          <view class="sk-line sk-line-lg" />
        </view>
      </view>
      <view class="sk-tools">
        <view v-for="n in 4" :key="n" class="sk-tool">
          <view class="sk-icon" />
          <view class="sk-line sk-line-sm" />
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'dashboard',
    validator: value => ['dashboard', 'dashboard-body', 'dashboard-benefits', 'list', 'metrics', 'dialog', 'profile'].includes(value),
  },
})
</script>

<style scoped>
.page-skeleton {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  padding: 0.9em 1.05em 1.4em;
  color: transparent;
}
.page-skeleton-profile {
  padding: 0.2em 0.2em 1.4em;
}
.sk-row {
  display: flex;
  align-items: center;
  gap: 0.75em;
}
.sk-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45em;
}
.sk-avatar {
  width: 3.5em;
  height: 3.5em;
  flex: none;
  border-radius: 50%;
  background-color: #2a3148;
}
.sk-chip {
  width: 3.2em;
  height: 2.4em;
  flex: none;
  border-radius: 0.45em;
  background-color: #2a3148;
}
.sk-card {
  margin-top: 0.85em;
  padding: 1em;
  border-radius: 0.85em;
  background: rgba(42, 49, 72, 0.72);
  display: flex;
  flex-direction: column;
  gap: 0.55em;
}
.sk-rank {
  min-height: 6.5em;
  justify-content: center;
}
.sk-benefits {
  min-height: 10em;
  margin-top: 1em;
}
.sk-center {
  align-self: center;
}
.page-skeleton-dashboard-body,
.page-skeleton-dashboard-benefits {
  padding-top: 0.35em;
}
.sk-metrics-strip {
  margin-bottom: 0.55em;
  padding: 0.85em 0.5em;
}
.sk-metrics-strip .sk-metrics {
  margin: 0;
}
.page-skeleton-dialog {
  padding: 0.4em 0.2em 0.8em;
}
.sk-dialog-card {
  padding: 0.9em 0.85em;
}
.sk-dialog-metrics {
  margin-top: 0.75em;
}
.sk-list-row {
  min-height: 5.2em;
}
.sk-metrics {
  display: flex;
  gap: 0.55em;
  margin-top: 0.9em;
}
.sk-metric {
  flex: 1;
  min-width: 0;
  padding: 0.75em 0.4em;
  border-radius: 0.65em;
  background: rgba(42, 49, 72, 0.72);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45em;
}
.sk-tools {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.55em;
  margin-top: 1em;
}
.sk-tool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4em;
}
.sk-icons {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.55em;
  margin-top: 0.35em;
}
.sk-icons-wide {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.sk-icon {
  width: 2.2em;
  height: 2.2em;
  border-radius: 0.55em;
  background-color: #343a5b;
  margin: 0 auto;
}
.sk-line {
  height: 0.72em;
  border-radius: 999px;
  background-color: #343a5b;
}
.sk-line-sm { width: 42%; }
.sk-line-md { width: 58%; }
.sk-line-lg { width: 72%; }
.sk-line-xl { width: 48%; height: 1.05em; }
.sk-line-full { width: 100%; }
.sk-user { margin-bottom: 0.35em; }
.sk-identity { padding: 0.35em 0 0.15em; }
.sk-metric .sk-line-sm { width: 55%; }
.sk-metric .sk-line-lg { width: 40%; height: 1em; }
.sk-tool .sk-line-sm { width: 70%; }
</style>
