/** Agency team level / performance presentation helpers. */
import areas from "china-area-data";
import { isMunicipalityProvince } from "../region";
import { storeDisplayAddress, storeFeeAmount, storePhotoUrl } from '../store-display'

export function agencyTeamRegionLabel(item = {}) {
  const raw = String(item.regionLabel || item.scopeLabel || "").trim();
  // API may return an administrative code with a store suffix, e.g.
  // `410201-S1`; it is still a region code and must be resolved by its
  // six-digit prefix rather than displayed verbatim.
  if (raw && !/^\d{6}(?:-[^\s]+)?$/.test(raw)) return raw;
  // Territory entries may carry a store suffix such as `410101-S1`.
  // Resolve the administrative code itself before looking up its name.
  const code = String(item.regionCode || item.areaCode || "")
    .trim()
    .split("-")[0];
  if (!/^\d{6}$/.test(code)) return raw || code;
  const provinceCode = `${code.slice(0, 2)}0000`;
  const cityCode = `${code.slice(0, 4)}00`;
  const type = String(item.agencyType || "").toUpperCase();
  const province = areas["86"]?.[provinceCode];
  const city = areas[provinceCode]?.[cityCode];
  const district = areas[cityCode]?.[code];
  // The current agent type describes the owner of the territory, not
  // necessarily the level of each territory item. A city agent can manage
  // several district codes, so choose the label from the code depth first.
  if (code.endsWith("0000")) return province || raw || code;
  if (code.endsWith("00")) return city || raw || code;
  if (type === "PROVINCE" && province) return province || raw || code;
  if (type === "CITY" && district) return district || raw || code;
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

function officialTeamMetricLabel(label) {
  const value = String(label || "").trim();
  if (value === "半年业绩" || value === "上半年业绩" || value === "最近半年业绩") return "上半年业绩";
  if (value === "本年业绩" || value === "最近一年业绩" || value === "近一年业绩") return "本年业绩";
  return value;
}

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

function municipalityCountyInsteadOfCity(item = {}) {
  const code = String(item.regionCode || item.areaCode || item.code || "")
    .trim()
    .split("-")[0];
  if (!/^\d{6}$/.test(code) || code.endsWith("0000")) return false;
  return isMunicipalityProvince(`${code.slice(0, 2)}0000`);
}

export function agencyTeamLevelLabel(item = {}) {
  const raw = String(
    item.levelLabel || item.roleLabel || item.agencyType || item.kind || "",
  ).trim();
  const rawType = raw.toUpperCase();
  if ((rawType === "CITY" || raw === "市代") && municipalityCountyInsteadOfCity(item)) {
    return "区县代理";
  }
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
    // regions / regionLabels are the agent's authorized regions returned by
    // the API. territoryList describes its downstream coverage and must not
    // replace the authorized-region summary.
    item.regionLabels,
    item.regions,
    item.regionNames,
    item.areas,
    item.territoryList,
  ];
  for (const list of lists) {
    if (!Array.isArray(list) || !list.length) continue;
    const names = list
      .map((entry) => {
        if (entry == null) return "";
        if (typeof entry === "string" || typeof entry === "number") {
          const value = String(entry).trim();
          return agencyTeamRegionLabel({
            ...item,
            regionCode: value,
            regionLabel: value,
          });
        }
        const value = String(
          entry.name || entry.label || entry.regionLabel || entry.title ||
            entry.code || entry.regionCode || "",
        ).trim();
        return agencyTeamRegionLabel({
          ...item,
          ...entry,
          regionCode: entry.regionCode || entry.areaCode || entry.code || value,
          regionLabel: value,
        });
      })
      .filter(Boolean);
    if (names.length) return names;
  }
  const single = String(item.regionLabel || item.scopeLabel || "").trim();
  return single ? [single] : [];
}

export function agencyAdcode(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const head = raw.split("-")[0];
  if (/^\d{6}$/.test(head)) return head;
  const matched = raw.match(/\d{6}/);
  return matched ? matched[0] : "";
}

