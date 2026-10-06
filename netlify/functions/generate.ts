import type { Config } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";
import { buildPrompt, RESPONSE_SCHEMA } from "../../shared/prompt.ts";
import { LIMITS, type GenerateRequest, type GenerateResponse } from "../../shared/types.ts";

const CHANNELS = ["kakao", "instagram", "linkedin", "email"];
const SPEECHES = ["auto", "polite", "plain"];
const VERSIONS = ["base", "formal", "casual", "english", "concise"];

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

const str = (v: unknown, max: number) => typeof v === "string" && v.length <= max;

/** 서비스 전체가 함께 쓰는 하루 한도('공용 통')의 DB 키. Supabase access_codes 표의 이 값과 일치해야 함 */
const PUBLIC_POOL_KEY = "public-pool";

type UsageCheck = { ok: true } | { ok: false; status: number; error: string };

/**
 * Supabase의 consume_usage 함수로 "오늘 남은 횟수 확인 + 1회 차감"을 한 번에 처리.
 * 확인 자체가 실패하면(키 누락, DB 정지, 네트워크 오류) 통과시키지 않고 막는다 (fail closed).
 * 상태 코드에 429를 쓰지 않는 이유: 프런트(api.ts)가 429를 "1분 뒤 다시" 안내로 덮어쓰기 때문.
 */
