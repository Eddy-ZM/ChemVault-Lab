export type AIStageName =
  | "classify_uploaded_documents"
  | "detect_experiment"
  | "detect_reaction"
  | "extract_chemicals"
  | "extract_raw_data"
  | "identify_calculations"
  | "generate_structured_json";

export interface AIStagePrompt {
  stage: AIStageName;
  system: string;
  user: string;
}

export interface AIProviderEnv {
  AI?: Ai;
  AI_PROVIDER?: string;
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_BASE_URL?: string;
  DEEPSEEK_MODEL?: string;
  AI_STAGE_TIMEOUT_MS?: string;
  OPENAI_API_KEY?: string;
  LOCAL_AI_ENDPOINT?: string;
  OCR_PROVIDER?: string;
  OCR_API_KEY?: string;
  OCR_ENDPOINT?: string;
}

export interface AIProvider {
  name: string;
  isConfigured(): boolean;
  completeJson<T>(prompt: AIStagePrompt, fallback: T): Promise<T>;
}