export function agencyTeamServiceAreas(item = {}) {
  const territoryLabel = (area) =>
    agencyTeamRegionLabel({
      ...item,
      regionCode:
        typeof area === "object"
          ? area.regionCode || area.areaCode || area.code
          : area,
      regionLabel:
        typeof area === "object"
          ? area.name ||
            area.label ||
            area.regionLabel ||
            area.title ||
            area.code
          : area,
    });
  if (Array.isArray(item.regions) && item.regions.length) {
    return item.regions
      .map((area, index) => {
        const code = String(
          area?.regionCode || area?.areaCode || area?.code || "",
        ).trim();
        const label = String(
          area?.regionLabel ||
            area?.label ||
            area?.name ||
            territoryLabel(area),
        ).trim();
        return { key: code || label || index, code, label: label || code };
      })
      .filter((area) => area.label);
  }
  if (Array.isArray(item.regionLabels) && item.regionLabels.length) {
    return item.regionLabels
      .map((label, index) => ({
        key: `${label}-${index}`,
        code:
          item.regionLabels.length === 1 ? String(item.regionCode || "") : "",
        label: String(label),
      }))
      .filter((area) => area.label);
  }
  const list = Array.isArray(item.territoryList) ? item.territoryList : [];
  return list
    .map((area, index) => ({
      key: String(area) || index,
      code:
        typeof area === "object"
          ? String(area.regionCode || area.areaCode || area.code || "")
          : String(area),
      label: territoryLabel(area),
    }))
    .filter((area) => area.label);
}

/**
 * Viewer scope from getBusinessContext:
 * regionCode / region_code (6-digit adcode, optional suffix like 410201-S1),
 * agencyType (wired from agencyType / regionType), regionType as fallback.
 * `scope` is an identity id (agency:accountId:assignmentId), not an adcode.
 */
export function viewerAgencyRegionScope(context = {}) {
  const agencyType = String(
    context?.agencyType || context?.regionType || "",
  ).toUpperCase();
  const code = agencyAdcode(context?.regionCode || context?.region_code || "");
  let kind = "";
  if (agencyType === "PROVINCE" || (code && code.endsWith("0000"))) {
    kind = "PROVINCE";
  } else if (
    agencyType === "CITY" ||
    (code && code.endsWith("00") && !code.endsWith("0000"))
  ) {
    kind = "CITY";
  } else if (agencyType === "COUNTY" || agencyType === "DISTRICT") {
    kind = "COUNTY";
  }
  const digits =
    kind === "PROVINCE" ? 2 : kind === "CITY" ? 4 : kind === "COUNTY" ? 6 : 0;
  const prefix = code && digits ? code.slice(0, digits) : "";
  return { agencyType: kind, code, prefix, digits, usable: Boolean(prefix) };
}

export function areaInViewerAgencyScope(area, context) {
  const scope = viewerAgencyRegionScope(context);
  if (!scope.usable) return null;
  const code = agencyAdcode(
    area && typeof area === "object"
      ? area.code || area.regionCode || area.areaCode
      : area,
  );
  if (!code) return false;
  return code.startsWith(scope.prefix);
}

export function viewerScopedAgencyAreaLabel(area, context) {
  const scope = viewerAgencyRegionScope(context);
  const code = agencyAdcode(
    area && typeof area === "object"
      ? area.code || area.regionCode || area.areaCode
      : area,
  );
  if (scope.agencyType === "PROVINCE" && code) {
    if (isMunicipalityProvince(`${code.slice(0, 2)}0000`)) {
      return agencyTeamRegionLabel({ regionCode: code, agencyType: "COUNTY" });
    }
    return agencyTeamRegionLabel({ regionCode: `${code.slice(0, 4)}00` });
  }
  if (code) return agencyTeamRegionLabel({ regionCode: code });
  if (area && typeof area === "object") {
    return String(area.label || area.regionLabel || area.name || "").trim();
  }
  return String(area || "").trim();
}

