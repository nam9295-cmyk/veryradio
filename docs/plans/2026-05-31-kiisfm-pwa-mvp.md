# Verygood Radio KIIS FM PWA MVP Implementation Plan

> **For Hermes:** 이 계획은 먼저 KIIS FM 102.7 한 채널만 안정적으로 재생하는 PWA를 만든 뒤 Cloudflare Pages에 배포한다.

**Goal:** 한국 매장/운전 중에도 `https://stream.revma.ihrhls.com/zc185` 스트림으로 KIIS FM 102.7을 원터치 재생하고, 모바일에서 백그라운드/잠금화면 재생을 최대한 지원하는 “베리굿 라디오” 웹앱을 만든다.

**Architecture:** 정적 Vite + React + TypeScript 앱으로 시작한다. 브라우저 `<audio>` 태그가 직접 iHeart/Revma AAC 스트림을 재생하고, PWA manifest/service worker/Media Session API를 붙여 홈 화면 설치, 앱처럼 실행, 잠금화면 재생 컨트롤을 지원한다. 서버가 필요 없으므로 Cloudflare Pages가 1차 배포에 적합하다.

**Tech Stack:** Vite, React, TypeScript, vite-plugin-pwa, CSS, Cloudflare Pages/Wrangler.

---

## 사전 확인 결과

- 스트림 확인: `https://stream.revma.ihrhls.com/zc185`는 현재 이 환경에서 HTTP 200, `content-type: audio/aac`로 실제 오디오 데이터를 반환한다.
- 리다이렉트/토큰: 접속 시 `https://cloud.revma.ihrhls.com/zc185?...` 형태의 짧은 토큰 URL로 연결된다. 앱에는 원본 URL만 저장하고, 브라우저가 매번 새 토큰을 받게 한다.
- 자동재생 정책: 모바일 브라우저는 사용자 제스처 없이 오디오 자동재생을 막는다. 따라서 앱 첫 화면에서 사용자가 직접 “재생” 버튼을 누르게 설계한다.
- 백그라운드 재생: PWA + `<audio>` + Media Session API로 잠금화면/알림 영역 컨트롤을 지원할 수 있다. 단, iOS/Android/브라우저 정책상 앱이 강제 종료되거나 네트워크가 끊기면 재생 유지가 보장되지는 않는다.
- 배포 방식: 서버 API가 필요 없으므로 Cloudflare Pages 정적 배포가 가장 단순하고 저렴하다.

## MVP 범위

이번 1차 버전에서 하는 것:

1. 앱 이름: “Verygood Radio” / 한국어 표시 “베리굿 라디오”.
2. 채널: KIIS FM 102.7 한 개만 제공.
3. 기능:
   - 큰 재생/일시정지 버튼
   - 현재 상태 표시: 연결 중, 재생 중, 일시정지, 오류
   - 볼륨 조절
   - 스트림 오류 시 “다시 연결” 버튼
   - 모바일 홈 화면 설치용 PWA manifest
   - 서비스 워커로 앱 shell 캐싱
   - Media Session API로 잠금화면 제목/아티스트/재생·정지 액션 제공
4. 디자인:
   - 매장에서 바로 쓰기 좋은 단순한 다크 UI
   - Very Good Chocolate 분위기: 차분한 블랙/초콜릿 톤, 큰 버튼, 작은 설명
5. 배포:
   - Cloudflare Pages preview/production URL 생성
   - 가능하면 추후 `radio.verygood-chocolate.com` 같은 서브도메인 연결 가능하게 구성

이번 1차 버전에서 하지 않는 것:

- 여러 국가/채널 목록 UI
- 계정/로그인
- 방송국 검색
- 광고 차단/우회 기능
- 서버 프록시. 단, 나중에 특정 방송국이 CORS/지역 제한으로 직접 재생이 안 되면 합법성/약관을 검토한 뒤 별도 스트림 프록시나 대체 공개 스트림을 검토한다.

---

## Task 1: 프로젝트 생성

**Objective:** `/home/john/workspace/verygood-radio`에 Vite React TypeScript 프로젝트를 만든다.

**Files:**
- Create: `/home/john/workspace/verygood-radio/package.json`
- Create: `/home/john/workspace/verygood-radio/src/*`
- Create: `/home/john/workspace/verygood-radio/public/*`

