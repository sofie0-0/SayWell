import type { Channel, MessageInput, Speech } from "../../shared/types.ts";
import { LIMITS } from "../../shared/types.ts";
import { useAutoHeight } from "../lib/useAutoHeight.ts";

const SPEECH_OPTIONS: { value: Speech; label: string }[] = [
  { value: "auto", label: "자동" },
  { value: "polite", label: "존댓말" },
  { value: "plain", label: "반말" },
];

const CHANNEL_OPTIONS: { value: Channel; label: string }[] = [
  { value: "kakao", label: "카카오톡" },
  { value: "instagram", label: "인스타 DM" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "email", label: "이메일" },
];

interface Props {
  input: MessageInput;
  onChange: (patch: Partial<MessageInput>) => void;
}

export function RecipientField({ input, onChange }: Props) {
  return (
    <section className="field">
      <label className="field-label" htmlFor="recipient">
        받는 사람 <span className="req">필수</span>
      </label>
      <input
        id="recipient"
        className="text-input"
        value={input.recipient}
        maxLength={LIMITS.recipient}
        placeholder="예: 선생님, 처음 만난 대표님"
        onChange={(e) => onChange({ recipient: e.target.value })}
      />
      <div className="segmented" role="radiogroup" aria-label="존댓말 여부">
        {SPEECH_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={input.speech === o.value}
            className={input.speech === o.value ? "seg on" : "seg"}
            onClick={() => onChange({ speech: o.value })}
          >
            {o.label}
          </button>
        ))}
      </div>
      {input.speech === "auto" && <p className="hint">받는 사람을 보고 AI가 존댓말 여부를 정해요</p>}
    </section>
  );
}

export function ChannelField({ input, onChange }: Props) {
  return (
    <section className="field">
      <span className="field-label">
        채널 <span className="opt">선택</span>
      </span>
      <div className="chips">
        {CHANNEL_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={input.channel === o.value}
            className={input.channel === o.value ? "chip on" : "chip"}
            onClick={() => onChange({ channel: input.channel === o.value ? null : o.value })}
          >
            {o.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function MessageField({ input, onChange }: Props) {
  const ref = useAutoHeight(input.message);
  return (
    <section className="field">
      <label className="field-label" htmlFor="message">
        하고 싶은 말 <span className="opt">선택</span>
      </label>
      <textarea
        id="message"
        ref={ref}
        className="text-input"
        rows={3}
        value={input.message}
        maxLength={LIMITS.message}
        placeholder="메모·반말·키워드도 괜찮아요. 비워두면 상황에 맞는 말을 추천해드려요"
        onChange={(e) => onChange({ message: e.target.value })}
      />
    </section>
  );
}
