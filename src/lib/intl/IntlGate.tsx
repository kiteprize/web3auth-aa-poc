"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getCurrentLanguageFromCookie } from "./languageUtils";

type Item = { key: string; text: string };
type IntlState = {
  sourceKey: string;
  appliedLang?: string;
  appliedText?: string;
};
const INTL_STATE = new WeakMap<Text, IntlState>();

// 브라우저 프리징 방지 상수
const MAX_ROOTS = 200;

function hash(s: string) {
  let h = 0,
    i = 0;
  while (i < s.length) h = ((h << 5) - h + s.charCodeAt(i++)) | 0;
  return (h >>> 0).toString(36);
}

// Get current month version (YYYYMM)
function getCurrentMonthVersion(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  return `${year}${month}`;
}

// Get previous month version for fallback
function getPreviousMonthVersion(): string {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  return `${year}${month}`;
}

function shouldSkip(t: string) {
  const s = t.trim();
  if (!s) return true;
  if (s.length < 1) return true;
  if (/^[\d\s.,:/_+#-]+$/.test(s)) return true;
  return false;
}

// Simple loading text update - only called when language is actually changing
function updateLoadingText(lang: string) {
  const loadingTextElement = document.getElementById("loading-text");
  if (loadingTextElement) {
    const texts = {
      ko: '번역 로딩 중...',
      en: 'Loading translation...',
      ja: '翻訳読み込み中...',
      zh: '正在加载翻译...',
      es: 'Cargando traducción...',
      fr: 'Chargement de la traduction...',
      de: 'Übersetzung wird geladen...'
    };
    loadingTextElement.textContent = texts[lang as keyof typeof texts] || texts.ko;
  }
}

function collect(root: HTMLElement, lang: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n: Node) {
      const p = (n as Text).parentElement as HTMLElement | null;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (
        /^(SCRIPT|STYLE|CODE|PRE|NOSCRIPT|TEXTAREA|INPUT|SVG)$/.test(p.tagName)
      )
        return NodeFilter.FILTER_REJECT;
      const v = (n.nodeValue || "").trim();
      if (shouldSkip(v)) return NodeFilter.FILTER_REJECT;
      if (p.closest("[data-no-translate]")) return NodeFilter.FILTER_REJECT;
      if (p.closest("#intl-overlay")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  const uniq: Record<string, string> = {};
  let cur: Node | null;

  while ((cur = walker.nextNode())) {
    const node = cur as Text;
    const t = (node.nodeValue || "").trim();

    // 이미 동일 번역이 적용되어 있고 값도 변함없으면 스킵
    const st = INTL_STATE.get(node);
    if (st && st.appliedLang === lang && st.appliedText === t) {
      continue;
    }

    const k = hash(t);
    // 현재 원문 키 업데이트 (아직 번역 적용 전이므로 applied*는 비움)
    INTL_STATE.set(node, { ...(st || {}), sourceKey: k });

    nodes.push(node);
    if (!uniq[k]) uniq[k] = t;
  }

  const items: Item[] = Object.entries(uniq).map(([key, text]) => ({
    key,
    text,
  }));
  return { nodes, items };
}

// Local cache only (fast path for dynamic changes)
function getPackFromLocalOnly(lang: string): Record<string, string> {
  try {
    const now = new Date();
    const ym = `${now.getFullYear()}${(now.getMonth() + 1 + "").padStart(
      2,
      "0"
    )}`;
    const cur = localStorage.getItem(`i18n:${lang}:${ym}`);
    if (cur) return JSON.parse(cur);
    now.setMonth(now.getMonth() - 1);
    const ym2 = `${now.getFullYear()}${(now.getMonth() + 1 + "").padStart(
      2,
      "0"
    )}`;
    const prev = localStorage.getItem(`i18n:${lang}:${ym2}`);
    return prev ? JSON.parse(prev) : {};
  } catch {
    return {};
  }
}

// Language pack functions with localStorage caching
async function getLanguagePackFromCache(
  lang: string
): Promise<Record<string, string>> {
  try {
    const currentVer = getCurrentMonthVersion();
    const localStorageKey = `i18n:${lang}:${currentVer}`;

    // Try to get from localStorage first
    const cached = localStorage.getItem(localStorageKey);
    if (cached) {
      console.log("✅ Language pack from localStorage:", currentVer);
      return JSON.parse(cached);
    }

    // Fetch from server
    console.log("🔍 Fetching language pack from server:", currentVer);
    const response = await fetch(
      `/api/i18n/pack?lang=${encodeURIComponent(lang)}&ver=${currentVer}`,
      {
        cache: "default",
      }
    );

    if (response.ok) {
      const packData = await response.json();
      // Store in localStorage for future use
      localStorage.setItem(localStorageKey, JSON.stringify(packData));
      console.log(
        "📦 Language pack cached locally:",
        Object.keys(packData).length,
        "keys"
      );
      return packData;
    }

    // Try previous month as fallback
    const previousVer = getPreviousMonthVersion();
    const fallbackKey = `i18n:${lang}:${previousVer}`;
    const fallbackCached = localStorage.getItem(fallbackKey);

    if (fallbackCached) {
      console.log(
        "✅ Language pack from localStorage (previous month):",
        previousVer
      );
      return JSON.parse(fallbackCached);
    }

    // Fetch previous month from server
    const fallbackResponse = await fetch(
      `/api/i18n/pack?lang=${encodeURIComponent(lang)}&ver=${previousVer}`,
      {
        cache: "default",
      }
    );

    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json();
      localStorage.setItem(fallbackKey, JSON.stringify(fallbackData));
      console.log(
        "📦 Fallback language pack cached:",
        Object.keys(fallbackData).length,
        "keys"
      );
      return fallbackData;
    }

    return {};
  } catch (error) {
    console.error("Failed to get language pack:", error);
    return {};
  }
}

// Translate items using server API (handles MyMemory and pack updates automatically)
async function translateItems(
  lang: string,
  items: Item[]
): Promise<Record<string, string>> {
  if (!items.length) return {};

  const BATCH_SIZE = 50; // Process 50 items at a time as requested
  const allTranslations: Record<string, string> = {};

  try {
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);

      const r = await fetch("/api/i18n/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang, items: batch }),
      });

      if (r && r.ok) {
        const batchTranslations = await r.json();
        Object.assign(allTranslations, batchTranslations);
      }

      if (i + BATCH_SIZE < items.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Update localStorage cache with new translations
    const currentVer = getCurrentMonthVersion();
    const localStorageKey = `i18n:${lang}:${currentVer}`;
    const existingCache = localStorage.getItem(localStorageKey);
    const existingData = existingCache ? JSON.parse(existingCache) : {};
    const mergedData = { ...existingData, ...allTranslations };
    localStorage.setItem(localStorageKey, JSON.stringify(mergedData));

    return allTranslations;
  } catch (error) {
    console.error("Translation error:", error);
    return {};
  }
}

function apply(dict: Record<string, string>, nodes: Text[], lang: string) {
  for (const n of nodes) {
    const raw = (n.nodeValue || "").trim();
    if (!raw) continue;
    const k = hash(raw);
    const tr = dict[k];
    if (tr && tr !== raw) {
      n.nodeValue = tr;
      INTL_STATE.set(n, { sourceKey: k, appliedLang: lang, appliedText: tr });
    } else {
      // 번역되지 않아도 상태 기록 (MO 자기발화 루프 방지용)
      INTL_STATE.set(n, { sourceKey: k, appliedLang: lang, appliedText: raw });
    }
  }
}

export function IntlGate({ baseLang }: { baseLang: string }) {
  const pathname = usePathname();
  const moRef = useRef<MutationObserver | null>(null);
  const moSuppressed = useRef(0); // >0이면 MO 무시
  const translating = useRef(false); // 전체 번역 락

  // 통합 번역 함수 - 모든 번역 요청의 단일 진입점
  const performTranslation = useCallback(async (targetLang: string) => {
    if (translating.current) {
      console.log("⚠️ Translation already in progress, skipping");
      return;
    }

    const overlay = document.getElementById("intl-overlay");
    const shell = document.getElementById("app-shell") as HTMLElement | null;

    if (!shell || !overlay) {
      console.error("❌ Required DOM elements not found");
      return;
    }

    // 기본 언어인 경우 즉시 완료
    if (!targetLang || targetLang === baseLang) {
      console.log("✅ Same as base language, hiding overlay");
      shell.dataset.intl = "ready";
      overlay.setAttribute("hidden", "");
      return;
    }

    translating.current = true;
    moSuppressed.current++; // MutationObserver 정지

    try {
      console.log("🔄 Starting translation to", targetLang);

      // 오버레이 표시 및 언어별 로딩 텍스트 설정
      overlay.removeAttribute("hidden");
      shell.dataset.intl = "loading";
      updateLoadingText(targetLang);

      const { nodes, items } = collect(document.body, targetLang);
      if (items.length > 0) {
        console.log("🌐 Translating page to", targetLang, "-", items.length, "items");

        const pack = await getLanguagePackFromCache(targetLang);
        console.log("📦 Language pack loaded:", Object.keys(pack).length, "translations");

        apply(pack, nodes, targetLang);
        const missing = items.filter((i) => !pack[i.key]);
        if (missing.length) {
          console.log("🔄 Missing translations:", missing.length, "/", items.length);
          const add = await translateItems(targetLang, missing);
          apply(add, nodes, targetLang);
          console.log("✅ Translated and added to pack:", Object.keys(add).length, "new translations");
        } else {
          console.log("✅ All translations found in language pack - no API calls needed!");
        }
      }

      // 번역 완료 - 오버레이 숨김
      shell.dataset.intl = "ready";
      overlay.setAttribute("hidden", "");
      console.log("✅ Translation completed for", targetLang);
    } catch (error) {
      console.error("❌ Translation error:", error);
      // 에러 발생 시에도 오버레이 정리
      shell.dataset.intl = "ready";
      overlay.setAttribute("hidden", "");
    } finally {
      translating.current = false;
      moSuppressed.current--;
    }
  }, [baseLang]);

  // 컴포넌트 마운트 시 즉시 실행되는 초기화
  useEffect(() => {
    console.log("🚀 IntlGate mounted, baseLang:", baseLang);

    // DOM이 준비될 때까지 기다린 후 실행
    const initializeOverlay = async () => {
      const lang = getCurrentLanguageFromCookie();
      console.log("🌐 Current language from cookie:", lang, "baseLang:", baseLang);

      // 통합 번역 함수 호출
      await performTranslation(lang);
    };

    // DOM이 로드된 후 실행
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initializeOverlay);
    } else {
      initializeOverlay();
    }

    return () => {
      document.removeEventListener("DOMContentLoaded", initializeOverlay);
    };
  }, [baseLang, performTranslation]);

  // MutationObserver for dynamic content - 자기발화 루프 방지 + 성능 최적화
  useEffect(() => {
    const pendingRoots = new Set<HTMLElement>();
    let scheduled = false;

    function schedule(lang: string) {
      if (scheduled) return;
      scheduled = true;
      const run = async () => {
        scheduled = false;
        if (!pendingRoots.size) return;

        // 루트 상한: 많으면 전체로 승격
        let roots: HTMLElement[] = [];
        if (pendingRoots.size > MAX_ROOTS) {
          const shell = document.getElementById(
            "app-shell"
          ) as HTMLElement | null;
          roots = [shell || document.body];
          pendingRoots.clear();
          console.log(
            "⚠️ Too many pending roots, escalating to full page translation"
          );
        } else {
          roots = Array.from(pendingRoots);
          pendingRoots.clear();
        }

        const cached = getPackFromLocalOnly(lang);

        for (const root of roots) {
          const { nodes, items } = collect(root, lang);
          apply(cached, nodes, lang);
          const missing = items.filter((i) => !cached[i.key]);
          if (missing.length) {
            const delta = await translateItems(lang, missing);
            apply(delta, nodes, lang);
          }
          root.removeAttribute("data-intl-pending");
        }
      };

      // queueMicrotask → requestIdleCallback으로 교체 (페인트 보장)
      if ("requestIdleCallback" in window) {
        const requestIdleCallback = (
          window as unknown as {
            requestIdleCallback: (
              callback: () => void,
              options?: { timeout: number }
            ) => number;
          }
        ).requestIdleCallback;
        requestIdleCallback(run, { timeout: 200 });
      } else {
        setTimeout(run, 16);
      }
    }

    function attachMO() {
      if (moRef.current) moRef.current.disconnect();
      moRef.current = new MutationObserver((records) => {
        if (moSuppressed.current > 0) return; // 전체 번역 중이면 무시
        const lang = getCurrentLanguageFromCookie();
        if (!lang || lang === baseLang) return;

        for (const record of records) {
          if (record.type === "characterData") {
            const t = record.target as Text;
            // 번역자가 갓 쓴 값이면 무시 (자기발화 루프 방지)
            const newVal = (t.nodeValue || "").trim();
            const st = INTL_STATE.get(t);
            if (st && st.appliedLang === lang && st.appliedText === newVal)
              continue;

            const p = t.parentElement;
            if (
              !p ||
              p.closest("[data-no-translate],#intl-overlay,[data-intl-pending]")
            )
              continue;
            p.setAttribute("data-intl-pending", "");
            pendingRoots.add(p);
          } else if (record.type === "childList") {
            record.addedNodes.forEach((node) => {
              if (node.nodeType === Node.TEXT_NODE) {
                const p = (node as Text).parentElement;
                if (
                  !p ||
                  p.closest(
                    "[data-no-translate],#intl-overlay,[data-intl-pending]"
                  )
                )
                  return;
                p.setAttribute("data-intl-pending", "");
                pendingRoots.add(p);
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                if (
                  el.closest(
                    "[data-no-translate],#intl-overlay,[data-intl-pending]"
                  )
                )
                  return;
                el.setAttribute("data-intl-pending", "");
                pendingRoots.add(el);
              }
            });
          }
        }
        schedule(lang);
      });

      moRef.current.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        characterDataOldValue: true,
      });
    }

    // 설치
    attachMO();
    return () => {
      moRef.current?.disconnect();
    };
  }, [baseLang]);

  // Main translation on route changes
  useEffect(() => {
    const lang = getCurrentLanguageFromCookie();
    console.log("🔄 Route change detected, translating to:", lang);
    performTranslation(lang);
  }, [pathname, baseLang, performTranslation]);

  // Global control API
  useEffect(() => {
    window.__intl__ = {
      show: () => {
        const lang = getCurrentLanguageFromCookie();
        performTranslation(lang);
      },
      hide: () =>
        document.getElementById("intl-overlay")?.setAttribute("hidden", ""),
      set lang(v: string) {
        document.cookie = `lang=${encodeURIComponent(
          v
        )};path=/;max-age=31536000;SameSite=Lax`;
      },
      get lang() {
        return getCurrentLanguageFromCookie();
      },
      translatePage: async () => {
        const lang = getCurrentLanguageFromCookie();
        await performTranslation(lang);
      },
    };
  }, [baseLang, performTranslation]);

  return null;
}