**Steps:**
1. `npm create vite@latest verygood-radio -- --template react-ts` 실행.
2. `npm install` 실행.
3. Git 초기화 및 첫 커밋.
4. `npm run dev -- --host 0.0.0.0`로 로컬 실행 확인.

**Verification:**
- `npm run build`가 성공한다.
- 브라우저에서 기본 Vite 앱이 열린다.

---

## Task 2: 라디오 플레이어 핵심 구현

**Objective:** KIIS FM 스트림을 재생/일시정지하는 단일 채널 플레이어를 만든다.

**Files:**
- Modify: `/home/john/workspace/verygood-radio/src/App.tsx`
- Modify: `/home/john/workspace/verygood-radio/src/App.css`

**Implementation notes:**
- 스트림 URL 상수: `https://stream.revma.ihrhls.com/zc185`
- `<audio ref={audioRef} preload="none" playsInline />` 사용.
- 재생 버튼 클릭 시 `audio.play()` 호출.
- `waiting`, `playing`, `pause`, `error`, `stalled`, `ended` 이벤트로 상태 업데이트.
- 오류 시 audio src를 다시 세팅하고 재시도하는 `reconnect()` 함수 제공.

**Verification:**
- 사용자가 재생 버튼을 누르면 오디오가 재생된다.
- 일시정지 버튼이 작동한다.
- 개발자 콘솔에 치명적 JS 오류가 없다.

---

## Task 3: 모바일/매장용 UI 정리

**Objective:** 매장에서 쉽게 누를 수 있는 단순한 다크 UI를 만든다.

**Files:**
- Modify: `/home/john/workspace/verygood-radio/src/App.css`
- Modify: `/home/john/workspace/verygood-radio/src/index.css`

**UI requirements:**
- 상단: “베리굿 라디오”
- 채널 카드: “KIIS FM 102.7 LA”
- 큰 원형 재생/정지 버튼
- 상태 배지
- 볼륨 슬라이더
- 짧은 안내: “처음 한 번은 재생 버튼을 눌러야 백그라운드 재생이 시작됩니다.”

**Verification:**
- 모바일 폭 390px 기준으로 버튼과 텍스트가 잘리지 않는다.
- 데스크톱에서도 중앙 카드 형태로 보인다.

---

## Task 4: PWA 설치 기능 추가

**Objective:** 홈 화면에 설치 가능한 PWA로 만든다.

**Files:**
- Modify: `/home/john/workspace/verygood-radio/package.json`
- Modify: `/home/john/workspace/verygood-radio/vite.config.ts`
- Create: `/home/john/workspace/verygood-radio/public/icons/icon-192.png`
- Create: `/home/john/workspace/verygood-radio/public/icons/icon-512.png`

**Steps:**
1. `vite-plugin-pwa` 설치.
2. manifest 설정:
   - `name`: `Verygood Radio`
   - `short_name`: `VG Radio`
   - `display`: `standalone`
   - `background_color`: `#120f0d`
   - `theme_color`: `#120f0d`
3. service worker는 앱 shell만 캐싱하고, 라이브 오디오 스트림은 캐싱하지 않는다.

**Verification:**
- `npm run build` 후 manifest와 service worker가 생성된다.
- Chrome DevTools Lighthouse/PWA 체크에서 installable 조건이 통과한다.

---

## Task 5: 백그라운드 재생/잠금화면 컨트롤 추가

**Objective:** Media Session API로 모바일 잠금화면 컨트롤과 메타데이터를 제공한다.

**Files:**
- Modify: `/home/john/workspace/verygood-radio/src/App.tsx`

**Implementation notes:**
- `navigator.mediaSession.metadata = new MediaMetadata({ title: 'KIIS FM 102.7', artist: 'Verygood Radio', album: 'Live from Los Angeles' })`
- `setActionHandler('play', play)`
- `setActionHandler('pause', pause)`
- `setActionHandler('stop', pause)`
- play/pause 상태에 따라 `navigator.mediaSession.playbackState` 업데이트.

