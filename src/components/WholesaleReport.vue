<template>
  <view
    class="wholesale-ui"
    :class="{
      'wh-overlay': overlay,
      'wh-promotion-overlay': overlay && toolId === 'promotion',
    }"
    @click="overlay && emit('close')"
  >
    <view
      :class="
        overlay
          ? [
              'wh-dialog',
              `wh-dialog-${toolId}`,
              toolId === 'superior' && report?.superior
                ? 'wh-superior-card'
                : '',
            ]
          : 'wh-body'
      "
      @click.stop
    >
      <view v-if="overlay" class="wh-dialog-head"
        >{{ titles[toolId]
        }}<button
          role="button"
          class="wh-close"
          aria-label="关闭弹窗"
          @click="emit('close')"
        >
          <image src="/static/common/icon-close.png" mode="aspectFit" /></button
      ></view>
      <FeaturePageState :status="status" :error="error" @retry="load" />
      <template v-if="status === 'ready' && report">
        <template v-if="toolId === 'superior'">
          <template v-if="report.superior"
            ><view class="wh-person wh-card wh-superior-person"
              ><view class="wh-avatar"
                ><image
                  v-if="report.superior.avatarUrl"
                  :src="report.superior.avatarUrl"
                  mode="aspectFill"
                /><text v-else>{{
                  report.superior.name?.slice(0, 1)
                }}</text></view
              ><view
                ><view class="wh-superior-name"
                  >{{ report.superior.name }}
                  <text class="wh-tag">{{
                    report.superior.levelLabel || "合伙人"
                  }}</text></view
                ><view class="wh-muted"
                  >联系方式：{{ report.superior.phone || "—" }}
                  <button
                    v-if="report.superior.phone"
                    class="wh-copy"
                    aria-label="复制联系方式"
                    @click="copy(report.superior.phone)"
                  >
                    <image
                      src="/static/common/icon-copy.png"
                      mode="aspectFit"
                    /></button></view></view></view
          ></template>
          <template v-else
            ><view class="wh-section-heading wh-center">填写上级邀请码</view
            ><input
              v-model="superiorCode"
              class="wh-input"
              maxlength="64"
              placeholder="请输入上级邀请码"
            /><text v-if="superiorError" class="wh-error">{{
              superiorError
            }}</text
            ><view class="wh-confirm"
              ><button
                class="wh-confirm-cancel"
                :disabled="bindingSuperior"
                @click="emit('close')"
              >
                取消</button
              ><button
                class="wh-confirm-ok"
                :disabled="bindingSuperior"
                @click="submitSuperior"
              >
                {{ bindingSuperior ? "提交中…" : "确定" }}
              </button></view
            ></template
          >
        </template>
        <template v-else-if="toolId === 'share'">
          <view class="wh-share-card"
            ><view class="wh-share-head"
              ><text class="wh-share-mark" aria-hidden="true">FenXiangMa</text
              ><text>分享码</text
              ><button class="wh-invite-code" @click="copy(report.inviteCode)">
                {{ report.inviteCode }}
                <image
                  src="/static/common/icon-copy.png"
                  mode="aspectFit"
                /></button></view
            ><view class="wh-share-body"
              ><image
                v-if="report.qrUrl"
                :src="report.qrUrl"
                mode="aspectFit"
                class="wh-share-qr"
              /><BusinessQrCode
                v-else-if="isMock && report.localPayload"
                ref="qr"
                :value="report.localPayload"
                :show-save="false"
                :poster-title="report.inviteCode"
              /><EmptyState v-else text="暂无分享码" /><text
                >扫码或注册填写分享码即可成功绑定</text
              ></view
            ></view
          >
          <button
            v-if="report.qrUrl || report.localPayload"
            class="wh-primary wh-pill wh-share-save"
            @click="saveShare"
          >
            保存图片</button
          ><button
            v-if="overlay"
            role="button"
            class="wh-share-close"
            aria-label="关闭分享码"
            @click="emit('close')"
          >
            <image
              src="/static/common/icon-close-circle.png"
              mode="aspectFit"
            />
          </button>
        </template>
        <template v-else-if="toolId === 'promotion' && report.promotion">
          <view class="wh-upgrade-module">
            <view class="wh-upgrade-before">
              <text class="wh-upgrade-tab wh-upgrade-tab-before">升级前</text>
              <text class="wh-upgrade-title wh-upgrade-title-before">{{
                report.promotion.beforeName
              }}</text>
              <view class="wh-upgrade-dashed wh-upgrade-dashed-before" />
            </view>
            <view class="wh-upgrade-after">
              <svg
                class="wh-upgrade-after-shape"
                viewBox="0 0 354 266"
                aria-hidden="true"
              >
                <defs>
                  <radialGradient id="whUpgradeBg" cx="50%" cy="0" r="130%">
                    <stop offset="0" stop-color="#43331F" />
                    <stop offset=".38" stop-color="#2A1F12" />
                    <stop offset=".75" stop-color="#18110A" />
                    <stop offset="1" stop-color="#100B06" />
                  </radialGradient>
                  <linearGradient
                    id="whUpgradeBorder"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0" stop-color="#EBCB95" />
                    <stop offset=".5" stop-color="#C79E65" />
                    <stop offset="1" stop-color="#A87F4A" />
                  </linearGradient>
                </defs>
                <path
                  d="M26 0 H328 A26 26 0 0 1 354 26 V246 A20 20 0 0 1 334 266 H26 A20 20 0 0 1 0 246 V242.6 A47 47 0 0 0 0 149.4 V26 A26 26 0 0 1 26 0 Z"
                  fill="url(#whUpgradeBg)"
                  stroke="url(#whUpgradeBorder)"
                  stroke-width="2"
                />
              </svg>
              <view class="wh-upgrade-after-content">
                <text class="wh-upgrade-tab wh-upgrade-tab-after">升级后</text>
                <text class="wh-upgrade-title wh-upgrade-title-after"
                  ><text class="wh-upgrade-title-emph">{{
                    rankShort(report.promotion.afterName)
                  }}</text
                  ><text
                    v-if="rankHasPartner(report.promotion.afterName)"
                    class="wh-upgrade-title-suffix"
                    >合伙人</text
                  ></text
                >
                <view class="wh-upgrade-dashed wh-upgrade-dashed-after" />
              </view>
            </view>
            <view class="wh-upgrade-glow" />
            <svg
              class="wh-upgrade-arrow"
              viewBox="0 0 96 120"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id="whUpgradeArrow"
                  x1="0"
                  y1="1"
                  x2=".6"
                  y2="0"
                >
                  <stop offset="0" stop-color="#FACD9C" />
                  <stop offset=".45" stop-color="#F5A75F" />
                  <stop offset="1" stop-color="#ED8033" />
                </linearGradient>
              </defs>
              <path
                d="M58 2 L94 42 L74 42 C74 66 68 84 52 97 C42 105 28 111 10 115 C22 99 30 84 34 66 C36 58 37 50 37 42 L24 42 Z"
                fill="url(#whUpgradeArrow)"
              />
            </svg>
            <text class="wh-upgrade-benefits wh-upgrade-benefits-before"
              ><text class="wh-upgrade-benefits-num">{{
                report.promotion.beforeQuota
              }}</text
              >项会员权益</text
            >
            <text class="wh-upgrade-benefits wh-upgrade-benefits-after"
              ><text class="wh-upgrade-benefits-num">{{
                report.promotion.afterQuota
              }}</text
              >项会员权益</text
            >
          </view>
          <view class="wh-promotion-switch" role="tablist" aria-label="晋升方式"
            ><button
              :class="{ active: promotionTab === 'difference' }"
              @click="promotionTab = 'difference'"
            >
              介绍人名额升级</button
            ><button
              :class="{ active: promotionTab === 'task' }"
              @click="promotionTab = 'task'"
            >
              推广达标免费晋升
            </button></view
          >
          <template v-if="promotionTab === 'difference'"
            ><view class="wh-promotion-note"
              >您当前是{{ report.promotion.beforeName }}，可通过补差价升级，{{
                rankShort(report.promotion.afterName)
              }}标准价{{ yuan(upgradeQuote.standard) }}，需补差价{{
                yuan(upgradeQuote.difference)
              }}</view
            ><view class="wh-price-lines"
              ><view
                ><text>已缴纳合伙人费用</text
                ><text>¥{{ money(upgradeQuote.paid) }}</text></view
              ><view
                ><text>{{ rankShort(report.promotion.afterName) }}标准价</text
                ><text>¥{{ money(upgradeQuote.standard) }}</text></view
              ><view
                ><text>升级需补差价</text
                ><text>¥{{ money(upgradeQuote.difference) }}</text></view
              ></view
            ></template
          >
          <template v-else
            ><view class="wh-promotion-note wh-promotion-task-note">{{
              promotionTaskNote
            }}</view
            ><view class="wh-promotion-progress"
              ><view
                ><text>VIP推广进度</text
                ><view
                  >{{ report.promotion.progress }}/{{
                    report.promotion.target
                  }}</view
                ></view
              ><view
                ><text>任务状态</text
                ><view>{{ promotionStatusLabel }}</view></view
              ></view
            ></template
          >
          <text v-if="promotionError" class="wh-error">{{
            promotionError
          }}</text
          ><button
            v-if="promotionTab === 'task' && !promotionExpired"
            class="wh-primary wh-pill wh-promotion-claim"
            :disabled="claiming || !promotionCanClaim"
            @click="claimPromotion"
          >
            {{ claiming ? "提交中…" : "申请晋升" }}
          </button>
        </template>
        <template v-else-if="toolId === 'team'">
          <view
            v-for="person in items"
            :key="person.id"
            class="wh-card wh-team-card"
          >
            <view class="wh-team-head"
              ><view class="wh-team-avatar"
                ><view v-if="person.avatarUrl" class="wh-avatar"
                  ><image :src="person.avatarUrl" mode="aspectFill" /></view
                ><view v-else class="wh-avatar">{{
                  person.name?.slice(0, 1)
                }}</view
                ><text class="wh-tag">{{
                  person.tagLabel || person.levelLabel
                }}</text></view
              ><view class="wh-team-info"
                ><view class="wh-row"
                  ><view class="wh-team-name">{{ person.name }}</view
                  ><text class="wh-muted"
                    >{{ date(person.joinedAt).slice(0, 10) }}加入</text
                  ></view
                ><view class="wh-team-tags"
                  ><text
                    ><text class="wh-team-label">ID</text>
                    {{ person.displayId }}</text
                  ><text
                    ><text class="wh-team-label">手机号</text>
                    {{ person.phone || "—" }}</text
                  ></view
                ><view v-if="person.storeId" class="wh-team-store"
                  ><text class="wh-team-label">门店</text>
                  {{ person.storeName }}</view
                ></view
              ></view
            >
            <view
              v-if="person.performance?.length"
              class="wh-stats-grid wh-team-stats"
              ><view class="wh-row wh-team-stats-head"
                ><text>业绩统计</text
                ><text
                  >剩余<text class="wh-blue">{{ person.quotaRemaining }}个</text
                  >VIP名额</text
                ></view
              ><view class="wh-team-perf"
                ><view class="wh-team-perf-total"
                  ><view
                    v-for="metric in teamPerf(person.performance).totals"
                    :key="metric.label"
                    ><text class="wh-team-label">{{ metric.label }}</text
                    ><view class="wh-team-perf-value">{{
                      format(metric.value, metric.kind)
                    }}</view></view
                  ></view
                ><view class="wh-team-perf-side"
                  ><view
                    v-for="(pair, index) in teamPerf(person.performance).pairs"
                    :key="index"
                    class="wh-team-perf-pair"
                    ><view
                      v-for="(metric, metricIndex) in pair"
                      :key="metric.label"
                      ><view
                        v-if="metricIndex"
                        class="wh-team-perf-divider"
                        aria-hidden="true"
                      /><text class="wh-team-label">{{ metric.label }}</text
                      ><view class="wh-team-perf-value">{{
                        format(metric.value, metric.kind)
                      }}</view></view
                    ></view
                  ></view
                ></view
              ></view
            >
            <view class="wh-row wh-team-actions"
              ><button
                v-if="!person.storeId && can('bind-store')"
                class="wh-primary wh-pill"
                @click="operation('bind-store', person.id)"
              >
                绑定门店</button
              ><template v-else
                ><button
                  v-if="person.performance?.length && can('quota-transfer')"
                  class="wh-pill wh-outline"
                  @click="operation('quota-transfer', person.id)"
                >
                  划拨名额</button
                ><button
                  v-if="can('upgrade')"
                  class="wh-primary wh-pill"
                  @click="operation('upgrade', person.id)"
                >
                  设置等级
                </button></template
              ></view
            >
          </view>
        </template>
        <template v-else-if="toolId === 'quota-ledger'">
          <view class="wh-card wh-stock-summary"
            ><view class="wh-split"
              ><view
                ><text>剩余标准VIP</text
                ><view>{{ report.standardRemaining ?? "—" }}个</view></view
              ><view
                ><text>剩余活动VIP</text
                ><view>{{ report.activityRemaining ?? "—" }}个</view></view
              ></view
            ><view class="wh-row wh-stock-buttons"
              ><button
                class="wh-secondary wh-pill"
                @click="open('quota-batches')"
              >
                活动VIP明细</button
              ><button
                v-if="can('quota-purchase')"
                class="wh-primary wh-pill"
                @click="operation('quota-purchase')"
              >
                立即购买
              </button></view
            ></view
          >
          <WholesaleRecordCard
            v-for="item in items"
            :key="item.id"
            :title="item.title"
            :caption="`时间：${date(item.createdAt)}`"
            :amount="`+${item.quantity}`"
            accent
          />
        </template>
        <template v-else-if="toolId === 'quota-batches'"
          ><view
            v-for="item in items"
            :key="item.id"
            class="wh-card wh-batch-card"
            ><view>{{ item.title }}</view
            ><text class="wh-muted"
              >{{ date(item.grantedAt) }}获得 /
              永久有效，不可转让、不可退款</text
            ><WholesaleStatSplit divided :items="batchStats(item)" /><view
              v-if="item.reserved"
              class="wh-muted wh-batch-reserved"
              >待支付预留：{{ item.reserved }}个</view
            ></view
          ></template
        >
        <template v-else-if="toolId === 'quota-transfers'">
          <WholesaleRecordCard
            v-for="item in items"
            :key="item.id"
            :title="item.title"
            :amount="String(item.quantity)"
            accent
            :fields="transferFields(item)"
          />
        </template>
        <template v-else-if="toolId === 'experience'">
          <view class="wh-experience-summary wh-muted"
            >累计业务推广{{
              report.promotionExperience ?? "—"
            }}经验值，购买产品{{ report.productExperience ?? "—" }}经验值</view
          ><view class="wh-tabs"
            ><button
              :class="{ active: filter !== 'products' }"
              @click="changeFilter('promotion')"
            >
              业务推广</button
            ><button
              :class="{ active: filter === 'products' }"
              @click="changeFilter('products')"
            >
              购买产品
            </button></view
          >
          <WholesaleRecordCard
            v-for="item in items"
            :key="item.id"
            :kicker="item.phone ? `${item.name}/${item.phone}` : item.name"
            :title="item.title"
            :caption="date(item.createdAt)"
            :amount="`+${item.amount}`"
            badge="经验值"
            ><WholesaleStatSplit
              v-if="item.initialLevel"
              divided
              :items="[
                { label: '初始等级', value: item.initialLevel },
                { label: '消耗VIP名额', value: `${item.quotaUsed ?? '—'}个` },
              ]"
          /></WholesaleRecordCard>
        </template>
        <template v-else-if="toolId === 'global-awards'">
          <view class="wh-global-summary"
            ><picker
              mode="date"
              fields="month"
              :value="month"
              @change="changeMonth"
              ><view class="wh-center"
                >{{ monthTitle(month) }}
                <image
                  class="wh-month-arrow"
                  src="/static/common/icon-chevron-right.png"
                  mode="aspectFit" /></view></picker
            ><view class="wh-muted wh-center">{{
              report.eligibilityLabel
            }}</view
            ><view
              v-if="report.eligibilityNote"
              class="wh-muted wh-center wh-eligibility-note"
              >{{ report.eligibilityNote }}</view
            ><view class="wh-metrics"
              ><view v-for="metric in report.metrics" :key="metric.label"
                ><text>{{ metric.label }}</text
                ><view>{{ show(metric.value, metric.kind) }}</view></view
              ></view
            ><view class="wh-split wh-summary-four wh-divided"
              ><view v-for="metric in report.summary || []" :key="metric.label"
                ><text>{{ metric.label }}</text
                ><view>{{ show(metric.value, metric.kind) }}</view></view
              ></view
            ></view
          ><view class="wh-table-frame"
            ><scroll-view scroll-x class="wh-table-scroll"
              ><view class="wh-table"
                ><view class="wh-tr head"
                  ><text
                    v-for="column in report.columns"
                    :key="column.key"
                    class="wh-td"
                    >{{ column.label }}</text
                  ></view
                ><view v-for="item in items" :key="item.id" class="wh-tr"
                  ><text
                    v-for="column in report.columns"
                    :key="column.key"
                    class="wh-td"
                    >{{ show(item[column.key], column.kind) }}</text
                  ></view
                ></view
              ></scroll-view
            ></view
          >
        </template>
        <template v-else-if="toolId === 'income'">
          <view class="wh-income-top"
            ><view class="wh-row wh-income-head"
              ><view
                ><text class="wh-muted">可提现金额</text
                ><view class="wh-title"
                  >¥{{ money(report.available) }}</view
                ></view
              ><view class="wh-row wh-income-actions"
                ><button
                  v-if="canWallet('read')"
                  class="wh-secondary wh-pill"
                  @click="wallet('withdrawals')"
                >
                  提现记录</button
                ><button
                  v-if="canWallet('withdraw')"
                  class="wh-primary wh-pill"
                  @click="wallet('withdraw-apply')"
                >
                  申请提现
                </button></view
              ></view
            ><view class="wh-stats-grid wh-metrics"
              ><view v-for="metric in report.metrics" :key="metric.label"
                ><text>{{ metric.label }}</text
                ><view>{{ show(metric.value, metric.kind) }}</view></view
              ></view
            ></view
          ><view class="wh-section-heading">收益明细</view>
          <WholesaleRecordCard
            v-for="item in items"
            :key="item.id"
            :kicker="item.sourceName"
            :title="item.title"
            :caption="date(item.createdAt)"
            :amount="signedAmount(item.amount)"
            :badge="item.channel || '收益'"
            @click="openIncome(item)"
            ><WholesaleStatSplit
              v-if="item.details?.length"
              divided
              :items="
                item.details.map((detail) => ({
                  label: detail.label,
                  value: show(detail.value, detail.kind),
                }))
              "
          /></WholesaleRecordCard>
        </template>
        <EmptyState
          v-if="
            !items.length &&
            !['promotion', 'superior', 'share', 'global-awards'].includes(
              toolId,
            )
          "
          text="暂无记录"
        />
        <button
          v-if="hasMore"
          class="wh-secondary wh-pill"
          :disabled="loadingMore"
          @click="more"
        >
          {{ loadingMore ? "加载中…" : "加载更多" }}</button
        ><text v-if="moreError" class="wh-error">{{ moreError }}</text>
      </template>
    </view>
  </view>
