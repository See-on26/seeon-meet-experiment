import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createFeaturePresetState } = require('../src/main/lab/feature-preset-state.js');
const { readFeatureToggleMap, FEATURE_TOGGLE_STORAGE_KEY } = require('../src/main/lab/feature-toggle-preset.js');

const EVAL_MAP = { page_transition: false, speaker_identity: false, meeting_summary: false };
const PRODUCT_MAP = { page_transition: true, speaker_identity: true, meeting_summary: true };

test('처음 뜰 때만 평가 설정을 오른쪽 화면에 써 넣고, 그 뒤 새로 불러올 때(시작)는 오른쪽 설정을 그대로 둔다', () => {
  const state = createFeaturePresetState();
  assert.deepEqual(state.takePendingMap(), EVAL_MAP);
  assert.equal(state.takePendingMap(), null);

  assert.deepEqual(state.setEvalPreset(true), { isChanged: false });
  assert.equal(state.takePendingMap(), null, '체크를 바꾸지 않고 시작하면 덮어쓰지 않는다');
});

test('왼쪽 평가 설정 체크를 바꾸면 다음에 불러올 때 그 값으로 쓴다(켜면 세 기능 끔, 끄면 세 기능 켬)', () => {
  const state = createFeaturePresetState();
  state.takePendingMap();
  assert.deepEqual(state.setEvalPreset(false), { isChanged: true });
  assert.deepEqual(state.takePendingMap(), PRODUCT_MAP);
  assert.deepEqual(state.setEvalPreset(true), { isChanged: true });
  assert.deepEqual(state.takePendingMap(), EVAL_MAP);
});

test('오른쪽에서 평가 설정과 다르게 바꾸면 평가 설정이 풀린다', () => {
  const state = createFeaturePresetState();
  state.takePendingMap();
  assert.deepEqual(state.reportViewerMap(EVAL_MAP), { isEvalPresetReleased: false });
  assert.equal(state.getIsEvalPreset(), true);

  assert.deepEqual(state.reportViewerMap({ ...EVAL_MAP, page_transition: true }), { isEvalPresetReleased: true });
  assert.equal(state.getIsEvalPreset(), false);
  assert.equal(state.takePendingMap(), null, '풀어도 오른쪽 설정은 덮어쓰지 않는다');
  assert.deepEqual(state.setEvalPreset(false), { isChanged: false }, '풀린 뒤 체크 해제로 시작해도 덮어쓰지 않는다');
});

test('평가 설정을 막 바꿔 아직 새로 불러오기 전에는 옛 화면의 알림으로 풀지 않는다', () => {
  const state = createFeaturePresetState();
  state.takePendingMap();
  state.setEvalPreset(false);
  state.setEvalPreset(true);
  assert.deepEqual(state.reportViewerMap(PRODUCT_MAP), { isEvalPresetReleased: false });
  assert.equal(state.getIsEvalPreset(), true);
});

test('기록에는 오른쪽 화면이 실제로 쓴 기능 상태를 적고, 알림이 없으면 평가 설정 값을 적는다', () => {
  const state = createFeaturePresetState();
  assert.deepEqual(state.getFeatureToggleMap(), EVAL_MAP);
  state.takePendingMap();
  state.reportViewerMap({ ...EVAL_MAP, page_transition: true });
  assert.deepEqual(state.getFeatureToggleMap(), { ...EVAL_MAP, page_transition: true });
});

test('오른쪽 화면 저장값을 읽을 때 빠진 기능은 제품 기본(켬)으로, 깨진 값은 모두 켬으로 본다', () => {
  const storage = (value) => ({ getItem: (key) => (key === FEATURE_TOGGLE_STORAGE_KEY ? value : null) });
  assert.deepEqual(readFeatureToggleMap({ storage: storage('{"page_transition":false}') }), { ...PRODUCT_MAP, page_transition: false });
  assert.deepEqual(readFeatureToggleMap({ storage: storage('깨진 값') }), PRODUCT_MAP);
  assert.deepEqual(readFeatureToggleMap({ storage: storage(null) }), PRODUCT_MAP);
});

test('오른쪽 화면은 기능을 바꿀 때마다 실제 상태를 알리고, 시작 때 덮어쓸 값이 없으면 저장값을 건드리지 않는다', () => {
  const preloadSource = fs.readFileSync(new URL('../src/preload/lab-viewer.js', import.meta.url), 'utf8');
  assert.match(preloadSource, /setFeatureToggles\(args\) \{/);
  assert.match(preloadSource, /ipcRenderer\.send\('lab-viewer-feature-toggles', readFeatureToggleMap\(\{ storage: window\.localStorage \}\)\)/);
  const ipcSource = fs.readFileSync(new URL('../src/main/lab/lab-ipc.js', import.meta.url), 'utf8');
  assert.match(ipcSource, /ipcMain\.on\('lab-viewer-preset', \(event\) => \{ event\.returnValue = featurePresetState\.takePendingMap\(\); \}\)/);
  assert.match(ipcSource, /ipcMain\.handle\('lab-eval-preset'/);
  assert.match(ipcSource, /getFeatureToggleMap: \(\) => featurePresetState\.getFeatureToggleMap\(\)/);
  const controlSource = fs.readFileSync(new URL('../src/renderer/lab/control.js', import.meta.url), 'utf8');
  assert.match(controlSource, /window\.labControl\.setEvalPreset\(\{ isEvalPreset/);
  assert.match(controlSource, /window\.labControl\.onEvalPresetState\(/);
});
