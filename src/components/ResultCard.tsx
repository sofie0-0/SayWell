import { forwardRef } from "react";
import type { GeneratedMessage } from "../../shared/types.ts";
import { canShare, copy, share } from "../lib/share.ts";
import { useAutoHeight } from "../lib/useAutoHeight.ts";

interface Props {
  result: GeneratedMessage;
  onEdit: (patch: Partial<Pick<GeneratedMessage, "subject" | "body">>) => void;
  onToast: (msg: string) => void;
}

export const ResultCard = forwardRef<HTMLElement, Props>(function ResultCard({ result, onEdit, onToast }, ref) {
  const bodyRef = useAutoHeight(result.body);
  const hasSubject = result.subject !== undefined;
  const shareText = hasSubject ? `제목: ${result.subject}\n\n${result.body}` : result.body;

  const doCopy = async (text: string, what: string) => {
    onToast((await copy(text)) ? `${what} 복사됨` : "복사하지 못했어요. 직접 선택해 복사해 주세요");
  };

  return (
    <article className="card" ref={ref}>
      <div className="card-label">{result.label}</div>

      {hasSubject && (
        <div className="subject-row">
          <input
            className="text-input subject"
            aria-label="제목"
            value={result.subject}
            onChange={(e) => onEdit({ subject: e.target.value })}
          />
          <button type="button" className="btn small" onClick={() => doCopy(result.subject ?? "", "제목")}>
            제목 복사
          </button>
        </div>
      )}

      <textarea
        ref={bodyRef}
        className="text-input body"
        aria-label="완성본 (직접 수정 가능)"
        value={result.body}
        onChange={(e) => onEdit({ body: e.target.value })}
      />

      {result.assumptions.length > 0 && <p className="assumption">가정: {result.assumptions.join(" · ")}</p>}

      <div className="card-actions">
        <button type="button" className="btn" onClick={() => doCopy(result.body, hasSubject ? "본문" : "메시지")}>
          {hasSubject ? "본문 복사" : "복사"}
        </button>
        {canShare && (
          // 공유는 클릭 직후 동기 호출해야 함
          <button type="button" className="btn primary-outline" onClick={() => share(shareText)}>
            공유
          </button>
        )}
      </div>
    </article>
  );
});
