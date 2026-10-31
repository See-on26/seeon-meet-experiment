const { buildFeatureTogglePreset, FEATURE_TOGGLE_KEY_LIST } = require('./feature-toggle-preset');

const isSameToggleMap = (leftMap, rightMap) => FEATURE_TOGGLE_KEY_LIST.every((key) => leftMap[key] === rightMap[key]);

// 조작 바의 "평가 설정"과 production 화면(오른쪽) 기능 설정을 맞춘다.
// 평가 설정은 처음 뜰 때와 체크를 바꿀 때만 오른쪽에 써 넣는다. 시작 버튼이 화면을 새로 불러와도 덮어쓰지 않아
// 사용자가 오른쪽에서 켠 기능이 그대로 남는다. 오른쪽에서 평가 설정과 다르게 바꾸면 평가 설정을 푼다.
function createFeaturePresetState({ isEvalPreset = true } = {}) {
  let currentIsEvalPreset = isEvalPreset;
  let pendingMap = buildFeatureTogglePreset({ isEvalPreset });
  let viewerMap = null;

  return {
    getIsEvalPreset: () => currentIsEvalPreset,

    setEvalPreset(nextIsEvalPreset) {
      if (nextIsEvalPreset === currentIsEvalPreset) return { isChanged: false };
      currentIsEvalPreset = nextIsEvalPreset;
      pendingMap = buildFeatureTogglePreset({ isEvalPreset: nextIsEvalPreset });
      return { isChanged: true };
    },

    // 오른쪽 화면을 불러올 때 써 넣을 값. 없으면 null(오른쪽 저장값을 그대로 둔다).
    takePendingMap() {
      const map = pendingMap;
      pendingMap = null;
      return map;
    },

    // 오른쪽 화면이 알린 실제 기능 상태. 써 넣을 값이 남아 있으면 아직 옛 화면의 알림이라 평가 설정을 풀지 않는다.
    reportViewerMap(map) {
      viewerMap = { ...map };
      const isDiverged = !isSameToggleMap(viewerMap, buildFeatureTogglePreset({ isEvalPreset: true }));
      if (!currentIsEvalPreset || pendingMap !== null || !isDiverged) return { isEvalPresetReleased: false };
      currentIsEvalPreset = false;
      return { isEvalPresetReleased: true };
    },

    getFeatureToggleMap: () => (viewerMap ? { ...viewerMap } : buildFeatureTogglePreset({ isEvalPreset: currentIsEvalPreset })),
  };
}

module.exports = { createFeaturePresetState };
