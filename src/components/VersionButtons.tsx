import type { Version } from "../../shared/types.ts";

export const VERSION_NAMES: Record<Version, string> = {
  base: "기본",
  formal: "격식",
  casual: "캐주얼",
  english: "영어",
  concise: "간결",
};

const BUTTONS: Version[] = ["formal", "casual", "english", "concise"];

interface Props {
  hasResults: boolean;
  canCreate: boolean;
  busy: boolean;
  onGenerate: (version: Version) => void;
}

/** 화면 하단 고정 바: 첫 생성 전엔 [만들기], 이후엔 버전 버튼 + [다시 만들기] */
export function VersionButtons({ hasResults, canCreate, busy, onGenerate }: Props) {
  return (
    <div className="bottom-bar">
      {hasResults && (
        <div className="version-row">
          {BUTTONS.map((v) => (
            <button
              key={v}
              type="button"
              className="chip"
              // 영어는 직전 완성본만 번역하므로 입력값이 없어도 가능
              disabled={busy || (v !== "english" && !canCreate)}
              onClick={() => onGenerate(v)}
            >
              {VERSION_NAMES[v]}
            </button>
          ))}
        </div>
      )}
      <button type="button" className="btn primary block" disabled={busy || !canCreate} onClick={() => onGenerate("base")}>
        {busy ? "만드는 중…" : hasResults ? "다시 만들기" : "만들기"}
      </button>
      {!canCreate && !busy && <p className="hint center">받는 사람과 상황을 입력해 주세요</p>}
    </div>
  );
}