</template>
<script setup>
  import { computed, ref, watch, onUnmounted } from "vue";
  import { config } from "../config";
  import { businessPreview } from "../features/business/catalog";
  import { partnerUpgradeQuote } from "../features/business/account-rank";
  import { money, percent } from "../features/exclusive/format";
  import { businessDateLabel as date } from "../features/business/format";
  import {
    getBusinessContext,
    getBusinessReport,
    claimBusinessPromotion,
    bindBusinessSuperior,
  } from "../services/business";
  import { useAsyncPage } from "../composables/useAsyncPage";
  import BusinessQrCode from "./BusinessQrCode.vue";
  import FeaturePageState from "./FeaturePageState.vue";
  import EmptyState from "./EmptyState.vue";
  import WholesaleRecordCard from "./WholesaleRecordCard.vue";
  import WholesaleStatSplit from "./WholesaleStatSplit.vue";
  const props = defineProps({
      toolId: String,
      pageQuery: Object,
      overlay: Boolean,
    }),
    emit = defineEmits(["close"]);
  const context = ref(null),
    items = ref([]),
    hasMore = ref(false),
    loadingMore = ref(false),
    moreError = ref(""),
    filter = ref("promotion"),
    promotionTab = ref("difference"),
    qr = ref(null),
    isMock = config.useMock;
  const titles = {
      superior: "上级信息",
      promotion: "升级合伙人",
      share: "分享码",
    },
    month = ref(new Date().toISOString().slice(0, 7));
  let cursor = null,
    epoch = 0;
  const {
    data: report,
    status,
    error,
    load,
  } = useAsyncPage(async () => {
    const ctx = await getBusinessContext(
      "wholesale",
      props.pageQuery?.contextId,
    );
    context.value = ctx;
    return getBusinessReport("wholesale", props.toolId, ctx.id, {
      month: month.value,
      filter: filter.value,
    });
  }, false);
  watch(
    () => props.pageQuery,
    (q) => {
      if (q) load();
    },
    { immediate: true },
  );
  watch(status, (s) => {
    if (s === "loading") {
      ++epoch;
      loadingMore.value = false;
      moreError.value = "";
    }
  });
  watch(report, (value) => {
    if (value) {
      items.value = value.items;
      cursor = value.nextCursor;
      hasMore.value = value.hasMore;
    }
  });
  const format = (value, kind) =>
    value == null
      ? "—"
      : kind === "money"
        ? money(value)
        : kind === "percent"
          ? percent(value)
          : value;
  const show = (value, kind) =>
    value == null
      ? "—"
      : kind === "money"
        ? `¥${money(value)}`
        : format(value, kind);
  const monthNames = [
    "",
    "一",
    "二",
    "三",
    "四",
    "五",
    "六",
    "七",
    "八",
    "九",
    "十",
    "十一",
    "十二",
  ];
  function monthTitle(value) {
    const index = Number(String(value || "").slice(5, 7));
    return `${monthNames[index] || value}月全球奖`;
  }
  function batchStats(item) {
    return [
      { label: "有效期", value: item.validityLabel || "—" },
      { label: "已使用", value: item.used == null ? "—" : `${item.used}个` },
      {
        label: "当前剩余",
        value: item.remaining == null ? "—" : `${item.remaining}个`,
      },
    ];
  }
  function transferFields(item) {
    const fields = [
      `时间：${date(item.createdAt)}`,
      `下级ID：${item.targetDisplayId || "—"}`,
      `下级等级：${item.targetLevel || "—"}`,
    ];
    if (item.peerAward != null)
      fields.push(`平级奖：¥${money(item.peerAward)}`);
    return fields;
  }
  function signedAmount(value) {
    if (value == null) return "—";
    return `${value > 0 ? "+" : ""}${money(value)}`;
  }
  function openIncome(item) {
    if (!item.layoutOnly) incomeDetail(item.id);
  }
  const can = (id) =>
    businessPreview(config) ||
    context.value?.capabilities?.includes(`wholesale:${id}`);
  const canWallet = (id) =>
    businessPreview(config) ||
    context.value?.capabilities?.includes(`wallet:${id}`);
  function open(id, targetAccountId) {
    uni.navigateTo({
      url: `/pages/partner/${id}?contextId=${encodeURIComponent(context.value.id)}${targetAccountId ? `&targetAccountId=${encodeURIComponent(targetAccountId)}` : ""}`,
    });
  }
  function operation(id, target) {
    open(id, target);
  }
  function wallet(page) {
    uni.navigateTo({
      url: `/pages/wallet/${page}?contextId=${encodeURIComponent(context.value.id)}`,
    });
  }
  function incomeDetail(id) {
    uni.navigateTo({
      url: `/pages/income/detail?contextId=${encodeURIComponent(context.value.id)}&id=${encodeURIComponent(id)}`,
    });
  }
  function copy(value) {
    if (value) uni.setClipboardData({ data: value });
  }
  const rankShort = (name) => String(name || "").replace(/合伙人$/, "");
  const rankHasPartner = (name) => /合伙人$/.test(String(name || ""));
  const yuan = (value) => (Number.isInteger(value) ? String(value / 100) : "—");
  const upgradeQuote = computed(() =>
    partnerUpgradeQuote(report.value?.promotion || {}),
  );
  const promotionTaskNote = computed(() => {
    const promotion = report.value?.promotion;
    const task = report.value?.task;
    if (!promotion) return "";
    if (task?.text || promotion.taskDescription)
      return task?.text || promotion.taskDescription;
    if (task?.deadlineText) return task.deadlineText;
    const opened = date(promotion.startedAt || promotion.openedAt).slice(0, 10);
    const vip =
      promotion.vipEquivalent ??
      ({ VIP合伙人: 3, 天使合伙人: 9, 私董合伙人: 18 })[promotion.beforeName] ??
      3;
    const until = Number(promotion.validUntil);
    const days = Number.isFinite(until)
      ? Math.max(0, Math.ceil((until - Date.now()) / 86400000))
      : promotion.daysLeft ?? "—";
    const short = rankShort(promotion.beforeName);
    // VIP→天使: only same-level count. 天使/私董: also allow VIP equivalent.
    const requirement =
      promotion.beforeName === "VIP合伙人"
        ? `直推3位VIP`
        : `直推3位${short}或${vip}个VIP`;
    return `任务有效期1年，自您${opened || "—"}开通合伙人起，1年内${requirement}即可免费晋升${promotion.afterName}，任务将于${days}天后截止`;
  });
  const promotionExpired = computed(() => {
    const until = Number(report.value?.promotion?.validUntil);
    return Number.isFinite(until) && until < Date.now();
  });
  const promotionStatusLabel = computed(() =>
    promotionExpired.value
      ? "已过期"
      : report.value?.promotion?.statusLabel || "进行中",
  );
  const promotionCanClaim = computed(() => {
    const promotion = report.value?.promotion;
    if (!promotion || promotionExpired.value) return false;
    return Number(promotion.progress) >= Number(promotion.target);
  });
  function teamMetric(list, label) {
    return (list || []).find((item) => item.label === label) || null;
  }
  function teamPerf(list) {
    const pick = (label) => teamMetric(list, label);
    return {
      totals: [pick("当月总业绩"), pick("累计总业绩")].filter(Boolean),
      pairs: [
        [pick("当月VIP业绩"), pick("当月产品业绩")].filter(Boolean),
        [pick("累计VIP业绩"), pick("累计产品业绩")].filter(Boolean),
      ].filter((pair) => pair.length),
    };
  }
  function back() {
    if (getCurrentPages().length > 1) uni.navigateBack();
    else uni.switchTab({ url: "/pages/partners/index" });
  }
  function changeFilter(value) {
    if (filter.value !== value) {
      filter.value = value;
      load();
    }
  }
  function changeMonth(e) {
    month.value = e.detail.value;
    load();
  }
  const claiming = ref(false),
    promotionError = ref(""),
    superiorCode = ref(""),
    bindingSuperior = ref(false),
    superiorError = ref("");
  let promotionKey = "";
  async function claimPromotion() {
    if (claiming.value || !promotionCanClaim.value) return;
    claiming.value = true;
    promotionError.value = "";
    promotionKey =
      promotionKey ||
      `promotion-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      await claimBusinessPromotion(
        context.value.id,
        report.value.promotion,
        promotionKey,
      );
      promotionKey = "";
      await load();
    } catch (e) {
      promotionError.value = e.message;
    } finally {
      claiming.value = false;
    }
  }
  async function submitSuperior() {
    if (bindingSuperior.value) return;
    bindingSuperior.value = true;
    superiorError.value = "";
    try {
      await bindBusinessSuperior(context.value.id, superiorCode.value);
      superiorCode.value = "";
      await load();
    } catch (e) {
      superiorError.value = e.message;
    } finally {
      bindingSuperior.value = false;
    }
  }
  async function saveShare() {
    if (isMock && report.value.localPayload) {
      qr.value?.save();
      return;
    }
    try {
      const url = report.value.posterUrl || report.value.qrUrl;
      if (!url) return;
      const response = await new Promise((resolve, reject) =>
        uni.downloadFile({ url, success: resolve, fail: reject }),
      );
      if (response.statusCode !== 200) throw new Error("图片下载失败");
      // #ifdef H5
      const anchor = document.createElement("a");
      anchor.href = response.tempFilePath;
      anchor.download = "share-code.png";
      anchor.click();
      // #endif
      // #ifndef H5
      await new Promise((resolve, reject) =>
        uni.saveImageToPhotosAlbum({
          filePath: response.tempFilePath,
          success: resolve,
          fail: reject,
        }),
      );
      // #endif
    } catch (e) {
      uni.showToast({
        title: e.message || "保存失败，请检查相册权限",
        icon: "none",
      });
    }
  }
  async function more() {
    if (loadingMore.value || !hasMore.value) return;
    const current = epoch;
    loadingMore.value = true;
    moreError.value = "";
    try {
      const next = await getBusinessReport(
        "wholesale",
        props.toolId,
        context.value.id,
        { cursor, month: month.value, filter: filter.value },
      );
      if (current === epoch) {
        items.value = [
          ...new Map(
            [...items.value, ...next.items].map((x) => [x.id, x]),
          ).values(),
        ];
        cursor = next.nextCursor;
        hasMore.value = next.hasMore;
      }
    } catch (e) {
      if (current === epoch) moreError.value = e.message;
    } finally {
      if (current === epoch) loadingMore.value = false;
    }
  }
  onUnmounted(() => {
    ++epoch;
  });
  defineExpose({ refresh: load });
</script>
<style>
  @import "../styles/wholesale.css";
</style>
<style scoped>
  .wh-center {
    text-align: center;
  }
  .wh-month-arrow {
    width: 1em;
    height: 1em;
    transform: rotate(90deg);
    vertical-align: middle;
  }
  .wh-share-close {
    background: none;
    line-height: 1;
    margin: 1em auto 0;
    padding: 0;
    width: 2em;
  }
  .wh-share-close image {
    width: 2em;
    height: 2em;
  }
  .wh-team-head {
    display: flex;
    align-items: flex-start;
    gap: 0.75em;
  }
  .wh-team-info {
    flex: 1;
    min-width: 0;
  }
  .wh-team-name {
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .wh-team-avatar {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    padding-bottom: 0.55em;
  }
  .wh-team-avatar .wh-avatar {
    width: 2.5em;
    height: 2.5em;
  }
  .wh-team-avatar .wh-tag {
    position: absolute;
    left: 50%;
    bottom: 0.2em;
    z-index: 1;
    transform: translateX(-50%);
    padding: 0.12em 0.7em;
    font-size: 0.62em;
    line-height: 1.55;
    max-width: 5.8em;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .wh-team-tags {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.45em;
    margin: 0.45em 0 0.25em;
    font-size: 0.82em;
  }
  .wh-team-tags > text,
  .wh-team-store {
    background: #464c6b;
    border-radius: 2em;
    padding: 0.28em 0.9em;
    color: #fff;
    font-size: 0.8em;
    line-height: 1.5;
  }
  .wh-team-store {
    display: inline-block;
    margin: 0.2em 0 0;
    max-width: 100%;
  }
  .wh-team-label {
    color: rgba(255, 255, 255, 0.5);
  }
  .wh-team-stats {
    padding: 0.75em 0.85em;
  }
  .wh-team-stats-head {
    padding: 0 0.1em 0.4em;
    color: #fff;
    font-size: 0.86em;
  }
  .wh-team-perf {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    gap: 0.45em;
    align-items: stretch;
  }
  .wh-team-perf-total {
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    gap: 0.55em;
    min-width: 0;
    padding: 0.7em 0.4em;
    border-radius: 16rpx;
    background: radial-gradient(
      234% 146% at -1% -31%,
      rgba(56, 127, 255, 0.72) 0%,
      rgba(35, 46, 90, 0.32) 100%
    );
    text-align: center;
  }
  .wh-team-perf-side {
    display: flex;
    flex-direction: column;
    gap: 0.45em;
    min-width: 0;
  }
  .wh-team-perf-pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    flex: 1;
    min-height: 0;
    border-radius: 16rpx;
    background: linear-gradient(169deg, #353a59 0%, rgba(53, 58, 89, 0.5) 100%);
    overflow: hidden;
  }
  .wh-team-perf-pair > view {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    padding: 0.55em 0.3em;
    text-align: center;
  }
  .wh-team-perf-divider {
    position: absolute;
    left: 0;
    top: 50%;
    width: 1rpx;
    height: 70%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.18);
  }
  .wh-team-tags .wh-team-label,
  .wh-team-store .wh-team-label,
  .wh-team-perf .wh-team-label {
    color: rgba(255, 255, 255, 0.5);
  }
  .wh-team-perf .wh-team-label {
    display: block;
    font-size: 0.72em;
    line-height: 1.35;
  }
  .wh-team-perf-value {
    margin-top: 0.2em;
    color: #fff;
    font-size: 0.95em;
    font-weight: 600;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }
  .wh-team-actions {
    justify-content: flex-end;
    margin-top: 1em;
  }
  .wh-outline {
    background: #09264c;
    border: 1rpx solid #55adff;
    color: #55adff;
  }
  .wh-three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .wh-stock-summary .wh-split {
    margin: 0;
    background: none;
  }
  .wh-stock-summary .wh-split > view > view {
    font-size: 1.3em;
  }
  .wh-stock-buttons {
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 0.7em;
  }
  .wh-batch-card > .wh-muted {
    display: block;
    margin: 0.35em 0 0.15em;
  }
  .wh-batch-reserved {
    margin-top: 0.55em;
  }
  .wh-eligibility-note {
    display: block;
    margin-top: 0.15em;
    font-size: 0.78em;
    line-height: 1.5;
  }
  .wh-income-head,
  .wh-income-actions {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .wh-income-actions {
    justify-content: flex-end;
  }
  .wh-global-summary .wh-metrics > view > view,
  .wh-summary-four > view > view {
    font-weight: 600;
    color: #fff;
  }
  .wh-experience-summary {
    background: #414662;
    padding: 0.5em;
    margin: -0.9em -0.9em 0.75em;
    text-align: center;
  }
  .wh-summary-four {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin: 0.5em;
  }
  .wh-global-summary {
    margin: 0 -0.75em 1em;
    background: #353a59;
    padding: 0.8em 0.5em;
  }
  .wh-global-summary .wh-center {
    margin-bottom: 0.5em;
  }
  .wh-income-top {
    margin: -0.75em -0.75em 0.8em;
    background: #353a59;
    padding: 1em 0.75em;
  }
  .wh-income-top .wh-pill {
    font-size: 0.75em !important;
  }
  .wh-share-card {
    border-radius: 1.1em;
    background: linear-gradient(#9bb7ff, #fff 50%);
    overflow: hidden;
    color: #fff;
  }
  .wh-share-head {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 0.5em;
    overflow: hidden;
    background: linear-gradient(110deg, #7476fc, #3a95ff);
    padding: 2.35em 1em 1.05em;
    font-size: 1.1em;
    font-weight: 600;
  }
  .wh-share-mark {
    position: absolute;
    left: 0.4em;
    top: 0.32em;
    z-index: 0;
    max-width: calc(100% - 0.8em);
    overflow: hidden;
    font-size: 1.45em;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.03em;
    color: rgba(255, 255, 255, 0.34);
    pointer-events: none;
    white-space: nowrap;
  }
  .wh-share-head > text:not(.wh-share-mark),
  .wh-invite-code {
    position: relative;
    z-index: 1;
  }
  .wh-invite-code {
    display: flex;
    align-items: center;
    gap: 0.25em;
    background: white;
    color: #6a8fef;
    font-size: 0.7em;
    padding: 0.2em 0.7em;
    margin: 0;
    border-radius: 3em;
    line-height: 1.6;
  }
  .wh-invite-code image {
    width: 1em;
    height: 1em;
  }
  .wh-share-body {
    padding: 1.3em 1em 2em;
    border-radius: 1em;
    border-top: 1rpx solid #fff;
    text-align: center;
  }
  .wh-share-body > text {
    color: #909090;
    font-size: 0.8em;
  }
  .wh-share-body :deep(.qr-wrap) {
    margin: 0.5em auto 1em;
    max-width: 13em;
  }
  .wh-share-qr {
    width: 13em;
    height: 13em;
    max-width: 100%;
    display: block;
    margin: auto;
  }
  .wh-share-save {
    display: block;
    margin: 1.3em auto 0 !important;
    width: 55%;
  }
  .wh-dialog-share {
    padding: 0;
    background: transparent;
    overflow: visible;
    max-width: 22em;
  }
  .wh-dialog-share > .wh-dialog-head {
    display: none;
  }
  .wh-dialog-share::after {
    content: none;
  }
  .wh-promotion-overlay {
    justify-content: flex-end;
    align-items: stretch;
    padding: 0;
  }
  .wh-promotion-overlay > .wh-dialog {
    align-self: stretch;
    width: 100%;
    max-width: 750px;
    margin: 0 auto;
    border-radius: 24rpx 24rpx 0 0;
    animation: wh-sheet-up 0.28s ease;
  }
  @keyframes wh-sheet-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
  .wh-dialog-promotion {
    background: linear-gradient(132deg, #36312f, #1c1918 68%);
    border-radius: 1.25em 1.25em 0 0;
    max-width: 750px;
    padding: 1.35em 1.7em calc(1.4em + env(safe-area-inset-bottom));
    color: #f0d6b9;
  }
  .wh-dialog-promotion > .wh-dialog-head {
    font-size: 1.38em;
    font-weight: 600;
    padding: 0.05em 2.2em 1.65em;
    color: #fff;
  }
  .wh-dialog-promotion > .wh-dialog-head .wh-close {
    right: 0.1em;
    top: 0.05em;
  }
  .wh-dialog-promotion > .wh-dialog-head .wh-close image {
    width: 1.5em;
    height: 1.5em;
  }
  .wh-promotion-compare {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.12fr);
    align-items: center;
    position: relative;
    margin: 0.2em 0 1.35em;
  }
  .wh-promotion-before,
  .wh-promotion-after {
    position: relative;
    box-sizing: border-box;
    min-height: 8.9em;
    text-align: center;
    font-size: 0.86em;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .wh-promotion-before {
    z-index: 1;
    color: #bc5135;
    background: linear-gradient(112deg, #ffeddc, #ffc292);
    border-radius: 1.18em;
    padding: 2.3em 0.45em 1em;
  }
  .wh-promotion-before::after {
    content: "";
    position: absolute;
    right: -0.65em;
    bottom: 0.72em;
    width: 1.25em;
    height: 1.25em;
    border-radius: 50%;
    background: #201b19;
  }
  .wh-promotion-after {
    z-index: 2;
    margin-left: -0.2em;
    border: 1rpx solid #ebc29f;
    border-radius: 1.2em;
    color: #cbb299;
    background: linear-gradient(130deg, #2a2421, #1c1918);
    padding: 2.25em 0.5em 1em;
    box-shadow: -0.22em 0 0.95em #eab59455;
  }
  .wh-promotion-stage {
    position: absolute;
    top: 0;
    min-width: 4.6em;
    padding: 0.4em 0.7em 0.5em;
    border-radius: 0 0 0.85em 0.85em;
    font-size: 1.12em;
    font-weight: 700;
    line-height: 1.15;
  }
  .wh-promotion-before .wh-promotion-stage {
    background: #ffcfaa;
  }
  .wh-promotion-after .wh-promotion-stage {
    background: #ffdfbf;
    color: #5c2a00;
  }
  .wh-promotion-level {
    min-height: 2.2em;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.38em;
    font-weight: 700;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }
  .wh-promotion-after .wh-promotion-level {
    color: #f9e9db;
    font-size: 1.57em;
  }
  .wh-promotion-divider {
    width: 100%;
    height: 1rpx;
    margin: 0.85em 0 0.8em;
    background: repeating-linear-gradient(
      90deg,
      #ebc19d 0 0.35em,
      transparent 0.35em 0.7em
    );
    opacity: 0.7;
  }
  .wh-promotion-after .wh-promotion-divider {
    background: repeating-linear-gradient(
      90deg,
      #61534b 0 0.35em,
      transparent 0.35em 0.7em
    );
  }
  .wh-promotion-arrow {
    position: absolute;
    z-index: 3;
    left: 42.8%;
    bottom: -0.26em;
    width: 2.6em;
    height: 2.8em;
    background: linear-gradient(135deg, #ffbd6b, #ff6c26);
    clip-path: polygon(
      50% 0,
      100% 47%,
      72% 47%,
      72% 100%,
      28% 100%,
      28% 47%,
      0 47%
    );
    filter: drop-shadow(0 0.3em 0.38em #ff8b3d88);
  }
  .wh-promotion-arrow::after {
    content: "";
    position: absolute;
    inset: 0.14em;
    background: linear-gradient(135deg, #ffcc8f, #ff7c32);
    clip-path: inherit;
  }
  .wh-promotion-switch {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1em;
    margin-bottom: 1.2em;
  }
  .wh-promotion-switch button {
    min-width: 0;
    margin: 0;
    padding: 0.55em 0.35em;
    border-radius: 3em;
    background: #ffffff1f;
    color: #ffffffb8;
    line-height: 1.35;
    font-size: 0.98em;
  }
  .wh-promotion-switch button.active {
    color: #5c2a00;
    background: linear-gradient(105deg, #ffe5c6, #f3b56f);
    font-weight: 600;
  }
  .wh-promotion-note {
    margin: 0 0 1em;
    border: 1rpx solid #eec39d;
    border-radius: 0.55em;
    padding: 0.75em 0.85em;
    color: #cab29b;
    font-size: 0.94em;
    line-height: 1.55;
    background: linear-gradient(110deg, #3f3630, #191617);
  }
  .wh-price-lines {
    overflow: hidden;
    background: #3a3432;
    border-radius: 0.42em;
    padding: 0;
    font-size: 1em;
  }
  .wh-price-lines > view {
    display: flex;
    justify-content: space-between;
    gap: 1em;
    padding: 0.72em 0.85em;
    border-bottom: 1rpx solid #524a46;
  }
  .wh-price-lines > view:nth-child(odd) {
    background: #5b5350;
  }
  .wh-price-lines > view:last-child {
    border: 0;
  }
  .wh-price-lines text:first-child {
    color: #ffffffb8;
  }
  .wh-price-lines text:last-child {
    color: #fff;
    white-space: nowrap;
  }
  .wh-promotion-progress {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1em;
    margin: 1.7em auto 0.2em;
    max-width: 17em;
    text-align: center;
    font-size: 1.05em;
    color: #ffffffc7;
  }
  .wh-promotion-progress > view > text {
    display: block;
  }
  .wh-promotion-progress > view > view {
    margin-top: 0.35em;
    color: #f8d3b3;
    font-size: 1.35em;
    font-weight: 700;
    line-height: 1.15;
  }
  .wh-superior-card > .wh-dialog-head {
    display: none;
  }
  .wh-superior-card {
    background: transparent;
    padding: 0;
  }
  .wh-superior-card .wh-card {
    margin: 0;
  }
  .wh-superior-name {
    display: flex;
    align-items: center;
    gap: 0.4em;
    font-weight: 600;
  }
  .wh-copy {
    display: inline-flex;
    align-items: center;
    background: none;
    padding: 0;
    margin: 0 0.2em;
    line-height: 1;
    vertical-align: middle;
  }
  .wh-copy image {
    width: 1em;
    height: 1em;
  }
  .wh-dialog-superior .wh-input {
    border-radius: 3em;
    text-align: center;
    height: 2.8em;
    background: #3c4568;
    margin: 1.2em 0 0.2em;
  }
  .wh-dialog-superior .wh-confirm {
    margin-top: 1.2em;
  }
  .wh-dialog-superior .wh-confirm button {
    flex: 1;
    background: transparent;
    border-radius: 0;
    font-size: 1.05em;
    line-height: 2.4;
    padding: 0;
  }
  .wh-confirm-ok,
  .wh-dialog-superior .wh-confirm .wh-confirm-ok[disabled] {
    color: #2f7bff !important;
    font-weight: 600;
    opacity: 1;
  }
  .wh-confirm-cancel {
    color: #e8eef8;
  }
  /* Design 21/22 uses a layered canvas, rather than two equal cards.  Dimensions
   retain the 750rpx reference proportions while the sheet remains viewport-safe. */
  .wh-dialog-superior:not(.wh-superior-card) {
    padding-top: 48rpx;
    padding-bottom: 48rpx;
  }
  .wh-superior-card .wh-card {
    background: linear-gradient(180deg, #28345c 0%, #22274d 100%);
    border-radius: 24rpx;
    padding-top: 40rpx;
    padding-bottom: 40rpx;
  }
  .wh-superior-person .wh-superior-name {
    margin-bottom: 6rpx;
  }
  .wh-dialog-promotion {
    min-height: 0;
    padding: 42rpx 36rpx calc(24rpx + env(safe-area-inset-bottom)) 54rpx;
  }
  .wh-dialog-promotion > .wh-dialog-head {
    height: 50rpx;
    box-sizing: border-box;
    padding: 0 44rpx 0 0;
    font-size: 36rpx;
    line-height: 50rpx;
  }
  .wh-dialog-promotion > .wh-dialog-head .wh-close {
    right: 0;
    top: 8rpx;
  }
  .wh-dialog-promotion > .wh-dialog-head .wh-close image {
    width: 32rpx;
    height: 32rpx;
  }
  .wh-upgrade-module {
    position: relative;
    width: 640rpx;
    height: 266rpx;
    max-width: 100%;
    margin: 8rpx auto 28rpx;
  }
  .wh-upgrade-before {
    position: absolute;
    left: 0;
    top: 38rpx;
    width: 288rpx;
    height: 228rpx;
    z-index: 1;
    border-radius: 24rpx;
    background:
      radial-gradient(
        130% 100% at 20% 0%,
        rgba(255, 255, 255, 0.75) 0%,
        rgba(255, 255, 255, 0) 55%
      ),
      linear-gradient(170deg, #fef8ea 0%, #f9ecd3 42%, #f2ddb4 78%, #efd7a9 100%);
    box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.35);
  }
  .wh-upgrade-tab {
    position: absolute;
    top: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
  }
  .wh-upgrade-tab-before {
    left: 80rpx;
    width: 128rpx;
    height: 52rpx;
    border-radius: 0 0 16rpx 16rpx;
    background: linear-gradient(180deg, #faead0, #f3d7aa);
    color: #bc5135;
    font-size: 28rpx;
  }
  .wh-upgrade-title-before {
    position: absolute;
    top: 78rpx;
    left: 0;
    width: 288rpx;
    line-height: 1.15;
    text-align: center;
    font-size: 28rpx;
    font-weight: 800;
    color: #bc5135;
    letter-spacing: 1rpx;
  }
  .wh-upgrade-dashed {
    position: absolute;
    height: 3rpx;
    border-radius: 2rpx;
    background-image: repeating-linear-gradient(
      90deg,
      currentColor 0 10rpx,
      transparent 10rpx 19rpx
    );
  }
  .wh-upgrade-dashed-before {
    top: 158rpx;
    left: 40rpx;
    width: 204rpx;
    color: #bc5135;
    opacity: 0.45;
  }
  .wh-upgrade-after {
    position: absolute;
    left: 8.175rem;
    top: 0;
    width: 354rpx;
    height: 266rpx;
    z-index: 2;
  }
  .wh-upgrade-after-shape {
    display: block;
    width: 354rpx;
    height: 266rpx;
  }
  .wh-upgrade-after-content {
    position: absolute;
    inset: 0;
  }
  .wh-upgrade-tab-after {
    left: 103rpx;
    width: 148rpx;
    height: 62rpx;
    border-radius: 0 0 18rpx 18rpx;
    background: linear-gradient(180deg, #f9e2b2, #e9c283);
    color: #5c2a00;
    font-size: 30rpx;
  }
  .wh-upgrade-title-after {
    position: absolute;
    top: 100rpx;
    left: 0;
    width: 100%;
    line-height: 1.15;
    text-align: center;
    font-size: 28rpx;
    font-weight: 800;
    color: #f9e9db;
    letter-spacing: 1rpx;
  }
  .wh-upgrade-title-emph {
    font-size: 40rpx;
    font-weight: 800;
    letter-spacing: 2rpx;
  }
  .wh-upgrade-title-suffix {
    font-size: 28rpx;
    font-weight: 800;
    letter-spacing: 1rpx;
  }
  .wh-upgrade-dashed-after {
    top: 195rpx;
    left: 50rpx;
    right: 44rpx;
    color: #6e5b44;
  }
  .wh-upgrade-glow {
    position: absolute;
    left: 218rpx;
    top: 145rpx;
    width: 140rpx;
    height: 130rpx;
    z-index: 3;
    pointer-events: none;
    background: radial-gradient(
      closest-side,
      rgba(255, 244, 222, 0.85) 0%,
      rgba(255, 244, 222, 0.35) 45%,
      rgba(255, 244, 222, 0) 72%
    );
  }
  .wh-upgrade-arrow {
    position: absolute;
    left: 6.9125rem;
    top: 3.4rem;
    width: 3.425rem;
    height: 5.90625rem;
    z-index: 4;
    filter: drop-shadow(0 6rpx 14rpx rgba(238, 130, 50, 0.45));
  }
  .wh-upgrade-benefits {
    position: absolute;
    top: 220rpx;
    z-index: 5;
    font-size: 24rpx;
    line-height: 1;
    white-space: nowrap;
    transform: translateX(-50%);
    font-weight: 500;
  }
  .wh-upgrade-benefits-num {
    font-style: normal;
    font-weight: 500;
  }
  .wh-upgrade-benefits-before {
    left: 144rpx;
    color: #bc5135;
  }
  .wh-upgrade-benefits-after {
    left: 463rpx;
    color: #cab29d;
  }
  .wh-promotion-switch {
    gap: 20rpx;
    margin: 42rpx 20rpx 24rpx 0;
  }
  .wh-promotion-switch button {
    height: 64rpx;
    padding: 14rpx 12rpx;
    border-radius: 58rpx;
    font-size: 26rpx;
    line-height: 36rpx;
    white-space: nowrap;
  }
  .wh-promotion-note {
    margin: 0 20rpx 24rpx 0;
    min-height: 112rpx;
    box-sizing: border-box;
    padding: 18rpx;
    border-radius: 8rpx;
    font-size: 26rpx;
    line-height: 36rpx;
  }
  .wh-price-lines {
    margin-right: 20rpx;
    border-radius: 8rpx;
    font-size: 28rpx;
  }
  .wh-price-lines > view {
    padding: 20rpx 24rpx;
    line-height: 40rpx;
  }
  .wh-promotion-task-note {
    min-height: 0;
    font-size: 22rpx;
    line-height: 34rpx;
  }
  .wh-promotion-progress {
    display: flex;
    justify-content: space-between;
    max-width: 358rpx;
    margin: 28rpx auto 0;
    font-size: 28rpx;
  }
  .wh-promotion-progress > view {
    flex: none;
    white-space: nowrap;
  }
  .wh-promotion-progress > view > view {
    margin-top: 8rpx;
    font-size: 36rpx;
    line-height: 52rpx;
  }
  .wh-promotion-claim {
    display: block;
    width: 100%;
    margin-top: 48rpx !important;
  }
  @media (max-width: 340px) {
    .wh-dialog-promotion {
      padding-left: 24rpx;
      padding-right: 24rpx;
    }
    .wh-promotion-switch {
      gap: 14rpx;
    }
    .wh-promotion-switch button {
      font-size: 24rpx;
    }
  }
</style>
