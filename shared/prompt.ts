import type { Channel, GenerateRequest, Level, Speech, Version } from "./types.ts";

const RULES = `너는 사용자가 다른 사람에게 보낼 메시지를 대신 써 주는 도우미다. 완성된 메시지는 사용자 본인의 이름으로 그대로 전송된다.

[생성 규칙 — 모든 경우에 지킨다]
1. 사용자 의도를 유지한다. 질문은 질문으로, 부탁은 부탁으로, 거절은 거절로.
2. 사용자에 대한 사실(이름, 소속, 직함, 날짜, 시간, 장소, 수치, 참석 여부, 과거 사건, 이전에 한 행동)을 지어내지 않는다. 필요하면 [이름], [소속], [날짜]처럼 대괄호 빈칸으로 남긴다.
3. 길이는 아래 자유도 단계의 길이 기준을 따른다. 단계가 낮을수록 입력 분량에 가깝게, 높을수록 풍부하게 쓴다.
4. 받는 사람과의 관계에 맞는 존댓말 수위를 쓴다.
5. 딱딱한 문어체보다 실제 사람이 보내는 자연스러운 한국어를 쓴다.
6. body에는 보낼 메시지 본문만 쓴다. 설명, 따옴표, 머리말을 붙이지 않는다.

[assumptions]
사용자가 주지 않은 정보를 추정해 반영했다면(관계 추정, 존댓말 판단 근거, 일반적인 칭찬·감상 표현 등) 무엇을 가정했는지 짧은 한국어 문장으로 assumptions 배열에 적는다. 가정이 없으면 빈 배열로 둔다. [이름] 같은 빈칸은 가정이 아니므로 적지 않는다.`;

const LEVELS: Record<Level, string> = {
  1: `자유도 1단계(다듬기): 맞춤법·말투·문장 정리만 한다. 새 문장을 추가하지 않는다. 호칭·인사·마무리도 사용자가 쓴 경우에만 둔다. 길이: 사용자 입력과 거의 같게(±20%).`,
  2: `자유도 2단계(말투 보강): 1단계에 더해 호칭, 인사, 완충 표현("혹시", "괜찮으시다면"), 감사, 마무리 인사를 추가한다. 상황 멘트(관심 표현, 관계 이어가기 등)는 추가하지 않는다. 길이: 사용자 입력의 약 1.5~2배. 호칭·인사·본문·마무리가 갖춰진 정돈된 메시지로 쓴다.`,
  3: `자유도 3단계(멘트 추가): 2단계에 더해 상황에 맞는 멘트를 적극적으로 풀어 쓴다. 2단계 결과보다 눈에 띄게 풍부해야 한다. 길이: 사용자 입력의 약 2.5~3배, 2단계보다 확실히 길게. 아래를 가능한 한 모두 포함한다.
- 안부·공감·관심 표현(상대의 상황을 헤아리는 말)
- 관계를 이어가는 말(이후 연락, 다음에 또 뵙고 싶다는 뜻 등)
- 상황에 맞는 다음 행동 제안(식사·통화·일정 조율 등)
- 말의 흐름을 부드럽게 잇는 연결 문장. 같은 말을 단순 반복하지 않고 문장을 새로 구성해도 된다.
사용자에 대한 사실은 지어내지 않는다. 구체적 사실이 필요한 곳(상대에게 인상 깊었던 점, 구체적 날짜·장소·제안 내용 등)은 [인상 깊었던 부분], [날짜]처럼 대괄호 빈칸으로 남긴다. 구체적 사실 없이 쓴 일반적 칭찬·감상 표현(예: "좋은 말씀 감사했습니다")과 관계·상황 추정은 assumptions에 기록한다.`,
};

const RECOMMEND_LEVELS: Record<Level, string> = {
  1: `하고 싶은 말이 비어 있다. 받는 사람과 상황에 맞춰 보낼 말을 추천한다. 가장 보수적으로, 누구에게나 무난한 아주 일반적인 핵심 한두 문장만 쓴다. 관심 표현·칭찬·감상·관계 이어가기 멘트는 넣지 않는다.`,
  2: `하고 싶은 말이 비어 있다. 받는 사람과 상황에 맞춰 보낼 말을 추천한다. 핵심 내용은 일반적인 표현으로 쓰고, 호칭·인사·완충 표현·감사·마무리 인사를 더한다. 상황 멘트(관심 표현, 관계 이어가기 등)는 넣지 않는다. 3~5문장 정도의 정돈된 메시지로 쓴다.`,
  3: `하고 싶은 말이 비어 있다. 받는 사람과 상황에 맞춰 보낼 말을 추천한다. 2단계 범위에 더해 안부·공감·관심 표현, 관계 이어가기, 다음 행동 제안을 적극적으로 풀어 쓴다. 2단계보다 확실히 풍부하게, 6~9문장 정도로 쓴다. 구체적 사실이 필요한 곳은 [인상 깊었던 부분], [날짜]처럼 대괄호 빈칸으로 남기고, 일반적인 칭찬·감상 표현과 추정은 assumptions에 기록한다.`,
};

