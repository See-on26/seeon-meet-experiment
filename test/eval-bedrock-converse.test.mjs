import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestConverseText, buildConverseUrl, buildInferenceConfig } from '../tools/eval/lib/bedrock-converse.mjs';
import { readBedrockConfig } from '../tools/eval/lib/bedrock-env.mjs';

// 3.2 이해 평가의 답변 모델 설정은 앱 설정이 아니라 실험실 평가 도구가 .env 에서 직접 읽는다.
test('답변 모델 설정은 .env 에서 읽고 없으면 기본값이다', () => {
  assert.deepEqual(readBedrockConfig({ env: {} }), {
    bedrockRegion: 'us-east-1', bedrockModelId: 'anthropic.claude-sonnet-5', bedrockApiKey: '', converseOrigin: '',
  });
  const config = readBedrockConfig({ env: { SEEON_BEDROCK_REGION: 'us-west-2', SEEON_BEDROCK_MODEL_ID: 'openai.gpt-oss-120b-1:0', AWS_BEARER_TOKEN_BEDROCK: 't' } });
  assert.deepEqual([config.bedrockRegion, config.bedrockModelId, config.bedrockApiKey], ['us-west-2', 'openai.gpt-oss-120b-1:0', 't']);
});

test('Converse 주소는 us. 접두를 붙이고, temperature 를 받지 않는 모델에는 넣지 않는다', () => {
  assert.equal(buildConverseUrl({ bedrockRegion: 'us-east-1', modelId: 'anthropic.claude-sonnet-5' }),
    'https://bedrock-runtime.us-east-1.amazonaws.com/model/us.anthropic.claude-sonnet-5/converse');
  assert.deepEqual(buildInferenceConfig({ modelId: 'anthropic.claude-sonnet-5', maxTokens: 10 }), { maxTokens: 10 });
  assert.deepEqual(buildInferenceConfig({ modelId: 'openai.gpt-oss-120b-1:0', maxTokens: 10 }), { maxTokens: 10, temperature: 0 });
});

test('토큰이 없으면 요청하지 않고 멈추고, 있으면 응답 글을 읽는다', async () => {
  const callList = [];
  const fetchImpl = async (url, init) => {
    callList.push({ url, authorization: init.headers.Authorization });
    return new Response(JSON.stringify({ output: { message: { content: [{ text: '답' }] } }, stopReason: 'end_turn' }));
  };
  const request = { modelId: 'openai.gpt-oss-120b-1:0', messageList: [], maxTokens: 10, timeoutMs: 1000, label: '시험', fetchImpl };
  await assert.rejects(() => requestConverseText({ ...request, config: readBedrockConfig({ env: {} }) }), /API 키가 없습니다/);
  assert.equal(callList.length, 0);
  const result = await requestConverseText({ ...request, config: readBedrockConfig({ env: { AWS_BEARER_TOKEN_BEDROCK: 'tok' } }) });
  assert.deepEqual([result.text, result.stopReason], ['답', 'end_turn']);
  assert.deepEqual(callList, [{ url: 'https://bedrock-runtime.us-east-1.amazonaws.com/model/us.openai.gpt-oss-120b-1:0/converse', authorization: 'Bearer tok' }]);
});
