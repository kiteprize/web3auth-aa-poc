# Next.js Auto Translation PoC

자동 번역 기능을 가진 Next.js 15 애플리케이션입니다. 컴포넌트 수정 없이 DOM 텍스트를 실시간으로 번역하며, FOUC(Flash of Unstyled Content) 없이 번역된 콘텐츠를 표시합니다.

## 주요 특징

- ✅ **Zero FOUC**: 번역 완료 전까지 화면 숨김
- ✅ **컴포넌트 수정 불필요**: 기존 하드코딩 텍스트 그대로 사용  
- ✅ **자동 DOM 번역**: TreeWalker로 텍스트 노드 자동 수집
- ✅ **월별 언어 팩**: 효율적인 배치 번역 및 캐싱 시스템
- ✅ **스마트 캐싱**: Upstash Redis + localStorage 하이브리드 캐시
- ✅ **실시간 변화 감지**: MutationObserver로 동적 콘텐츠 처리
- ✅ **라우팅 가드**: 페이지 전환 시 번역 완료까지 대기
- ✅ **보안 강화**: 서버사이드 번역, Rate Limiting, XSS 방지

## 지원 언어

- 한국어 (기본)
- English  
- 日本語
- 中文
- Español
- Français
- Deutsch

## 번역 서비스

**MyMemory API** 사용:
- 익명 사용: 하루 5,000자 (무료)
- **이메일 제공 시: 하루 50,000자 (현재 설정됨)**
- CAT 도구 화이트리스트: 하루 150,000자
- API 키 불필요
- 안정적인 번역 품질  
- 번역 딕셔너리로 네비게이션 용어 최적화
- **서버에서만 호출**: 클라이언트 보안 보장

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.local` 파일 생성:

```bash
# Upstash Redis (필수)
UPSTASH_REDIS_REST_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token
```

### 3. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인

### 4. 프로덕션 빌드

```bash
npm run build
```

## 구조

```
src/
├── middleware.ts                    # 언어 감지 및 쿠키 설정
├── app/
│   ├── layout.tsx                   # Anti-FOUC CSS + IntlGate 컴포넌트
│   ├── page.tsx                     # TranslateAI 홈페이지
│   ├── features/page.tsx            # 기능 소개 페이지
│   ├── api/i18n/
│   │   ├── translate/route.ts       # 누락 번역 처리 API (서버사이드 MyMemory 호출)
│   │   └── pack/route.ts            # 월별 언어 팩 저장/로드 API
│   ├── components/
│   │   ├── Navigation.tsx           # 네비게이션 바
│   │   └── LanguageSwitcher.tsx     # 언어 선택기
│   └── intl/
│       ├── IntlGate.tsx            # 핵심 번역 엔진
│       └── IntlRouteGate.tsx       # 라우팅 번역 가드
└── types/
    └── global.d.ts                  # TypeScript 타입 정의
```

## 핵심 아키텍처: 월별 언어 팩 시스템

### 1. 언어 팩 구조
```javascript
// 월별 버전 키 (YYYYMM 형식)
const currentVersion = "202508"  // 2025년 8월
const languagePackKey = `pack:en:202508`

