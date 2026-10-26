import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NarrationMixer } from '../src/renderer/core/audio-renderer/narration-mixer.js';
import { CaptionNarrator } from '../src/renderer/core/audio-renderer/caption-narrator.js';

function createConnectableNode(extra = {}) {
  return { ...extra, connectedList: [], connect(node) { this.connectedList.push(node); } };
}

function createFakeAudioContext() {
  return {
    state: 'running',
    currentTime: 0,
    destination: { name: 'destination' },
    createAnalyser: () => createConnectableNode({ fftSize: 0 }),
    createGain: () => createConnectableNode({ gain: { value: 1 } }),
    createStereoPanner: () => createConnectableNode({ pan: { value: 0 } }),
    createMediaStreamSource: () => createConnectableNode({ disconnect() {} }),
    resume: async () => {},
    close: async () => {},
  };
}

const fakeStream = { getAudioTracks: () => [] };

test('동시 모드: 해설은 오른쪽 채널(SEEON 패널 쪽)에만, 회의 소리는 왼쪽 채널(회의 화면 쪽)에만 나온다', () => {
  const mixer = new NarrationMixer({ createAudioContext: createFakeAudioContext });
  mixer.start(fakeStream);
  const [narrationPanner] = mixer.narrationGainNode.connectedList;
  const [meetingPanner] = mixer.duckGainNode.connectedList;
  // 스테레오 패너를 끝까지(±1) 밀면 반대쪽 채널은 소리가 0 이다(원음이 오른쪽 귀에 섞이지 않는다).
  assert.equal(narrationPanner.pan.value, 1);
  assert.equal(meetingPanner.pan.value, -1);
});

test('질문 답은 모든 모드에서 해설과 같은 오른쪽 채널에서 나온다', () => {
  const narrator = new CaptionNarrator({ getLiveVideo: () => null, createAudioContext: createFakeAudioContext });
  narrator.start(fakeStream);
  assert.equal(narrator.answerPanner.pan.value, 1);
});
