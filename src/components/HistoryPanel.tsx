import { useEffect, useState } from "react";
import type { Session } from "../../shared/types.ts";

interface Props {
  currentId: string | null;
  load: () => Promise<Session[]>;
  onRestore: (id: string) => void;
  onRemove: (id: string) => Promise<void>;
  onClose: () => void;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const matches = (s: Session, q: string) =>
  [s.input.recipient, s.input.situation, ...s.messages.map((m) => m.body)].some((t) => t.toLowerCase().includes(q));

/** 저장된 세션 목록 (전체 화면 시트) */
export function HistoryPanel({ currentId, load, onRestore, onRemove, onClose }: Props) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    load().then(setSessions);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [load]);

  const remove = async (s: Session) => {
    if (!confirm(`'${s.input.recipient}' 기록을 삭제할까요?`)) return;
    await onRemove(s.id);
    setSessions((ss) => ss?.filter((x) => x.id !== s.id) ?? null);
  };

  const q = query.trim().toLowerCase();
  const shown = sessions?.filter((s) => !q || matches(s, q));

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="기록">
      <div className="sheet-inner">
        <div className="sheet-head">
          <h2>기록</h2>
          <button type="button" className="btn small" onClick={onClose}>
            닫기
          </button>
        </div>
        <input
          className="text-input"
          type="search"
          value={query}
          placeholder="받는 사람·상황·내용으로 찾기"
          aria-label="기록 검색"
          onChange={(e) => setQuery(e.target.value)}
        />

        {shown && shown.length === 0 && (
          <p className="hint center">{q ? "찾는 기록이 없어요" : "아직 저장된 기록이 없어요"}</p>
        )}

        <ul className="history-list">
          {shown?.map((s) => (
            <li key={s.id} className={s.id === currentId ? "card history-item current" : "card history-item"}>
              <button type="button" className="history-open" onClick={() => onRestore(s.id)}>
                <span className="history-title">{s.input.recipient}</span>
                <span className="history-situation">{s.input.situation}</span>
                <span className="history-preview">{s.messages.at(-1)?.body}</span>
                <span className="history-meta">
                  완성본 {s.messages.length}개 · {formatDate(s.updatedAt)}
                </span>
              </button>
              <button type="button" className="btn small" onClick={() => remove(s)}>
                삭제
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
