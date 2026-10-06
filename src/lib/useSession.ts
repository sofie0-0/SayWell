import { useCallback, useEffect, useRef, useState } from "react";
import type { GeneratedMessage, Level, MessageInput, Session } from "../../shared/types.ts";
import { newId, sessionRepo } from "./sessionRepo.ts";

const SAVE_DELAY = 500;

/** 받는 사람·상황이 같으면 같은 세션 */
export const sameSessionKey = (a: MessageInput, b: MessageInput) =>
  a.recipient.trim() === b.recipient.trim() && a.situation.trim() === b.situation.trim();

/** 현재 세션 상태 + 저장. 변경은 디바운스로 모아서 저장 */
export function useSession(onSaveError: () => void) {
  const [session, setSession] = useState<Session | null>(null);
  const pending = useRef<Session | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  /** 저장소에서 불러온 그대로라 다시 저장할 필요 없는 세션 */
  const loaded = useRef<Session | null>(null);
  const onSaveErrorRef = useRef(onSaveError);
  onSaveErrorRef.current = onSaveError;

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const s = pending.current;
    pending.current = null;
    if (!s) return;
    try {
      await sessionRepo.save(s);
    } catch {
      onSaveErrorRef.current();
    }
  }, []);

  useEffect(() => {
    if (!session || !session.messages.length || session === loaded.current) return;
    pending.current = session;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  }, [session, flush]);

  // 탭을 닫거나 백그라운드로 갈 때 남은 변경 저장
  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [flush]);

  /** 받는 사람·상황이 바뀌었으면 현재 세션을 닫음. 새 세션은 첫 완성본이 생길 때 만들어짐 */
  const switchIfChanged = (input: MessageInput): boolean => {
    if (!session || sameSessionKey(session.input, input)) return false;
    void flush();
    setSession(null);
    return true;
  };

  /** keepInput: 영어 번역처럼 입력과 무관한 생성은 세션 입력(세션 키)을 바꾸지 않음 */
  const appendMessage = (
    msg: Omit<GeneratedMessage, "id" | "createdAt">,
    input: MessageInput,
    level: Level,
    keepInput = false,
  ) => {
    const now = new Date().toISOString();
    setSession((s) => {
      const base: Session = s ?? { id: newId(), input, level, messages: [], createdAt: now, updatedAt: now };
      return {
        ...base,
        ...(keepInput ? {} : { input, level }),
        messages: [...base.messages, { ...msg, id: newId(), createdAt: now }],
        updatedAt: now,
      };
    });
  };

  const editMessage = (id: string, patch: Partial<Pick<GeneratedMessage, "subject" | "body">>) =>
    setSession((s) =>
      s && {
        ...s,
        messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        updatedAt: new Date().toISOString(),
      },
    );

  const restore = async (id: string): Promise<Session | null> => {
    await flush();
    const s = await sessionRepo.get(id);
    if (s) {
      loaded.current = s;
      setSession(s);
    }
    return s;
  };

  const startNew = () => {
    void flush();
    setSession(null);
  };

  const listSessions = useCallback(async () => {
    await flush();
    return sessionRepo.list();
  }, [flush]);

  const removeSession = async (id: string) => {
    if (pending.current?.id === id) {
      clearTimeout(timer.current);
      pending.current = null;
    }
    // 열려 있는 세션을 지우면 화면의 완성본도 닫아서 수정 시 다시 저장되지 않게 함
    if (session?.id === id) setSession(null);
    await sessionRepo.remove(id);
  };

  return {
    session,
    messages: session?.messages ?? [],
    switchIfChanged,
    appendMessage,
    editMessage,
    restore,
    startNew,
    listSessions,
    removeSession,
  };
}