// 언어 팩 데이터 구조
{
  "1a2b3c": "Home",
  "4d5e6f": "Features", 
  "7g8h9i": "Contact"
  // ... 모든 번역 데이터
}
```

### 2. 3단계 캐싱 시스템
1. **클라이언트 localStorage**: `i18n:en:202508` 
2. **서버 Redis 언어 팩**: `pack:en:202508`
3. **개별 번역 API**: 누락된 항목만 MyMemory 호출

### 3. 통합 번역 플로우 (v2.1.0)
```javascript
// 단일 진입점 통합 번역 함수
const performTranslation = useCallback(async (targetLang: string) => {
  // 1. 번역 중복 실행 방지
  if (translating.current) return;

  // 2. 오버레이 표시 + 언어별 로딩 텍스트 설정 (원자적 처리)
  overlay.removeAttribute("hidden");
  shell.dataset.intl = "loading";
  updateLoadingText(targetLang); // 언어별 로딩 메시지

  // 3. 번역 프로세스
  const { nodes, items } = collect(document.body, targetLang);
  const pack = await getLanguagePackFromCache(targetLang);
  apply(pack, nodes, targetLang);

  // 4. 누락된 번역 처리
  const missing = items.filter((i) => !pack[i.key]);
  if (missing.length) {
    const add = await translateItems(targetLang, missing);
    apply(add, nodes, targetLang);
  }

  // 5. 번역 완료 시에만 오버레이 숨김
  shell.dataset.intl = "ready";
  overlay.setAttribute("hidden", "");
}, [baseLang]);
```

## 주요 로직

### 1. 미들웨어 (src/middleware.ts)
- URL 파라미터 → 쿠키 → Accept-Language 헤더 순으로 언어 결정
- `lang` 쿠키에 선택된 언어 저장 (1년 만료)

### 2. Anti-FOUC + 언어별 로딩 UI (src/app/layout.tsx)
```css
#app-shell[data-intl="loading"] { visibility: hidden; }
#intl-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483647;
  background: #111827;
  color: #f3f4f6;
}
#intl-overlay[hidden] {
  display: none;
}
```

**언어별 로딩 텍스트 지원:**
```javascript
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
```

### 3. 텍스트 수집 (IntlGate)
```javascript
// TreeWalker로 번역 대상 텍스트 노드 수집
const walker = document.createTreeWalker(
  document.body, // 전체 body 스캔
  NodeFilter.SHOW_TEXT,
  {
    acceptNode(node) {
      // 스크립트, 스타일, 이미 번역된 요소 등 제외
      // 1글자 텍스트도 번역 (예: "홈")
      // data-no-translate 속성 요소 제외
    }
  }
)
```

### 4. 월별 언어 팩 캐싱 전략
- **현재 월 팩**: `pack:ko:202508` (32일 TTL)
- **이전 월 팩**: `pack:ko:202507` (폴백용)
- **localStorage**: `i18n:ko:202508` (클라이언트 캐시)
- **자동 델타 업데이트**: 새 번역이 현재 월 팩에 자동 추가

### 5. 로딩 플로우 안정화 (v2.1.0)
```javascript
// 경합 조건 방지: 단일 번역 진입점
const performTranslation = useCallback(async (targetLang: string) => {
  if (translating.current) {
    console.log("⚠️ Translation already in progress, skipping");
    return; // 중복 실행 차단
  }

  translating.current = true;
  moSuppressed.current++; // MutationObserver 일시정지

  try {
    // 번역 프로세스...
  } finally {
    translating.current = false;
    moSuppressed.current--; // MutationObserver 재개
  }
}, [baseLang]);

// 모든 번역 요청을 통합 함수로 처리
- 초기화: performTranslation(getCurrentLanguageFromCookie())
- 라우트 변경: performTranslation(lang)
- 전역 API: window.__intl__.show() → performTranslation(lang)
- IntlRouteGate: window.__intl__.show() → performTranslation(lang)
```

### 6. 성능 최적화 메커니즘
```javascript
// 50개 배치 처리
const BATCH_SIZE = 50

// 언어 팩 우선 순위
1. localStorage (즉시)
2. 현재 월 서버 팩
3. 이전 월 서버 팩
4. 개별 번역 API (MyMemory)

// 서버 API에서 자동 팩 병합
existingPack = await redis.get(`pack:${lang}:${currentMonth}`)
mergedPack = { ...existingPack, ...newTranslations }
await redis.set(packKey, mergedPack)
```

### 7. 무한 반복 방지
```javascript
// 번역된 요소에 마킹
parent.setAttribute('data-translated', 'true')

// 이미 번역된 요소는 수집에서 제외
if (p.hasAttribute('data-translated')) return NodeFilter.FILTER_REJECT
```

## API 엔드포인트

### `/api/i18n/pack` - 언어 팩 API
```javascript
// GET: 언어 팩 다운로드
GET /api/i18n/pack?lang=en&ver=202508

// POST: 언어 팩에 델타 추가
POST /api/i18n/pack
{
  "lang": "en",
  "ver": "202508", 
  "dict": { "새로운키": "New Translation" }
}
```

### `/api/i18n/translate` - 누락 번역 API
```javascript
POST /api/i18n/translate
{
  "lang": "en",
  "items": [
    { "key": "hash123", "text": "번역할 텍스트" }
  ]
}
```

## 환경변수

### 필수 환경변수

```bash
# Upstash Redis (필수)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-auth-token
```

## 배포

### Vercel 배포 (권장)

1. **Upstash Redis 생성**
   - [Upstash Console](https://console.upstash.com)에서 Redis 데이터베이스 생성
   - "Global" 지역 선택 권장
   - REST API 정보 복사

2. **Vercel 환경변수 설정**
   ```bash
   UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AXXXxxx
   ```

3. **배포**
   ```bash
   vercel --prod
   ```

### 보안 기능

- **서버사이드 번역**: MyMemory API는 서버에서만 호출
- **Rate Limiting**: IP당 분당 50회 번역 요청, 30회 팩 요청 제한
- **입력 검증**: XSS 방지, 텍스트 길이 제한 (1000자)
- **서버사이드 캐시**: 클라이언트에 번역 로직 노출 방지
- **Edge Runtime**: 전 세계 빠른 응답

## 주요 API

### window.__intl__ 전역 객체

```javascript
// 언어 변경
window.__intl__.lang = 'en'

// 번역 트리거 (v2.1.0에서 통합됨)
window.__intl__.show()               // 현재 언어로 번역 실행
window.__intl__.hide()               // 오버레이만 숨김 (권장하지 않음)