export function sortAgencyTeamServiceAreasByViewer(areas, context) {
  const list = Array.isArray(areas) ? areas : [];
  if (!viewerAgencyRegionScope(context).usable) return list.slice();
  const inside = [];
  const outside = [];
  for (const area of list) {
    if (areaInViewerAgencyScope(area, context)) inside.push(area);
    else outside.push(area);
  }
  return inside.concat(outside);
}

export function firstViewerAgencyAreaIndex(areas, context) {
  const list = Array.isArray(areas) ? areas : [];
  if (!viewerAgencyRegionScope(context).usable) return 0;
  const index = list.findIndex((area) => areaInViewerAgencyScope(area, context));
  return index >= 0 ? index : 0;
}

export function agencyTeamViewerRegionLabel(item = {}, context = {}) {
  const areas = agencyTeamServiceAreas(item);
  const scope = viewerAgencyRegionScope(context);
  const filtered = scope.usable
    ? areas.filter((area) => areaInViewerAgencyScope(area, context))
    : [];
  if (scope.usable) {
    if (!filtered.length) return agencyTeamRegionLabel(item);
    return viewerScopedAgencyAreaLabel(filtered[0], context) || agencyTeamRegionLabel(item);
  }
  const picked = areas[0];
  if (!picked) return agencyTeamRegionLabel(item);
  return (
    picked.label ||
    agencyTeamRegionLabel({ regionCode: picked.code, regionLabel: picked.label }) ||
    agencyTeamRegionLabel(item)
  );
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
      text: names.length
        ? count <= 1
          ? `代理${names[0]}`
          : `代理${names.slice(0, 2).join("、")}等${count}个${unit}`
        : `代理${count}个${unit}`,
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
        label: officialTeamMetricLabel(String(item?.label || "").trim()) || "业绩",
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
            上半年业绩: ["halfYear", "half", "halfYearAmount", "半年业绩", "上半年业绩", "最近半年业绩"],
            本年业绩: ["year", "yearly", "yearAmount", "本年业绩", "最近一年业绩", "近一年业绩"],
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
 * Fill the official five agency team performance metrics.
 * Official labels: 本月业绩、季度业绩、上半年业绩、本年业绩、累计业绩.
 * Amounts stay in yuan. Old labels alias into official display names
 * (半年业绩 / 最近半年业绩 → 上半年业绩; 最近一年业绩 / 近一年业绩 → 本年业绩).
 * Items 3/4 remain rolling last 6 / 12 months — this helper only remaps labels.
 * null / undefined / non-object must stay unfilled: never five zeros or a pending skeleton.
 * Callers show the performance module only when Array.isArray(performance).
 */
export function fillAgencyTeamMetrics(performance) {
  if (performance == null || typeof performance !== "object") {
    return null;
  }
  const rows = normalizeMetricRows(performance);
  const byLabel = new Map();
  for (const item of rows) {
    const key = officialTeamMetricLabel(item.label);
    if (!byLabel.has(key)) byLabel.set(key, { ...item, label: key });
  }
  return agencyTeamMetricLabels.map((label) => {
    const found = byLabel.get(label);
    if (found) return { ...found, label };
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
  const agencyType = levelLabel === "区县代理" && municipalityCountyInsteadOfCity(item)
    ? "COUNTY"
    : item.agencyType;
  const stores = Array.isArray(item.stores)
    ? item.stores.map(normalizeAgencyStore).filter(Boolean)
    : [];
  const owners = Array.isArray(item.owners) ? item.owners : [];
  return {
    ...item,
    agencyType,
    levelLabel,
    partnerLevel: item.partnerLevel || levelLabel,
    storeCount: agencyTeamStoreCount({ ...item, stores }),
    ownerCount: agencyTeamOwnerCount({ ...item, owners }),
    performance: Array.isArray(item.performance)
      ? fillAgencyTeamMetrics(item.performance)
      : item.performance == null
        ? null
        : item.performance,
    parentId: item.parentId,
    parentAssignmentId: item.parentAssignmentId,
    parentUserId: item.parentUserId,
    directDownline: item.directDownline,
    stores,
    owners,
  };
}
