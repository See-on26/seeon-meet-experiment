// viewer localStorage 'seeon.featureToggles' 에 페이지 스크립트보다 먼저 써 넣을 값.
// 평가 설정(회의록 3.2.1): 페이지 전환 안내·화자 안내·회의 요약을 끈다. 지시·발화·무발화는 항상 동작한다.
const FEATURE_TOGGLE_STORAGE_KEY = 'seeon.featureToggles';

const EVAL_PRESET_MAP = { page_transition: false, speaker_identity: false, meeting_summary: false };
const PRODUCT_DEFAULT_MAP = { page_transition: true, speaker_identity: true, meeting_summary: true };

function buildFeatureTogglePreset({ isEvalPreset }) {
  return { ...(isEvalPreset ? EVAL_PRESET_MAP : PRODUCT_DEFAULT_MAP) };
}

const FEATURE_TOGGLE_KEY_LIST = Object.keys(PRODUCT_DEFAULT_MAP);

// presetMap 이 없으면(시작할 때처럼 평가 설정을 바꾸지 않은 경우) 오른쪽 화면 저장값을 그대로 둔다.
function applyFeatureTogglePreset({ storage, presetMap }) {
  if (!storage || !presetMap) return false;
  storage.setItem(FEATURE_TOGGLE_STORAGE_KEY, JSON.stringify(presetMap));
  return true;
}

// production 화면이 저장한 기능 상태. 화면과 같은 규칙으로 빠진 기능은 켬으로 본다.
function readFeatureToggleMap({ storage }) {
  let storedMap = {};
  try {
    const parsed = JSON.parse(storage?.getItem(FEATURE_TOGGLE_STORAGE_KEY) || '{}');
    if (parsed && typeof parsed === 'object') storedMap = parsed;
  } catch {
    storedMap = {};
  }
  return Object.fromEntries(FEATURE_TOGGLE_KEY_LIST.map((key) => [key, typeof storedMap[key] === 'boolean' ? storedMap[key] : true]));
}

module.exports = {
  FEATURE_TOGGLE_STORAGE_KEY, FEATURE_TOGGLE_KEY_LIST, buildFeatureTogglePreset, applyFeatureTogglePreset, readFeatureToggleMap,
};
