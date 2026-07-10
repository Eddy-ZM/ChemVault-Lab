export interface ChemVaultLabBindings {
  AI?: Ai;
  AI_PROVIDER?: string;
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_BASE_URL?: string;
  DEEPSEEK_MODEL?: string;
  AI_STAGE_TIMEOUT_MS?: string;
  OPENAI_API_KEY?: string;
  LAB_BUCKET?: R2Bucket;
  LAB_DB?: D1Database;
  STORAGE_BUCKET?: string;
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  LAB_ACCESS_CODE?: string;
  USER_SYSTEM_URL?: string;
  USER_SYSTEM_PROFILE_ENDPOINT?: string;
  USER_SYSTEM_EXCHANGE_ENDPOINT?: string;
  USER_SYSTEM_CLIENT_ID?: string;
  USER_SYSTEM_CLIENT_SECRET?: string;
  USER_SYSTEM_REQUIRED_SERVICE?: string;
  OCR_PROVIDER?: string;
  OCR_API_KEY?: string;
  OCR_ENDPOINT?: string;
  APP_BASE_URL?: string;
  NODE_ENV?: string;
}
