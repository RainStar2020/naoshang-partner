<template>
  <view class="member-page">
    <view class="member-frame">
      <BusinessPageHeader title="会员管理" fallback="/pages/profile/index" />
      <view class="member-body">
        <FeaturePageState :status="status" :error="error" @retry="load" />
        <template v-if="status === 'ready'">
          <EmptyState v-if="!items.length" text="暂无会员，点击下方添加" />
          <view v-for="(member, index) in items" :key="member.id" class="member-card">
            <text class="member-index">会员{{ index + 1 }}</text>
            <view class="member-heading">
              <image class="member-avatar" :src="member.avatarUrl || '/static/partner/avatar-member.png'" mode="aspectFill" />
              <view class="member-information">
                <view class="member-name">{{ member.name }}<text v-if="member.badge" class="member-badge">{{ member.badge }}</text></view>
                <view class="member-meta">
                  <text>ID：{{ member.displayId || member.id }}</text>
                  <text>年级：{{ member.gradeLabel }}</text>
                  <text>性别：{{ member.genderLabel }}</text>
                </view>
              </view>
            </view>
            <view class="member-benefit">
              <text class="benefit-title">陪练卡</text>
              <view class="benefit-body">
                <view>训练：共<text class="hour">{{ member.training?.total ?? '—' }}</text>时，已消耗<text class="hour">{{ member.training?.used ?? '—' }}</text>时，剩余<text class="hour">{{ member.training?.remaining ?? '—' }}</text>时</view>
                <view v-if="member.customHours">特制：共<text class="hour">{{ member.customHours.total ?? '—' }}</text>时，已消耗<text class="hour">{{ member.customHours.used ?? '—' }}</text>时，剩余<text class="hour">{{ member.customHours.remaining ?? '—' }}</text>时</view>
              </view>
              <button @click="records(member, 'training')">陪练反馈</button>
            </view>
            <view class="member-benefit">
              <text class="benefit-title">智习室</text>
              <view class="benefit-body">{{ member.selfStudyNote || '暂无记录' }}</view>
              <button @click="records(member, 'self-study')">智习反馈</button>
            </view>
            <view class="member-benefit">
              <text class="benefit-title">集训营</text>
              <view class="benefit-body">{{ member.campNote || '暂无记录' }}</view>
              <button @click="records(member, 'camp')">集训反馈</button>
            </view>
            <view class="member-benefit">
              <text class="benefit-title">备注</text>
              <view class="benefit-body">{{ member.remark || '暂无备注' }}</view>
            </view>
            <view class="member-actions">
              <button @click="openEditor(member)"><image src="/static/common/icon-edit.png" mode="aspectFit" />编辑</button>
              <button @click="openActivation(member)"><image src="/static/common/icon-activate.png" mode="aspectFit" />激活</button>
              <view class="action-spacer"></view>
              <button class="orders-link" @click="records(member, 'orders')">查看订单</button>
            </view>
          </view>
          <button v-if="hasMore" class="load-more" :disabled="loadingMore" @click="more">{{ loadingMore ? '加载中…' : '加载更多' }}</button>
          <text v-if="moreError" class="member-error">{{ moreError }}</text>
        </template>
      </view>
    </view>
    <view v-if="status === 'ready'" class="member-footer"><button class="submit" @click="openEditor(null)">添加会员</button></view>
    <view v-if="editorOpen" class="member-mask" @click="closeEditor">
      <view class="member-sheet" role="dialog" :aria-label="editingId ? '编辑会员' : '添加会员'" @click.stop>
        <view class="sheet-heading">
          <text>{{ editingId ? '编辑会员' : '添加会员' }}</text>
          <button class="sheet-close" :disabled="saving || uploading" aria-label="关闭会员编辑" @click="closeEditor"><image src="/static/common/icon-close.png" mode="aspectFit" /></button>
        </view>
        <button class="avatar-upload" :disabled="saving || uploading" @click="chooseAvatar">
          <image v-if="avatarPreview" :src="avatarPreview" mode="aspectFill" />
          <image v-else src="/static/partner/avatar-member.png" mode="aspectFill" />
          <text>{{ uploading ? '处理中…' : '点击上传' }}</text>
        </button>
        <view class="sheet-row"><text>会员姓名</text><input v-model="draft.name" :disabled="saving" :maxlength="24" placeholder="请输入" /></view>
        <view class="sheet-row">
          <text>会员年级</text>
          <picker :range="dictionaries.grades" range-key="label" :value="gradeIndex" :disabled="saving" @change="draft.gradeCode = dictionaries.grades[$event.detail.value].code">
            <view class="sheet-picker">{{ gradeLabel || '请选择' }}<image src="/static/common/icon-chevron-right.png" mode="aspectFit" /></view>
          </picker>
        </view>
        <view class="sheet-row">
          <text>会员性别</text>
          <picker :range="dictionaries.genders" range-key="label" :value="genderIndex" :disabled="saving" @change="draft.genderCode = dictionaries.genders[$event.detail.value].code">
            <view class="sheet-picker">{{ genderLabel || '请选择' }}<image src="/static/common/icon-chevron-right.png" mode="aspectFit" /></view>
          </picker>
        </view>
        <text v-if="editorError" class="member-error">{{ editorError }}</text>
        <button class="submit" :disabled="saving || uploading" @click="save">{{ saving ? '保存中…' : '确定' }}</button>
      </view>
    </view>
    <view v-if="activationMember" class="member-mask center-mask" @click="closeActivation">
      <view class="activate-dialog" role="dialog" aria-label="激活" @click.stop>
        <text class="dialog-title">激活</text>
        <input :value="activationCode" :disabled="activating" :maxlength="100" placeholder="请输入激活码" @input="changeCode" />
        <text v-if="activationPreview" class="preview-note">即将为{{ activationPreview.memberName || activationMember.name }}激活：{{ activationPreview.levelName || activationPreview.targetLabel || activationPreview.targetId }}</text>
        <text v-if="activationError" class="member-error">{{ activationError }}</text>
        <view class="dialog-actions">
          <button class="dialog-ok" :disabled="activating || !activationCode.trim()" @click="activate">{{ activating ? '处理中…' : '确定' }}</button>
          <button :disabled="activating" @click="closeActivation">取消</button>
        </view>
      </view>
    </view>
    <view v-if="successText" class="member-mask center-mask" @click="successText = ''">
      <view class="activate-dialog success-dialog" role="dialog" aria-label="激活成功" @click.stop>
        <text class="success-copy">{{ successText }}</text>
        <button class="submit" @click="successText = ''">确定</button>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, computed, watch } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { useAsyncPage } from '../../composables/useAsyncPage'
