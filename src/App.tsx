import { useEffect, useRef, useState } from "react";
import type { GenerateRequest, Level, MessageInput, Version } from "../shared/types.ts";
import { generate } from "./lib/api.ts";
import { useSession } from "./lib/useSession.ts";
import { ChannelField, MessageField, RecipientField } from "./components/InputForm.tsx";
import { SituationInput } from "./components/SituationInput.tsx";
import { FreedomSlider } from "./components/FreedomSlider.tsx";
import { ResultCard } from "./components/ResultCard.tsx";
import { VERSION_NAMES, VersionButtons } from "./components/VersionButtons.tsx";
import { HistoryPanel } from "./components/HistoryPanel.tsx";

const INITIAL_INPUT: MessageInput = { recipient: "", speech: "auto", message: "", channel: null, situation: "" };
const INITIAL_LEVEL: Level = 2;

const pickInput = ({ recipient, speech, message, channel, situation }: MessageInput): MessageInput => ({
  recipient,
  speech,
  message,
  channel,
  situation,
});

export default function App() {
  const [input, setInput] = useState<MessageInput>(INITIAL_INPUT);
  const [level, setLevel] = useState<Level>(INITIAL_LEVEL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; req: GenerateRequest; label: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { session, messages, switchIfChanged, appendMessage, editMessage, restore, startNew, listSessions, removeSession } =
    useSession(() => setToast("기록을 저장하지 못했어요"));
  /** 직전 한국어 생성 때의 입력 — '입력 수정됨' 라벨 판단용 */
  const lastInputKey = useRef<string | null>(null);
  const tailRef = useRef<HTMLDivElement>(null);

  const canCreate = !!input.recipient.trim() && !!input.situation.trim();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  // 새 완성본·로딩·오류 카드가 생기면 그 위치로 스크롤
  useEffect(() => {
    if (busy || error || messages.length) tailRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [busy, error, messages.length]);

  const run = async (req: GenerateRequest, label: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await generate(req);
      appendMessage(
        { label, version: req.version, level: req.level, ...res },
        pickInput(req),
        req.level,
        req.version === "english",
      );
    } catch (e) {
      setError({ message: (e as Error).message, req, label });
    } finally {
      setBusy(false);
    }
  };

  const onGenerate = (version: Version) => {
    if (version === "english") {
      const last = messages.at(-1);
      if (!last) return;
      run(
        { ...input, level, version, sourceText: last.body, sourceSubject: last.subject },
        VERSION_NAMES.english + " 번역",
      );
      return;
    }
    // 받는 사람·상황이 바뀌었으면 새 세션으로
    if (switchIfChanged(input)) lastInputKey.current = null;
    const key = JSON.stringify(input);
    const modified = lastInputKey.current !== null && lastInputKey.current !== key;
    lastInputKey.current = key;
    const label = `${VERSION_NAMES[version]} · ${level}단계${modified ? " · 입력 수정됨" : ""}`;
    run({ ...input, level, version }, label);
  };

  const onRestore = async (id: string) => {
    const s = await restore(id);
    if (!s) return;
    setInput(s.input);
    setLevel(s.level);
    lastInputKey.current = JSON.stringify(s.input);
    setError(null);
    setHistoryOpen(false);
  };

  const onStartNew = () => {
    startNew();
    setInput(INITIAL_INPUT);
    setLevel(INITIAL_LEVEL);
    lastInputKey.current = null;
    setError(null);
    window.scrollTo({ top: 0 });
  };

  const patchInput = (patch: Partial<MessageInput>) => setInput((i) => ({ ...i, ...patch }));

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <h1>SayWell</h1>
          <div className="header-actions">
            <button type="button" className="btn small" disabled={busy} onClick={onStartNew}>
              새로 쓰기
            </button>
            <button type="button" className="btn small" disabled={busy} onClick={() => setHistoryOpen(true)}>
              기록
            </button>
          </div>
        </div>
        <p>상황·대상·채널에 맞는 메시지를 만들어 드려요</p>
      </header>

      <p className="hint notice" role="note">
        입력한 내용은 Google AI(Gemini)로 전송돼요. 무료 이용 단계라 Google이 서비스 개선에 사용하거나 사람이 검토할 수 있어요.
        실명·연락처·주소 같은 민감한 개인정보는 넣지 말아 주세요.
      </p>

      <main className="form">
        <RecipientField input={input} onChange={patchInput} />
        <SituationInput value={input.situation} onChange={(situation) => patchInput({ situation })} />
        <ChannelField input={input} onChange={patchInput} />
        <MessageField input={input} onChange={patchInput} />
        <FreedomSlider value={level} onChange={setLevel} recommendMode={!input.message.trim()} />
      </main>

      {(messages.length > 0 || busy || error) && (
        <section className="results" aria-label="완성본">
          {messages.map((r) => (
            <ResultCard key={r.id} result={r} onEdit={(p) => editMessage(r.id, p)} onToast={setToast} />
          ))}
          {busy && (
            <div className="card skeleton" aria-busy="true" aria-label="만드는 중">
              <div className="line w40" />
              <div className="line" />
              <div className="line" />
              <div className="line w70" />
            </div>
          )}
          {error && !busy && (
            <div className="card error" role="alert">
              <p>{error.message}</p>
              <button type="button" className="btn small" onClick={() => run(error.req, error.label)}>
                다시 시도
              </button>
            </div>
          )}
        </section>
      )}
      <div ref={tailRef} className="tail" />

      <VersionButtons hasResults={messages.length > 0} canCreate={canCreate} busy={busy} onGenerate={onGenerate} />

      {historyOpen && (
        <HistoryPanel
          currentId={session?.id ?? null}
          load={listSessions}
          onRestore={onRestore}
          onRemove={removeSession}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