// 수동 번역 (같은 페이지 재번역)
window.__intl__.translatePage()      // Promise<void> - 통합 번역 함수 호출
```

### data-no-translate 속성

번역 제외가 필요한 요소:

```html
<code data-no-translate>const API_KEY = "secret"</code>
<div data-no-translate>번역하지 않을 영역</div>
<select data-no-translate>
  <option>언어 선택기</option>
</select>
```

## 성능 최적화

### 월별 언어 팩의 장점
- **첫 방문자**: 번역 후 월별 팩 생성 (이후 방문자를 위해)
- **이후 방문자**: 언어 팩 다운로드로 즉시 번역 (API 호출 최소화)
- **동적 콘텐츠 대응**: 페이지 체크섬과 달리 상태 변화에 강함
- **월간 재사용**: 같은 달 내 모든 페이지에서 팩 재사용 가능

### 캐시 히트율 최적화
```
첫 방문: localStorage(0%) → Server Pack(0%) → Translation API(100%)
재방문: localStorage(90%) → Server Pack(8%) → Translation API(2%)
```

### 기존 최적화 기능
- **중복 제거**: SHA-256 해시로 동일 텍스트 한 번만 번역
- **3단계 캐시**: localStorage → 언어 팩 → 개별 번역 API 순서
- **배치 처리**: 최대 50개 텍스트 묶어서 API 호출
- **디바운스**: DOM 변화 60ms 디바운스로 과도한 호출 방지
- **번역 마킹**: `data-translated` 속성으로 재번역 방지

## 번역 딕셔너리

자주 사용되는 네비게이션 용어는 서버 딕셔너리에서 우선 번역:

```javascript
const commonTranslations = {
  'en': {
    '홈': 'Home',
    '기능': 'Features',
    '기능소개': 'Features', 
    '문의하기': 'Contact',
    '시작하기': 'Get Started',
    '더 알아보기': 'Learn More'
  }
  // ja, zh, es, fr, de...
}
```

## 제한사항

- **MyMemory 제한**: 
  - 익명: 하루 5,000자
  - 이메일 제공: 하루 50,000자
  - 문자 수 기반 제한 (단어 수가 아님)
- **단방향 번역**: 한국어 → 다른 언어만 지원
- **클라이언트 사이드**: SSR/SSG 미지원  
- **동적 콘텐츠**: React 상태 변화는 MutationObserver 의존

## 문제 해결

### 로딩 화면이 조기에 꺼지는 경우 (v2.1.0에서 해결)
- **원인**: 여러 번역 로직이 동시 실행되어 오버레이 상태 충돌
- **해결**: `performTranslation()` 통합 함수로 단일 진입점 구현
- **추가 보호**: `translating.current` 플래그로 중복 실행 방지

### "홈" 버튼이 번역되지 않는 경우
- `shouldSkip` 함수에서 1글자 텍스트가 제외되고 있었음
- v1.1.0에서 수정됨

### 무한 번역 API 호출
- MutationObserver가 번역 결과를 다시 감지
- `data-translated` 마킹으로 해결

### 네비게이션 번역 안됨
- 번역 범위를 `app-shell`에서 `document.body`로 확장
- `#intl-overlay` 요소는 제외

### 언어 팩 로딩 실패
- 브라우저 캐시 초기화: **Ctrl+Shift+R** (하드 새로고침)
- localStorage 초기화: 개발자도구 > Application > Storage > Clear storage
- 이전 월 팩 폴백 시스템으로 안정성 보장

## 버전 히스토리

### v2.1.0 - 통합 번역 시스템 및 로딩 플로우 안정화 (현재)
- **통합 번역 함수**: `performTranslation()` 단일 진입점으로 모든 번역 요청 통합
- **경합 조건 해결**: 여러 번역 로직 동시 실행으로 인한 오버레이 상태 충돌 해결
- **언어별 로딩 텍스트**: 7개 언어별 로딩 메시지 지원 (`'번역 로딩 중...', 'Loading translation...'` 등)
- **React Hook 최적화**: `useCallback`으로 성능 최적화 및 무한 리렌더링 방지
- **타이밍 이슈 수정**: `setTimeout` 제거하고 즉시 번역 실행으로 안정성 향상

### v2.0.0 - 월별 언어 팩 시스템
- 페이지 체크섬 시스템을 월별 언어 팩으로 전면 교체
- 동적 콘텐츠 대응 및 캐시 효율성 대폭 향상
- 보안 강화: 클라이언트에서 MyMemory 직접 호출 완전 제거

### v1.1.0 - 페이지 딕셔너리 시스템  
- SHA-256 체크섬 기반 페이지 단위 캐싱
- MutationObserver로 동적 콘텐츠 처리

### v1.0.0 - 기본 번역 시스템
- TreeWalker 기반 DOM 텍스트 수집
- MyMemory API 연동

## 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Translation**: MyMemory API (서버사이드)
- **Caching**: Upstash Redis + localStorage
- **Runtime**: Edge Runtime (Vercel)
- **Build**: Turbopack