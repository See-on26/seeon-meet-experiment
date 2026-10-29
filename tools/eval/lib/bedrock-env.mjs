import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export function loadRepoEnv({ envFilePath = path.join(REPO_ROOT, '.env'), loadEnvFile = process.loadEnvFile } = {}) {
  try {
    loadEnvFile(envFilePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

// 3.2 이해 평가의 답변 모델(Bedrock) 설정. 앱 설정(readPipelineConfig)에는 Bedrock 칸이 없으므로 .env 에서 직접 읽는다.
export const DEFAULT_BEDROCK_REGION = 'us-east-1';
export const DEFAULT_BEDROCK_MODEL_ID = 'anthropic.claude-sonnet-5';

export function readBedrockConfig({ env = process.env } = {}) {
  return {
    bedrockRegion: env.SEEON_BEDROCK_REGION || DEFAULT_BEDROCK_REGION,
    bedrockModelId: env.SEEON_BEDROCK_MODEL_ID || DEFAULT_BEDROCK_MODEL_ID,
    bedrockApiKey: env.AWS_BEARER_TOKEN_BEDROCK || '',
    converseOrigin: env.SEEON_BEDROCK_CONVERSE_ORIGIN || '',
  };
}

// 토큰이 없으면 3.2 는 답변 모델을 부르지 못한다. 그대로 돌리면 지표가 의미 없으므로 시작할 때 멈춘다.
// 3.1 탐지 평가는 판정을 GPU 서버만 하므로 토큰이 필요 없다.
export function assertBedrockToken({ env = process.env } = {}) {
  if (!env.AWS_BEARER_TOKEN_BEDROCK) {
    throw new Error('AWS_BEARER_TOKEN_BEDROCK 이 없다 — Bedrock 을 부를 수 없어 평가를 멈춘다 (.env 확인)');
  }
}
