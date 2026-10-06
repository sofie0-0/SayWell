export const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

/**
 * 반드시 버튼 클릭 핸들러 안에서 다른 await 없이 바로 호출해야 함
 * (Web Share API는 사용자 동작 직후에만 허용됨)
 */
export function share(text: string): void {
  navigator.share({ text }).catch(() => {
    // 사용자가 공유 시트를 닫은 경우(AbortError) 등은 무시
  });
}

export async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 구형 브라우저·권한 거부 시 폴백
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}