import { getFamilyMembers, getMemberDictionaries, saveFamilyMember, previewMemberActivation, activateFamilyMember } from '../../services/members'
import { uploadProfileImage } from '../../services/profile'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
import EmptyState from '../../components/EmptyState.vue'
useAuth()
const items = ref([]), hasMore = ref(false), loadingMore = ref(false), moreError = ref(''), dictionaries = ref({ grades: [], genders: [] }), editorOpen = ref(false), editingId = ref(''), draft = ref({}), avatarPreview = ref(''), editorError = ref(''), saving = ref(false), uploading = ref(false), activationMember = ref(null), activationCode = ref(''), activationPreview = ref(null), activationError = ref(''), activating = ref(false), successText = ref('')
let cursor = null, epoch = 0, editorEpoch = 0, activationEpoch = 0, active = true, activationKey = '', memberSaveKey = '', memberSavePayload = ''
const { data, status, error, load } = useAsyncPage(async () => {
  const [result, options] = await Promise.all([getFamilyMembers(), getMemberDictionaries()])
  if (!Array.isArray(options?.grades) || !Array.isArray(options.genders)) throw new Error('会员字典配置异常')
  return { ...result, dictionaries: options }
})
watch(status, value => { if (value === 'loading') { ++epoch; loadingMore.value = false; moreError.value = '' } })
watch(data, result => { if (result) { items.value = result.items; hasMore.value = result.hasMore; cursor = result.nextCursor; dictionaries.value = result.dictionaries } })
const gradeIndex = computed(() => Math.max(0, dictionaries.value.grades.findIndex(item => item.code === draft.value.gradeCode)))
const genderIndex = computed(() => Math.max(0, dictionaries.value.genders.findIndex(item => item.code === draft.value.genderCode)))
const gradeLabel = computed(() => dictionaries.value.grades.find(item => item.code === draft.value.gradeCode)?.label)
const genderLabel = computed(() => dictionaries.value.genders.find(item => item.code === draft.value.genderCode)?.label)
function openEditor(member) {
  ++editorEpoch
  memberSaveKey = ''
  memberSavePayload = ''
  editingId.value = member?.id || ''
  draft.value = { name: member?.name || '', gradeCode: member?.gradeCode || '', genderCode: member?.genderCode || '', version: member?.version, avatarAssetId: '' }
  avatarPreview.value = member?.avatarUrl || ''
  editorError.value = ''
  editorOpen.value = true
}
function closeEditor() { if (saving.value || uploading.value) return; ++editorEpoch; editorOpen.value = false }
async function chooseAvatar() {
  if (saving.value || uploading.value) return
  const current = editorEpoch
  uploading.value = true
  editorError.value = ''
  try {
    const chosen = await new Promise(resolve => uni.chooseImage({ count: 1, sourceType: ['album'], success: resolve, fail: () => resolve(null) }))
    if (!chosen || !active || current !== editorEpoch) return
    const result = await uploadProfileImage({ path: chosen.tempFilePaths[0], size: chosen.tempFiles[0].size }, 'member-avatar')
    if (active && current === editorEpoch) { draft.value.avatarAssetId = result.assetId; avatarPreview.value = result.previewUrl }
  } catch (reason) { if (active && current === editorEpoch) editorError.value = reason.message }
  finally { if (active && current === editorEpoch) uploading.value = false }
}
async function save() {
  if (saving.value || uploading.value) return
  const current = editorEpoch
  saving.value = true
  editorError.value = ''
  try {
    const fingerprint = JSON.stringify(draft.value)
    if (fingerprint !== memberSavePayload) { memberSavePayload = fingerprint; memberSaveKey = 'member-' + Date.now() + '-' + Math.random().toString(36).slice(2) }
    await saveFamilyMember(editingId.value, { ...draft.value, idempotencyKey: memberSaveKey })
    if (active && current === editorEpoch) { editorOpen.value = false; uni.showToast({ title: '已保存', icon: 'success' }); await load() }
  } catch (reason) { if (active && current === editorEpoch) editorError.value = reason.message || '保存失败' }
  finally { if (active) saving.value = false }
}
function openActivation(member) { ++activationEpoch; activationMember.value = member; activationCode.value = ''; activationPreview.value = null; activationError.value = ''; activationKey = '' }
function closeActivation() { if (activating.value) return; ++activationEpoch; activationMember.value = null }
function changeCode(event) { activationCode.value = event.detail.value; activationPreview.value = null; activationKey = ''; activationError.value = '' }
async function activate() {
  if (activating.value || !activationMember.value || !activationCode.value.trim()) return
  const current = activationEpoch
  activating.value = true
  activationError.value = ''
  try {
    if (!activationPreview.value) {
      const result = await previewMemberActivation(activationMember.value.id, activationCode.value)
      if (!active || current !== activationEpoch) return
      if (result.memberId !== activationMember.value.id || !result.targetId) throw new Error('激活预览身份异常')
      activationPreview.value = result
    }
    if (!activationKey) activationKey = `member-activation-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const label = activationPreview.value.levelName || activationPreview.value.targetLabel || '会员'
    await activateFamilyMember(activationMember.value.id, activationPreview.value, activationKey)
    if (active && current === activationEpoch) { activationMember.value = null; successText.value = `您已成功激活${label}`; await load() }
  } catch (reason) { if (active && current === activationEpoch) activationError.value = reason.message || '激活失败，请重试' }
  finally { if (active) activating.value = false }
}
function records(member, kind) { uni.navigateTo({ url: `/pages/members/records?memberId=${encodeURIComponent(member.id)}&kind=${kind}` }) }
async function more() {
  if (loadingMore.value || !hasMore.value) return
  const current = epoch
  loadingMore.value = true
  try {
    const result = await getFamilyMembers(cursor)
    if (current === epoch) {
      items.value = [...new Map([...items.value, ...result.items].map(item => [item.id, item])).values()]
      hasMore.value = result.hasMore
      cursor = result.nextCursor
    }
  } catch (reason) { if (current === epoch) moreError.value = reason.message }
  finally { if (current === epoch) loadingMore.value = false }
}
onUnload(() => { active = false; ++epoch; ++editorEpoch; ++activationEpoch })
</script>
<style scoped>
.member-page { min-height: 100vh; background: #272c47; color: #fff; font-size: clamp(14px, 3.73vw, 16px); }
.member-frame { max-width: 750px; margin: 0 auto; }
.member-body { padding: .85em 1em calc(6.2em + env(safe-area-inset-bottom)); }
.member-card { position: relative; margin-bottom: .85em; padding: 1em .9em .85em; border-radius: .85em; background: #353a59; }
.member-index { position: absolute; top: 0; right: 0; padding: .12em .55em; border-radius: 0 .85em 0 .55em; background: #596381; font-size: .78em; }
.member-heading { display: flex; align-items: center; gap: .7em; margin-bottom: .8em; min-width: 0; }
.member-avatar { width: 3.2em; height: 3.2em; border-radius: 50%; flex-shrink: 0; background: #375682; }
.member-information { flex: 1; min-width: 0; }
.member-name { display: flex; align-items: center; flex-wrap: wrap; gap: .35em; font-weight: 700; line-height: 1.4; }
.member-badge { padding: .05em .5em; border-radius: 1em; background: linear-gradient(90deg, #00baff, #3056ff); font-size: .75em; font-weight: 500; }
.member-meta { display: flex; flex-wrap: wrap; gap: .15em .65em; margin-top: .3em; color: #a8b8d1; font-size: .82em; line-height: 1.45; }
.member-benefit { display: flex; align-items: stretch; min-height: 3.6em; margin-bottom: .5em; border-radius: .55em; background: #454d6e; }
.benefit-title, .member-benefit > button { flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin: 0; writing-mode: vertical-rl; letter-spacing: .08em; line-height: 1; font-size: .82em; }
.benefit-title { width: 1.7em; padding: .45em 0; background: #555e7b; color: #d5dced; border-radius: .55em 0 0 .55em; }
.member-benefit > button { align-self: center; min-height: 4.6em; margin: .4em .4em .4em 0; padding: .55em .28em; background: #00b861; color: #fff; border-radius: .4em; }
.benefit-body { flex: 1; min-width: 0; padding: .55em .65em; color: #d7deee; font-size: .86em; line-height: 1.55; overflow-wrap: anywhere; }
.hour { color: #4eb6ff; }
.member-actions { display: flex; align-items: center; gap: .8em; margin-top: .7em; }
.member-actions button { display: flex; align-items: center; gap: .25em; margin: 0; padding: 0; background: none; color: #fff; font-size: .9em; }
.member-actions image { width: 1.15em; height: 1.15em; }
.action-spacer { flex: 1; }
.orders-link { padding: .35em .95em !important; border-radius: 2em; background: linear-gradient(90deg, #00b7ff, #3157ff) !important; }
.load-more { width: 100%; margin-top: .4em; border-radius: 2em; background: #454b6b; color: #fff; }
.member-error { display: block; margin-top: .45em; color: #ffabbc; text-align: center; line-height: 1.5; }
.member-footer { position: fixed; z-index: 40; bottom: 0; left: 50%; width: min(750px, 100%); transform: translateX(-50%); padding: .8em 1.1em calc(.8em + env(safe-area-inset-bottom)); background: #272c47; }
.submit { width: 100%; margin: 0; border-radius: 3em; background: linear-gradient(100deg, #003eff, #009cff); color: #fff; }
.submit[disabled] { opacity: .45; }
.member-mask { position: fixed; inset: 0; z-index: 150; display: flex; align-items: flex-end; background: #0009; }
.center-mask { align-items: center; justify-content: center; }
.member-sheet { width: min(750px, 100%); margin: 0 auto; padding: 1em 1.1em calc(1.1em + env(safe-area-inset-bottom)); border-radius: 1.2em 1.2em 0 0; background: #3a4060; }
.sheet-heading { position: relative; display: flex; justify-content: center; margin-bottom: .8em; font-weight: 600; }
.sheet-close { position: absolute; right: 0; top: 0; width: 1.8em; height: 1.8em; margin: 0; padding: 0; background: none; }
.sheet-close image { width: 1.15em; height: 1.15em; }
.avatar-upload { display: flex; flex-direction: column; align-items: center; gap: .4em; width: 100%; margin: 0 0 .8em; padding: 0; background: none; color: #c5cadb; font-size: .9em; }
.avatar-upload image { width: 4.4em; height: 4.4em; border-radius: 50%; background: #2a3558; }
.sheet-row { display: flex; align-items: center; gap: .7em; margin-bottom: .7em; }
.sheet-row > text { flex-shrink: 0; min-width: 4.4em; }
.sheet-row input, .sheet-picker { flex: 1; min-width: 0; height: 2.5em; margin: 0; padding: 0 .9em; border: 0; border-radius: 2em; background: #4a516c; color: #fff; font-size: 1em; display: flex; align-items: center; justify-content: space-between; }
.sheet-row picker { flex: 1; min-width: 0; }
.sheet-picker image { width: .8em; height: .8em; flex-shrink: 0; }
.member-sheet .submit { margin-top: .5em; }
.activate-dialog { width: min(20em, calc(100% - 2.6em)); padding: 1.2em 1.1em 1em; border-radius: 1em; background: #353a59; }
.dialog-title, .success-copy { display: block; text-align: center; font-weight: 600; }
.activate-dialog input { width: 100%; margin: .9em 0 0; padding: .65em .8em; border-radius: 2em; background: #4a516c; color: #fff; font-size: 1em; text-align: center; }
.preview-note { display: block; margin-top: .55em; color: #b7c3dc; font-size: .84em; text-align: center; line-height: 1.45; }
.dialog-actions { display: flex; margin-top: .9em; }
.dialog-actions button { flex: 1; margin: 0; padding: .35em 0; background: none; color: #d5dced; }
.dialog-ok { color: #3aa0ff !important; }
.success-dialog { padding-top: 1.6em; padding-bottom: 1.2em; }
.success-copy { margin-bottom: 1.1em; line-height: 1.5; }
</style>
