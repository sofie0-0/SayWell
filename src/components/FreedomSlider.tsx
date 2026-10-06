import type { Level } from "../../shared/types.ts";

export const LEVEL_NAMES: Record<Level, string> = { 1: "다듬기", 2: "말투 보강", 3: "멘트 추가" };

const DESCRIPTIONS: Record<Level, string> = {
  1: "맞춤법·말투·문장 정리만. 새 문장 추가 없음",
  2: "+ 호칭, 인사, 완충 표현(\"혹시\"), 감사, 마무리 인사",
  3: "+ 안부·공감, 관계 이어가기, 다음 행동 제안까지 풍부하게 (구체 내용은 빈칸)",
};

const EMPTY_DESCRIPTIONS: Record<Level, string> = {
  1: "대상·상황에 맞는 아주 일반적인 말만 짧게 추천",
  2: "+ 호칭, 인사, 완충 표현, 감사, 마무리 인사",
  3: "+ 안부·공감, 관계 이어가기, 다음 행동 제안까지 풍부하게 (구체 내용은 빈칸)",
};

interface Props {
  value: Level;
  onChange: (level: Level) => void;
  /** 하고 싶은 말이 비어 있으면 추천 모드 설명 */
  recommendMode: boolean;
}

export function FreedomSlider({ value, onChange, recommendMode }: Props) {
  return (
    <section className="field">
      <label className="field-label" htmlFor="level">
        AI 자유도
      </label>
      <input
        id="level"
        className="slider"
        type="range"
        min={1}
        max={3}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as Level)}
      />
      <div className="slider-ticks" aria-hidden>
        {([1, 2, 3] as Level[]).map((l) => (
          <button key={l} type="button" tabIndex={-1} className={l === value ? "on" : ""} onClick={() => onChange(l)}>
            {LEVEL_NAMES[l]}
          </button>
        ))}
      </div>
      <p className="hint">
        <strong>
          {value}. {LEVEL_NAMES[value]}
        </strong>{" "}
        — {(recommendMode ? EMPTY_DESCRIPTIONS : DESCRIPTIONS)[value]}
      </p>
    </section>
  );
}
