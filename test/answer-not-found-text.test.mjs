import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  createQuestionAnswerer, isNotFoundAnswerText, resolveAnswerText, NOT_FOUND_TEXT, OFF_TOPIC_TEXT,
  SPEAKER_UNKNOWN_TEXT, NO_IMAGE_TEXT, readAnswerText, ANSWER_TEXT_KEY_MAP,
} = require('../src/main/caption-pipeline/context/question-answerer.js');
const { QUESTION_ROUTE_MAP } = require('../src/main/caption-pipeline/context/question-classifier.js');

// 질문의 근거가 화면·발화에 없으면 모델이 쓴 거절 문장 대신 늘 "화면과 발화에 없는 내용이에요" 로 답한다.
const ENGLISH_NOT_FOUND_TEXT = readAnswerText({ key: ANSWER_TEXT_KEY_MAP.notFound, language: 'en' });

test('거절 문장: 숫자 없이 못 찾았다고만 말하는 답은 근거 없음으로 본다', () => {
  const refusalList = [
    '제시된 화면에는 한국의 소금 섭취량에 대한 정보는 나와 있지 않습니다.',
    '화면에 그 내용은 나오지 않아요.', '그래프에 해당 항목이 보이지 않습니다.', '자료에 포함되어 있지 않아요.',
    '발표자가 언급되지 않은 내용이에요.', '관련 정보가 없습니다.', 'That information is not on the screen.',
  ];
  for (const text of refusalList) assert.equal(isNotFoundAnswerText(text), true, text);
  // 숫자가 든 답은 일부를 못 찾았다고 해도 답이 있는 것으로 본다.
  assert.equal(isNotFoundAnswerText('2023년 값은 보이지 않지만 2024년은 10.9그램이에요.'), false);
  assert.equal(isNotFoundAnswerText('남성은 10.9그램, 여성은 9.3그램을 섭취해요.'), false);
  assert.equal(isNotFoundAnswerText('규칙은 모음 카드의 뒷면이 홀수여야 한다는 거예요.'), false);
});

test('답 문구 고르기: 근거가 없거나 비었거나 거절 문장이면 고정 문구, 아니면 답을 그대로 쓴다', () => {
  assert.deepEqual(resolveAnswerText({ text: '', isGrounded: false }), { text: NOT_FOUND_TEXT, isGrounded: false });
  assert.deepEqual(resolveAnswerText({ text: '무엇이든', isGrounded: false }), { text: NOT_FOUND_TEXT, isGrounded: false });
  assert.deepEqual(resolveAnswerText({ text: '화면에 나와 있지 않습니다.', isGrounded: true }), { text: NOT_FOUND_TEXT, isGrounded: false });
  assert.deepEqual(resolveAnswerText({ text: 'Not shown on this slide.', isGrounded: true, language: 'en' }), {
    text: ENGLISH_NOT_FOUND_TEXT, isGrounded: false,
  });
  assert.deepEqual(resolveAnswerText({ text: '카드는 A, 3, J, 4예요.', isGrounded: true }), { text: '카드는 A, 3, J, 4예요.', isGrounded: true });
  // 앱이 정한 다른 고정 문구는 그대로 둔다.
  for (const text of [OFF_TOPIC_TEXT, SPEAKER_UNKNOWN_TEXT, NO_IMAGE_TEXT, NOT_FOUND_TEXT]) {
    assert.equal(resolveAnswerText({ text, isGrounded: true }).text, text, text);
  }
});

test('질문 답: 화자·회의 흐름 갈래도 모델의 거절 문장을 고정 문구로 바꾼다', async () => {
  const contextStore = {
    getSessionInfo: () => ({ startedAt: 0 }), getQaList: () => [], getNarrationList: () => [],
    getUtteranceList: () => [{ ts: 1000, text: '매출이 늘었습니다', speakerHint: '김동욱' }], getSlide: () => null,
    buildIndex: () => [{ major: 1, displayNumber: 1, title: '매출', summary: '' }],
  };
  const answerer = createQuestionAnswerer({
    requestText: async () => '기록에는 그 사람이 누구인지 나와 있지 않습니다.',
    requestImage: async () => '', readImage: async () => null, contextStore, now: () => 2000,
  });
  const wordBudget = { minWordCount: 2, maxWordCount: 30 };
  for (const route of [QUESTION_ROUTE_MAP.speaker, QUESTION_ROUTE_MAP.meetingFlow]) {
    const result = await answerer.answer({ route, questionText: '누가 말했어?', wordBudget });
    assert.deepEqual({ text: result.text, isGrounded: result.isGrounded }, { text: NOT_FOUND_TEXT, isGrounded: false }, route);
  }
});

test('연결: 프리셋 명령과 질문 처리기는 답 문구 고르기를 거쳐, 근거가 없어도 고정 문구를 들려준다', () => {
  const source = fs.readFileSync(new URL('../src/main/caption-pipeline/index.js', import.meta.url), 'utf8');
  const commandStart = source.indexOf("ipcMain.handle('pipeline-command'");
  const questionStart = source.indexOf("ipcMain.handle('pipeline-question'");
  const commandBody = source.slice(commandStart, questionStart);
  const questionBody = source.slice(questionStart, source.indexOf('ipcMain.handle(', questionStart + 10));
  assert.match(commandBody, /resolveAnswerText\(/);
  assert.match(questionBody, /resolveAnswerText\(/);
  // 근거가 없을 때 아무 말 없이 끝내던 갈래가 없어야 한다.
  assert.doesNotMatch(commandBody, /return \{ isOk: true, isGrounded: false \};/);
  assert.match(commandBody, /sendCaption\(/);
});
