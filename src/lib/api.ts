import type { GenerateRequest, GenerateResponse } from "../../shared/types.ts";

export async function generate(req: GenerateRequest): Promise<GenerateResponse> {
  let res: Response;
  try {
    res = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
    });
  } catch {
    throw new Error("인터넷 연결을 확인해 주세요.");
  }
  if (res.status === 429) throw new Error("요청이 너무 많아요. 1분 뒤에 다시 시도해 주세요.");
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "메시지를 만들지 못했어요. 다시 시도해 주세요.");
  return data as GenerateResponse;
}
