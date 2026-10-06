export type Channel = "kakao" | "instagram" | "linkedin" | "email";
/** auto: AI가 받는 사람을 보고 판단 */
export type Speech = "auto" | "polite" | "plain";
export type Level = 1 | 2 | 3;
export type Version = "base" | "formal" | "casual" | "english" | "concise";

export interface MessageInput {
  recipient: string;
  speech: Speech;
  /** 비어 있으면 대상·상황만으로 추천 */
  message: string;
  channel: Channel | null;
  situation: string;
}

export interface GenerateRequest extends MessageInput {
  level: Level;
  version: Version;
  /** version === "english"일 때 번역할 완성본 */
  sourceText?: string;
  sourceSubject?: string;
}

export interface GenerateResponse {
  subject?: string;
  body: string;
  assumptions: string[];
}

/** 세션 안의 완성본 하나. id는 uuid, 시간은 ISO 문자열 (Supabase uuid·timestamptz와 호환) */
export interface GeneratedMessage extends GenerateResponse {
  id: string;
  label: string;
  version: Version;
  level: Level;
  createdAt: string;
}

/** 받는 사람·상황이 같은 완성본 묶음. 완성본이 1개 이상일 때만 기록에 저장 */
export interface Session {
  id: string;
  /** 마지막 생성 시점 입력 (복원용). recipient·situation이 세션을 구분하는 키 */
  input: MessageInput;
  level: Level;
  messages: GeneratedMessage[];
  createdAt: string;
  updatedAt: string;
}

export const LIMITS = {
  recipient: 100,
  situation: 500,
  message: 2000,
  sourceText: 4000,
} as const;
