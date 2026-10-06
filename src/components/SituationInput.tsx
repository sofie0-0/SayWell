import { LIMITS } from "../../shared/types.ts";
import { useAutoHeight } from "../lib/useAutoHeight.ts";

const KEYWORDS = ["처음 인사", "처음 네트워킹", "부탁", "질문", "감사", "사과", "거절", "일정 조율", "후속 연락"];

const split = (v: string) =>
  v
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function SituationInput({ value, onChange }: Props) {
  const ref = useAutoHeight(value);
  const parts = split(value);

  const toggle = (kw: string) => {
    const next = parts.includes(kw) ? parts.filter((p) => p !== kw) : [...parts, kw];
    onChange(next.join(", "));
  };

  return (
    <section className="field">
      <label className="field-label" htmlFor="situation">
        상황 <span className="req">필수</span>
      </label>
      <div className="chips">
        {KEYWORDS.map((kw) => {
          const on = parts.includes(kw);
          return (
            <button
              key={kw}
              type="button"
              aria-pressed={on}
              className={on ? "chip on" : "chip"}
              onClick={() => toggle(kw)}
            >
              {kw}
            </button>
          );
        })}
      </div>
      <textarea
        id="situation"
        ref={ref}
        className="text-input"
        rows={2}
        value={value}
        maxLength={LIMITS.situation}
        placeholder="칩을 고르거나 직접 적어주세요. 예: 강연 듣고 처음 연락"
        onChange={(e) => onChange(e.target.value)}
      />
    </section>
  );
}