async function checkDailyLimit(): Promise<UsageCheck> {
  const unavailable: UsageCheck = {
    ok: false,
    status: 503,
    error: "서비스를 준비 중이에요. 잠시 후 다시 시도해 주세요.",
  };
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("generate: SUPABASE_URL or SUPABASE_SECRET_KEY missing");
    return unavailable;
  }
  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/rpc/consume_usage`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: key, authorization: `Bearer ${key}` },
      body: JSON.stringify({ p_code_hash: PUBLIC_POOL_KEY }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error("generate: usage check http", res.status);
      return unavailable;
    }
    const r = (await res.json()) as { ok?: boolean; reason?: string };
    if (r.ok === true) return { ok: true };
    if (r.reason === "limit_reached") {
      return {
        ok: false,
        status: 503,
        error: "오늘 사용 가능한 횟수가 모두 소진됐어요. 한국 시간 자정 이후에 다시 이용해 주세요.",
      };
    }
    console.error("generate: unexpected usage reason", r.reason);
    return unavailable;
  } catch (err: any) {
    console.error("generate: usage check error", err?.name ?? "unknown");
    return unavailable;
  }
}

/**
 * 사용할 모델 목록 (앞에서부터 시도). 환경변수 GEMINI_MODELS에 쉼표로 구분해 덮어쓸 수 있음.
 * 모델 이름은 공식 models 페이지의 API 문자열 (2026-10 확인).
 */
const DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.1-flash-lite"];
const MODELS = (process.env.GEMINI_MODELS ?? "")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const MODEL_LIST = MODELS.length ? MODELS : DEFAULT_MODELS;

/** 모델 하나가 이만큼 걸리면 포기하고 다음 모델로 (전체 시간이 함수 제한을 넘지 않게) */
const PER_MODEL_TIMEOUT_MS = 12_000;

/** 같은 요청을 다른 모델로 다시 시도해 볼 만한 오류인지: 한도 초과(429)·서버 문제(5xx)·모델 없음(404) */
const FALLBACK_STATUS = [404, 429, 500, 503, 504];
const shouldFallback = (err: any) => FALLBACK_STATUS.includes(err?.status) || err instanceof BadModelOutput;

/** 모델은 응답했지만 형식이 틀린 경우 (JSON 아님, 본문 없음) */
class BadModelOutput extends Error {}

/** 유효하면 정규화된 요청, 아니면 오류 메시지 */
function validate(b: any): GenerateRequest | string {
  if (!b || typeof b !== "object") return "잘못된 요청입니다.";
  if (!VERSIONS.includes(b.version)) return "잘못된 버전입니다.";
  if (![1, 2, 3].includes(b.level)) return "잘못된 자유도입니다.";
  if (!str(b.recipient ?? "", LIMITS.recipient)) return "받는 사람이 너무 깁니다.";
  if (!str(b.situation ?? "", LIMITS.situation)) return "상황이 너무 깁니다.";
  if (!str(b.message ?? "", LIMITS.message)) return "하고 싶은 말이 너무 깁니다.";
  if (b.channel !== null && !CHANNELS.includes(b.channel)) return "잘못된 채널입니다.";
  if (!SPEECHES.includes(b.speech)) return "잘못된 존댓말 설정입니다.";

  if (b.version === "english") {
    if (!str(b.sourceText, LIMITS.sourceText) || !b.sourceText.trim()) return "번역할 완성본이 없습니다.";
    if (b.sourceSubject !== undefined && !str(b.sourceSubject, LIMITS.recipient * 2)) return "제목이 너무 깁니다.";
  } else {
    if (!b.recipient?.trim()) return "받는 사람을 입력해 주세요.";
    if (!b.situation?.trim()) return "상황을 입력해 주세요.";
  }

  return {
    recipient: b.recipient ?? "",
    speech: b.speech,
    message: b.message ?? "",
    channel: b.channel,
    situation: b.situation ?? "",
    level: b.level,
    version: b.version,
    sourceText: b.sourceText,
    sourceSubject: b.sourceSubject,
  };
}

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "POST만 지원합니다." });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "잘못된 요청입니다." });
  }
  const parsed = validate(body);
  if (typeof parsed === "string") return json(400, { error: parsed });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("generate: GEMINI_API_KEY missing");
    return json(500, { error: "서버 설정 오류입니다." });
  }

  // 입력 검증과 설정 확인을 통과한 요청만 횟수를 차감 (잘못된 요청은 세지 않음)
  const usage = await checkDailyLimit();
  if (!usage.ok) return json(usage.status, { error: usage.error });

  const { system, user } = buildPrompt(parsed);
  const ai = new GoogleGenAI({ apiKey });

  let lastErr: any;
  for (const model of MODEL_LIST) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: user,
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseJsonSchema: RESPONSE_SCHEMA,
          abortSignal: AbortSignal.timeout(PER_MODEL_TIMEOUT_MS),
        },
      });
      let out: GenerateResponse;
      try {
        out = JSON.parse(res.text ?? "") as GenerateResponse;
      } catch {
        throw new BadModelOutput("invalid json");
      }
      if (typeof out.body !== "string" || !out.body.trim()) throw new BadModelOutput("empty body");

      const result: GenerateResponse = {
        body: out.body.trim(),
        assumptions: Array.isArray(out.assumptions) ? out.assumptions.filter((a) => typeof a === "string" && a.trim()) : [],
      };
      const wantsSubject = parsed.version === "english" ? !!parsed.sourceSubject?.trim() : parsed.channel === "email";
      if (wantsSubject && out.subject?.trim()) result.subject = out.subject.trim();
      return json(200, result);
    } catch (err: any) {
      lastErr = err;
      // 입력·출력 내용은 남기지 않음 (PRD 6). 어떤 모델이 왜 실패했는지만 기록
      console.error("generate: model failed", model, err?.status ?? err?.name ?? "unknown");
      // 요청 자체가 잘못된 경우(400, 인증 401/403 등)는 다른 모델로 해도 똑같으므로 바로 중단
      if (!shouldFallback(err) && err?.name !== "TimeoutError" && err?.name !== "AbortError") break;
    }
  }

  if (lastErr?.status === 429) return json(503, { error: "AI 사용량이 많아요. 잠시 후 다시 시도해 주세요." });
  return json(502, { error: "메시지를 만들지 못했어요. 다시 시도해 주세요." });
};

export const config: Config = {
  path: "/api/generate",
  method: "POST",
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