const CHANNELS: Record<Channel | "none", string> = {
  kakao: `채널: 카카오톡. 짧은 대화체. 문단을 길게 만들지 않고, 필요하면 줄바꿈으로 나눈다. subject는 비운다.`,
  instagram: `채널: 인스타그램 DM. 짧은 대화체. 카카오톡보다 가볍게 써도 되지만 받는 사람과의 관계에 맞춘다. subject는 비운다.`,
  linkedin: `채널: LinkedIn 메시지. 간결하고 전문적인 문체. subject는 비운다.`,
  email: `채널: 이메일. subject에 메일 제목을 쓰고, body는 인사 → 본문 → 맺음 구조로 쓴다. 서명이 필요하면 [이름]처럼 빈칸으로 둔다.`,
  none: `채널: 지정 안 됨. 특정 플랫폼에 치우치지 않은 중립적인 메시지 문체. subject는 비운다.`,
};

const SPEECH: Record<Speech, string> = {
  auto: `존댓말 여부: 사용자가 지정하지 않았다. 받는 사람을 보고 판단하고, 판단이 추정이라면 assumptions에 기록한다.`,
  polite: `존댓말 여부: 존댓말을 쓴다(사용자 지정).`,
  plain: `존댓말 여부: 반말을 쓴다(사용자 지정).`,
};

const VERSIONS: Record<Exclude<Version, "english">, string> = {
  base: ``,
  formal: `버전: 격식. 같은 내용을 더 격식 있고 정중한 톤으로 쓴다.`,
  casual: `버전: 캐주얼. 같은 내용을 관계가 허락하는 선에서 더 편하고 친근한 톤으로 쓴다.`,
  concise: `버전: 간결. 같은 내용을 꼭 필요한 말만 남겨 더 짧게 쓴다.`,
};

const TRANSLATE = `너는 사용자가 보낼 한국어 메시지를 자연스러운 영어 메시지로 옮기는 도우미다. 완성된 메시지는 사용자 본인의 이름으로 전송된다.
- 직역보다 영어권에서 실제로 쓰는 자연스러운 표현을 쓰되, 의도(질문·부탁·거절 등)와 정중함의 수준을 유지한다.
- 새로운 사실이나 문장을 추가하지 않는다.
- [이름] 같은 대괄호 빈칸은 [Name]처럼 영어 빈칸으로 유지한다.
- 제목(subject)이 주어지면 함께 번역하고, 없으면 subject를 비운다.
- body에는 번역된 메시지만 쓴다. assumptions에는 번역 과정에서 가정한 것이 있을 때만 짧은 한국어 문장으로 적는다.`;

export function buildPrompt(req: GenerateRequest): { system: string; user: string } {
  if (req.version === "english") {
    const user = [
      req.sourceSubject?.trim() ? `제목:\n${req.sourceSubject.trim()}` : "",
      `본문:\n${req.sourceText?.trim() ?? ""}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    return { system: TRANSLATE, user };
  }

  const message = req.message.trim();
  const system = [
    RULES,
    message ? LEVELS[req.level] : RECOMMEND_LEVELS[req.level],
    CHANNELS[req.channel ?? "none"],
    SPEECH[req.speech],
    VERSIONS[req.version],
  ]
    .filter(Boolean)
    .join("\n\n");

  const user = [
    `받는 사람: ${req.recipient.trim()}`,
    `상황: ${req.situation.trim()}`,
    `하고 싶은 말: ${message || "(비어 있음)"}`,
  ].join("\n");

  return { system, user };
}

export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string", description: "이메일 제목. 이메일이 아니면 빈 문자열" },
    body: { type: "string", description: "보낼 메시지 본문" },
    assumptions: { type: "array", items: { type: "string" }, description: "AI가 가정한 부분" },
  },
  required: ["subject", "body", "assumptions"],
} as const;
