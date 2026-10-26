import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readQuestionBlockedTextKey } from '../src/renderer/core/command/question-gate.js';
import { UI_TEXT_MAP } from '../src/renderer/core/i18n/ui-text.js';

// 일시정지하면 캡처·해설을 바로 멈추므로 그사이 질문(화면을 찍어 GPU 로 보내는 일)도 받지 않는다.
test('질문을 막는 까닭: 캡처 전이면 캡처 안내, 일시정지 중이면 일시정지 안내, 아니면 없음', () => {
  assert.equal(readQuestionBlockedTextKey({ isCapturing: false, isPaused: false }), 'question.notCapturing');
  assert.equal(readQuestionBlockedTextKey({ isCapturing: false, isPaused: true }), 'question.notCapturing');
  assert.equal(readQuestionBlockedTextKey({ isCapturing: true, isPaused: true }), 'question.paused');
  assert.equal(readQuestionBlockedTextKey({ isCapturing: true, isPaused: false }), null);
  assert.equal(UI_TEXT_MAP.ko['question.paused'], '일시정지 중에는 질문할 수 없어요');
  assert.equal(UI_TEXT_MAP.en['question.paused'], "You can't ask questions while paused");
});

test('연결: 입력창·프리셋 질문과 음성 질문이 같은 판단으로 막는다', () => {
  const source = fs.readFileSync(new URL('../src/renderer/app/main.js', import.meta.url), 'utf8');
  const askStart = source.indexOf('async function askQuestion(');
  const askBody = source.slice(askStart, source.indexOf('async function requestAnswer(', askStart));
  assert.match(askBody, /readQuestionBlockedTextKey\(\{ isCapturing: captureSource\.isActive, isPaused: isExperimentPaused \}\)/);
  assert.match(source, /readStartBlockedTextKey: \(\) => readQuestionBlockedTextKey\(\{ isCapturing: captureSource\.isActive, isPaused: isExperimentPaused \}\)/);
});
