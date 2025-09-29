"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

export function IntlRouteGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Next.js Link 클릭을 감지하여 오버레이 표시
    function onClick(e: MouseEvent) {
      // Next.js Link는 실제로 a 태그로 렌더링되므로 감지 가능
      const target = e.target as Element;
      const link = target.closest('a[href^="/"]') as HTMLAnchorElement | null;

      if (
        link &&
        !e.defaultPrevented &&
        e.button === 0 &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const href = link.getAttribute("href");
        console.log("🔗 Link clicked:", { current: pathname, target: href });

        // 경로 이동 시 번역 트리거 (같은 경로 포함)
        console.log("🔄 Link clicked, triggering translation");
        window.__intl__?.show();
      }
    }

    function onPop() {
      // 브라우저 뒤로가기/앞으로가기 시 오버레이 표시
      window.__intl__?.show();
    }

    // capture 단계에서 이벤트를 감지
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
    };
  }, [router, pathname]);

  return null;
}