**Verification:**
- Android Chrome/PWA에서 잠금화면 또는 알림 영역에 재생 컨트롤이 보인다.
- iPhone Safari/PWA에서는 가능한 범위에서 오디오가 잠금 중 계속 재생되는지 확인한다.

---

## Task 6: 품질 게이트

**Objective:** 배포 전 기본 품질을 확인한다.

**Commands:**
- `npm run lint`
- `npm run build`
- `npm run preview -- --host 0.0.0.0`

**Manual QA:**
- 데스크톱 Chrome에서 재생 확인.
- 모바일 또는 Tailscale 접근 가능한 URL로 실제 휴대폰 테스트.
- 백그라운드/화면 잠금 상태에서 3~5분 재생 유지 확인.
- 네트워크 전환 후 오류 표시/재연결 버튼 확인.

---

## Task 7: Cloudflare Pages 배포

**Objective:** 정적 앱을 Cloudflare Pages에 배포한다.

**Files:**
- Create: `/home/john/workspace/verygood-radio/wrangler.toml` 또는 Pages 설정 문서
- Create: `/home/john/workspace/verygood-radio/docs/DEPLOYMENT.md`

**Option A: Wrangler 직접 배포**
```bash
npm run build
npx wrangler pages project create verygood-radio --production-branch main
npx wrangler pages deploy dist --project-name verygood-radio
```

**Option B: GitHub + Cloudflare Pages 연결**
1. GitHub repo 생성.
2. Cloudflare Pages에서 repo 연결.
3. Build command: `npm run build`
4. Build output: `dist`
5. Production branch: `main`

**Verification:**
- Cloudflare Pages URL에서 앱이 열린다.
- HTTPS 환경에서 오디오 재생이 된다.
- PWA 설치가 가능하다.
- Console/Network에 CORS 또는 mixed-content 오류가 없다.

---

## Task 8: 운영 문서와 확장 준비

**Objective:** 나중에 시드니/프랑스 방송을 추가하기 쉽게 구조를 남긴다.

**Files:**
- Create: `/home/john/workspace/verygood-radio/src/stations.ts`
- Create: `/home/john/workspace/verygood-radio/docs/ADDING_STATIONS.md`

**Station shape:**
```ts
export type Station = {
  id: string;
  name: string;
  city: string;
  country: string;
  streamUrl: string;
  codecHint?: 'aac' | 'mp3' | 'hls';
};
```

**Initial station:**
```ts
{
  id: 'kiis-fm-la',
  name: 'KIIS FM 102.7',
  city: 'Los Angeles',
  country: 'USA',
  streamUrl: 'https://stream.revma.ihrhls.com/zc185',
  codecHint: 'aac'
}
```

**Verification:**
- 아직 UI는 한 채널만 보여도, 내부 구조는 station 배열에서 읽는다.
- 새 방송국 추가 시 `stations.ts`만 수정하면 된다.

---

## Risk / Pitfalls

1. **브라우저 자동재생 제한:** 사용자가 반드시 버튼을 눌러야 한다. 앱 열자마자 자동 재생은 목표로 하지 않는다.
2. **iOS 백그라운드 제약:** PWA라도 iOS가 메모리/배터리 정책으로 재생을 중단할 수 있다. 실제 매장 폰에서 테스트가 필요하다.
3. **스트림 제공자 정책 변경:** 오늘 되는 URL이 나중에 막힐 수 있다. 앱은 오류 메시지와 재연결 버튼을 제공하고, 운영 문서에 스트림 교체 방법을 남긴다.
4. **CORS/지역 제한:** 지금은 직접 재생 가능하지만 다른 국가 방송을 추가할 때는 방송국마다 다를 수 있다.
5. **서비스 워커 캐시:** 라이브 오디오를 캐싱하면 안 된다. 앱 shell만 캐싱한다.

## Success Criteria

- Cloudflare Pages HTTPS URL에서 KIIS FM 재생 성공.
- Android 또는 iOS 홈 화면에 설치 가능.
- 사용자가 직접 재생 버튼을 누른 뒤 화면 잠금/앱 전환 상태에서 최소 몇 분 이상 재생 유지.
- 매장에서 직원이 설명 없이 “재생”만 누르면 쓸 수 있는 UI.
- 추후 방송국 확장을 위한 `stations.ts` 구조 존재.
