import type { Session } from "../../shared/types.ts";

/** 세션 저장소. 지금은 localStorage, Supabase 연동 시 같은 인터페이스로 구현체만 교체 */
export interface SessionRepository {
  /** updatedAt 내림차순 */
  list(): Promise<Session[]>;
  get(id: string): Promise<Session | null>;
  /** 같은 id가 있으면 덮어씀. 저장 실패 시 throw */
  save(session: Session): Promise<void>;
  remove(id: string): Promise<void>;
}

const KEY = "saywell.sessions.v1";

/** 읽기 실패(차단·파싱 오류)는 빈 목록으로 취급 */
function readAll(): Session[] {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeAll(sessions: Session[]) {
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

export const localSessionRepo: SessionRepository = {
  async list() {
    return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async get(id) {
    return readAll().find((s) => s.id === id) ?? null;
  },
  async save(session) {
    writeAll([session, ...readAll().filter((s) => s.id !== session.id)]);
  },
  async remove(id) {
    writeAll(readAll().filter((s) => s.id !== id));
  },
};

export const sessionRepo: SessionRepository = localSessionRepo;

/** uuid v4. randomUUID는 https·localhost에서만 있어서 휴대폰으로 LAN 접속할 때를 위해 대체 구현 */
export function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
