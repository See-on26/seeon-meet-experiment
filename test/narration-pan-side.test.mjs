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
    createStereoPanner: () => createConnectableNode({ pan: { value: 0 }, channelCount: 2, channelCountMode: 'clamped-max' }),
    createPanner: () => createConnectableNode({
      panningModel: 'equalpower', distanceModel: 'inverse', positionX: { value: 0 }, positionY: { value: 0 }, positionZ: { value: 0 },
    }),
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
  // 스테레오 입력을 그대로 끝까지 밀면 좌우가 한쪽으로 더해져 두 배로 커진다. 1채널로 내려 섞은 뒤 한쪽으로 보낸다.
  for (const panner of [narrationPanner, meetingPanner]) {
    assert.equal(panner.channelCount, 1);
    assert.equal(panner.channelCountMode, 'explicit');
  }
});

test('교차 모드: 질문 답은 채널을 나누지 않고 오른쪽(SEEON 패널 쪽)에서 들리게만 해 한쪽 귀로도 들린다', () => {
  const narrator = new CaptionNarrator({ getLiveVideo: () => null, createAudioContext: createFakeAudioContext });
  narrator.start(fakeStream);
  assert.equal(narrator.answerPanner.panningModel, 'HRTF');
  assert.equal(narrator.answerPanner.positionX.value, 0.7);
  assert.equal(narrator.answerPanner.connectedList[0], narrator.ttsGainNode);
});
