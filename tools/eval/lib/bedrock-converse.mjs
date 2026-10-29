// 3.2 이해 평가의 답변 모델 호출(Bedrock Converse). 평가 문항에 답하는 상용 LLM 이라 실험실 평가 도구에만 둔다 —
// 앱(src)은 자체 GPU 서버만 부른다.
export const TEMPERATURE_DEPRECATED_MODEL_LIST = [
  'anthropic.claude-sonnet-5',
  'anthropic.claude-opus-4-7',
];

export const CONVERSE_TEMPERATURE = 0;

export function ensureUsPrefix(modelId) {
  return modelId.startsWith('us.') ? modelId : `us.${modelId}`;
}

export function buildInferenceConfig({ modelId, maxTokens }) {
  const bareModelId = modelId.startsWith('us.') ? modelId.slice('us.'.length) : modelId;
  const isTemperatureDeprecated = TEMPERATURE_DEPRECATED_MODEL_LIST
    .some((deprecatedModelId) => bareModelId.startsWith(deprecatedModelId));
  if (isTemperatureDeprecated) return { maxTokens };
  return { maxTokens, temperature: CONVERSE_TEMPERATURE };
}

export function buildConverseUrl({ bedrockRegion, modelId, converseOrigin = '' }) {
  const origin = converseOrigin || `https://bedrock-runtime.${bedrockRegion}.amazonaws.com`;
  return `${origin}/model/${ensureUsPrefix(modelId)}/converse`;
}

export function readConverseText({ json }) {
  const partList = json?.output?.message?.content;
  if (!Array.isArray(partList)) return '';
  const textPart = partList.find((part) => typeof part?.text === 'string' && part.text.trim());
  return textPart ? textPart.text : '';
}

// config 는 readBedrockConfig(bedrock-env.mjs)가 .env 에서 읽은 { bedrockRegion, bedrockApiKey, converseOrigin }.
export async function requestConverseText({ config, modelId, systemPrompt = '', messageList,
  maxTokens, timeoutMs, label, fetchImpl = fetch }) {
  if (!Number.isFinite(timeoutMs)) {
    throw new Error(`Bedrock(${label}): timeoutMs를 반드시 지정해야 합니다`);
  }
  if (!config.bedrockApiKey) {
    throw new Error(`Bedrock(${label}): API 키가 없습니다`);
  }
  const requestBody = {
    messages: messageList,
    inferenceConfig: buildInferenceConfig({ modelId, maxTokens }),
  };

  if (systemPrompt) requestBody.system = [{ text: systemPrompt }];

  const response = await fetchImpl(buildConverseUrl({
    bedrockRegion: config.bedrockRegion, modelId, converseOrigin: config.converseOrigin,
  }), {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.bedrockApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const body = (await response.text()).slice(0, 300);
    throw new Error(`Bedrock(${label}) HTTP ${response.status} ${body}`);
  }
  const json = await response.json();
  return {
    text: readConverseText({ json }),
    stopReason: json?.stopReason || '',
    usage: json?.usage || null,
  };
}
