/** Agency team level / performance presentation helpers. */
import areas from "china-area-data";
import { storeDisplayAddress, storeFeeAmount, storePhotoUrl } from '../store-display'

export function agencyTeamRegionLabel(item = {}) {
  const raw = String(item.regionLabel || item.scopeLabel || "").trim();
  if (raw && !/^\d+$/.test(raw)) return raw;
  const code = String(item.regionCode || item.areaCode || "").trim();
  if (!/^\d{6}$/.test(code)) return raw || code;
  const provinceCode = `${code.slice(0, 2)}0000`;
  const cityCode = `${code.slice(0, 4)}00`;
  const type = String(item.agencyType || "").toUpperCase();
  const province = areas["86"]?.[provinceCode];
  const city = areas[provinceCode]?.[cityCode];
  const district = areas[cityCode]?.[code];
  if (type === "PROVINCE") return province || raw || code;
  if (type === "CITY") return city || raw || code;
  if (type === "COUNTY" || type === "DISTRICT") return district || raw || code;
  return raw || district || city || province || code;
}

export const agencyTeamMetricLabels = Object.freeze([
  "本月业绩",
  "季度业绩",
  "上半年业绩",
  "本年业绩",
  "累计业绩",
]);

const levelLabels = Object.freeze({
  PROVINCE: "省代",
  province: "省代",
  省代: "省代",
  CITY: "市代",
  city: "市代",
  市代: "市代",
  COUNTY: "区县代理",
  county: "区县代理",
  区县代理: "区县代理",
  区县代: "区县代理",
  区县: "区县代理",
  STORE: "单店代理",
  store: "单店代理",
  单店代理: "单店代理",
  MEMBER: "门店成员",
  member: "门店成员",
  门店成员: "门店成员",
});

export function agencyTeamLevelLabel(item = {}) {
  const raw = String(
    item.levelLabel || item.roleLabel || item.agencyType || item.kind || "",
  ).trim();
  if (!raw) return "区域代理";
  return (
    levelLabels[raw] ||
    levelLabels[raw.toUpperCase()] ||
    levelLabels[raw.toLowerCase()] ||
    raw
  );
}

export function agencyTeamStoreCount(item = {}) {
  const direct = Number(item.storeCount ?? item.storesCount ?? item.storeTotal);
  if (Number.isFinite(direct) && direct >= 0) return direct;
  if (Array.isArray(item.stores)) return item.stores.length;
  return 0;
}

export function agencyTeamOwnerCount(item = {}) {
  const direct = Number(
    item.ownerCount ??
      item.costoreOwnerCount ??
      item.ownersCount ??
      item.bossCount,
  );
  if (Number.isFinite(direct) && direct >= 0) return direct;
  if (Array.isArray(item.owners)) return item.owners.length;
  return 0;
}

export function agencyTeamRegionNames(item = {}) {
  const lists = [
    item.territoryList,
    item.regionNames,
    item.regions,
    item.areas,
  ];
  for (const list of lists) {
    if (!Array.isArray(list) || !list.length) continue;
    const names = list
      .map((entry) => {
        if (entry == null) return "";
        if (typeof entry === "string" || typeof entry === "number")
          return String(entry).trim();
        return String(
          entry.name || entry.label || entry.regionLabel || entry.title || "",
        ).trim();
      })
      .filter(Boolean);
    if (names.length) return names;
  }
  const single = String(item.regionLabel || item.scopeLabel || "").trim();
  return single ? [single] : [];
}

