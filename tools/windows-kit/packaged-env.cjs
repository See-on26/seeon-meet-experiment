// 설치본 resources 의 .env 에 넣을 줄을 고른다. 앱이 실행 중에 읽는 SEEON_ 설정 줄만 남기고
// 주석·빈 줄·다른 키(외부 AI 서비스 키 등)·개발 PC 전용 값은 모두 버린다. 주석으로 적어 둔 접속 정보도 설치본에 들어가지 않는다.
const APP_ENV_KEY_PREFIX = 'SEEON_';
// 개발 PC 에서만 맞는 값. 설치본에 들어가면 Windows 에 없는 맥 경로를 가리키거나 터널을 꺼 버린다.
const DEV_ONLY_ENV_KEY_LIST = ['SEEON_GPU_SSH_KEY', 'SEEON_GPU_TUNNEL'];
// 앱은 외부 AI 서비스(Bedrock·OpenAI·Gemini 등)를 쓰지 않으므로 그 설정은 SEEON_ 으로 시작해도 넣지 않는다.
const UNUSED_APP_ENV_KEY_PREFIX_LIST = ['SEEON_BEDROCK_'];

function readEnvKey(line) {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
  return match ? match[1] : null;
}

function isPackagedEnvKey(key) {
  if (!key.startsWith(APP_ENV_KEY_PREFIX) || DEV_ONLY_ENV_KEY_LIST.includes(key)) return false;
  return !UNUSED_APP_ENV_KEY_PREFIX_LIST.some((prefix) => key.startsWith(prefix));
}

function isPackagedEnvLine(line) {
  const key = readEnvKey(line);
  return key !== null && isPackagedEnvKey(key);
}

function sanitizeEnvText(text) {
  return text.split(/\r?\n/).filter(isPackagedEnvLine).join('\n');
}

// 설치본에 넣지 않는 줄 수(빈 줄은 세지 않는다). 줄 내용은 돌려주지 않는다.
function countUnpackagedEnvLine(text) {
  return text.split(/\r?\n/).filter((line) => line.trim() && !isPackagedEnvLine(line)).length;
}

module.exports = { readEnvKey, sanitizeEnvText, countUnpackagedEnvLine, DEV_ONLY_ENV_KEY_LIST };