function agencyTeamManagedCount(item = {}, unit) {
  const keys =
    unit === "市"
      ? ["managedCount", "cityCount", "regionCount", "areaCount"]
      : unit === "区县"
        ? [
            "managedCount",
            "countyCount",
            "districtCount",
            "regionCount",
            "areaCount",
          ]
        : unit === "省"
          ? ["managedCount", "provinceCount", "regionCount", "areaCount"]
          : ["managedCount", "regionCount", "areaCount"];
  for (const key of keys) {
    const value = Number(item[key]);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return agencyTeamRegionNames(item).length;
}

/**
 * Scope line beside 业绩统计:
 * - 市代 / 省代 / 区县代理: 代理某某某等n个市|省|区县
 * - 单店代理: 代理n个门店，n个合店老板
 */
export function agencyTeamScopeSummary(item = {}) {
  const level = agencyTeamLevelLabel(item);
  if (level === "市代" || level === "省代" || level === "区县代理") {
    const unit = level === "市代" ? "市" : level === "省代" ? "省" : "区县";
    const names = agencyTeamRegionNames(item);
    const count = agencyTeamManagedCount(item, unit);
    return {
      kind: "regional",
      level,
      unit,
      count,
      preview: names.slice(0, 2).join("、"),
    };
  }
  return {
    kind: "store",
    level,
    storeCount: agencyTeamStoreCount(item),
    ownerCount: agencyTeamOwnerCount(item),
  };
}

function normalizeMetricRows(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        label: String(item?.label || "").trim() || "业绩",
        value: Number.isFinite(Number(item?.value)) ? Number(item.value) : 0,
        kind: item?.kind || "money",
      }))
      .filter((item) => item.label);
  }
  if (value && typeof value === "object") {
    return agencyTeamMetricLabels
      .map((label) => {
        const keys =
          {
            本月业绩: ["month", "monthly", "monthAmount", "本月业绩"],
            季度业绩: ["quarter", "quarterly", "quarterAmount", "季度业绩"],
            半年业绩: ["halfYear", "half", "halfYearAmount", "上半年业绩"],
            本年业绩: ["year", "yearly", "yearAmount", "本年业绩"],
            累计业绩: [
              "total",
              "cumulative",
              "amount",
              "performance",
              "累计业绩",
            ],
          }[label] || [];
        for (const key of keys) {
          if (value[key] != null && Number.isFinite(Number(value[key]))) {
            return { label, value: Number(value[key]), kind: "money" };
          }
        }
        return null;
      })
      .filter(Boolean);
  }
  if (value == null || value === "") return [];
  if (Number.isFinite(Number(value)))
    return [{ label: "累计业绩", value: Number(value), kind: "money" }];
  return [];
}

/**
 * Always return the five designed metrics.
 * When performance payload is absent, values stay pending (undefined) so UI can skeleton.
 * When payload exists but a label is missing, treat as explicit 0.
 */
export function fillAgencyTeamMetrics(performance) {
  if (performance == null) {
    return agencyTeamMetricLabels.map((label) => ({
      label,
      value: undefined,
      kind: "money",
      pending: true,
    }));
  }
  const rows = normalizeMetricRows(performance);
  const byLabel = new Map(rows.map((item) => [item.label, item]));
  return agencyTeamMetricLabels.map((label) => {
    const found = byLabel.get(label);
    if (found) return found;
    return { label, value: 0, kind: "money" };
  });
}

export function normalizeAgencyStore(store) {
  if (!store || typeof store !== "object") return null;
  const id =
    store.id ||
    store.storeId ||
    store.number ||
    store.storeNo ||
    store.storeCode;
  const name = store.name || store.storeName || "";
  if (!id && !name) return null;
  return {
    ...store,
    id: id || name,
    name,
    number: store.number || store.storeNo || store.storeCode || "",
    address: storeDisplayAddress(store) || store.address || store.storeAddress || "",
    imageUrl: storePhotoUrl(store),
    monthlyFee: storeFeeAmount(store) ?? 0,
  };
}

export function normalizeAgencyTeamItem(item) {
  if (!item || typeof item !== "object" || !item.id) return null;
  const levelLabel = agencyTeamLevelLabel(item);
  const stores = Array.isArray(item.stores)
    ? item.stores.map(normalizeAgencyStore).filter(Boolean)
    : [];
  const owners = Array.isArray(item.owners) ? item.owners : [];
  return {
    ...item,
    levelLabel,
    partnerLevel: item.partnerLevel || levelLabel,
    storeCount: agencyTeamStoreCount({ ...item, stores }),
    ownerCount: agencyTeamOwnerCount({ ...item, owners }),
    performance: fillAgencyTeamMetrics(item.performance),
    stores,
    owners,
  };
}
