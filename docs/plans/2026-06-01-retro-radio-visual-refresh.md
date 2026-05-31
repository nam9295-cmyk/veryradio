# Retro Radio Visual Refresh Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 베리굿 라디오를 감성적인 레트로 라디오 느낌으로 바꾸고, 재생 중에는 캐릭터/라디오가 은은하게 움직이며 “방송이 나오고 있다”는 느낌을 준다.

**Architecture:** 현재 React 단일 화면 구조는 유지한다. 오디오 안정화 로직은 건드리지 않고, `playbackState` 기반의 UI 컴포넌트와 CSS 애니메이션만 추가한다. 이미지/영상 파일 없이 CSS/SVG 기반으로 구현해서 Cloudflare Pages 정적 배포와 PWA 성능을 유지한다.

**Tech Stack:** Vite, React, TypeScript, CSS keyframes, CSS custom properties, optional inline SVG.

---

## Design Direction

### Mood

- 감성적인 레트로 라디오
- 오래된 우드/베이지/크림/앰버 톤
- 매장에서 하루종일 틀어도 질리지 않는 차분함
- 너무 키치하거나 장난감 같지 않게, “작은 라디오 오브제” 느낌

### Visual Keywords

- vintage radio
- warm walnut wood
- cream dial
- amber lamp
- soft scanline
- slow dancing mascot
- tiny equalizer bars
- cozy shop radio

### Color Palette

- Background deep brown: `#160f0a`
- Walnut: `#5a3522`
- Caramel: `#b87942`
- Cream: `#f5dec0`
- Amber light: `#ffbd62`
- Muted green signal: `#77d994`
- Error red: `#ff7d73`

### Motion Rules

- 재생 중: 부드러운 반복 애니메이션
- 로딩 중: 느린 깜빡임 / 튜닝 느낌
- 일시정지: 정지된 라디오
- 오류: 과한 흔들림 대신 작은 빨간 표시
- `prefers-reduced-motion: reduce` 사용자는 애니메이션 끄기

---

## Target UX

1. 사용자가 앱을 열면 중앙에 레트로 라디오 일러스트가 보인다.
2. 재생 전에는 라디오 조명이 꺼져 있고 캐릭터가 가만히 있다.
3. 재생을 누르면:
   - 라디오 주파수 창에 따뜻한 불이 켜진다.
   - 작은 캐릭터가 좌우로 살짝 춤춘다.
   - 이퀄라이저 막대가 움직인다.
   - 안테나/전파 라인이 은은하게 퍼진다.
4. 끊김으로 자동 재연결 중이면:
   - “튜닝 중...” 느낌의 다이얼/불빛 애니메이션을 보여준다.
5. 오류 상태면:
   - 라디오 불빛은 꺼지고 작은 안내 문구와 다시 연결 버튼을 보여준다.

---

## Files

- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Optional create: `src/components/RetroRadio.tsx`
- Optional create: `src/components/SignalBars.tsx`
- Optional create: `src/components/DancingMascot.tsx`
- Test/verify: `npm run lint`, `npm run build`, browser preview

---

## Task 1: Extract visual playback flags

**Objective:** UI에서 재생/로딩/오류 상태를 CSS class로 쉽게 제어할 수 있게 한다.

**Files:**
- Modify: `src/App.tsx`

**Steps:**

1. `App` 안에서 아래 값을 만든다.

```ts
const isActuallyPlaying = playbackState === 'playing'
const isLoading = playbackState === 'loading'
const hasError = playbackState === 'error'
```

2. 최상위 카드 또는 새 비주얼 컨테이너에 상태 class를 넣는다.

```tsx
<section className={`radio-card state-${playbackState}`} aria-label="베리굿 라디오 플레이어">
```

3. 검증:

```bash
npm run lint
npm run build
```

**Expected:** TypeScript/lint/build 통과.

---

## Task 2: Add RetroRadio component

**Objective:** 기존 텍스트 위주의 화면에 레트로 라디오 오브제를 추가한다.

**Files:**
- Create: `src/components/RetroRadio.tsx`
- Modify: `src/App.tsx`

**Component API:**

```ts
export type RetroRadioProps = {
  state: 'idle' | 'loading' | 'playing' | 'paused' | 'error'
}
```

**Component shape:**

```tsx
export function RetroRadio({ state }: RetroRadioProps) {
  return (
    <div className={`retro-radio retro-radio-${state}`} aria-hidden="true">
      <div className="radio-antenna" />
      <div className="radio-body">
        <div className="radio-speaker">
          <span />
          <span />
          <span />
        </div>
        <div className="radio-face">
          <div className="radio-window">KIIS 102.7</div>
          <div className="radio-dial" />
          <div className="radio-tuning-line" />
        </div>
      </div>
      <div className="radio-shadow" />
    </div>
  )
}
```

**Placement:**

`station-panel` 위 또는 안쪽 상단에 배치한다.

```tsx
<RetroRadio state={playbackState} />
```

**Verification:**

```bash
npm run lint
npm run build
```

---

## Task 3: Style the retro radio body

**Objective:** 레트로 라디오의 기본 형태를 CSS로 만든다.

**Files:**
- Modify: `src/App.css`

**CSS targets:**

- `.retro-radio`
- `.radio-antenna`
- `.radio-body`
- `.radio-speaker`
- `.radio-face`
- `.radio-window`
- `.radio-dial`
- `.radio-tuning-line`
- `.radio-shadow`

**Implementation notes:**

- 우드톤 body: walnut gradient
- 크림색 라디오 face
- speaker는 세 줄 또는 점 패턴
- dial은 원형 knob
- window는 앰버 빛나는 주파수 창
- 전체 크기는 모바일 기준 너무 크지 않게 `width: min(100%, 320px)`

**Verification:**

- 모바일 폭 390px에서 카드가 넘치지 않아야 한다.
- 데스크톱에서도 중앙 정렬되어야 한다.

---

## Task 4: Add signal/equalizer animation

**Objective:** 노래가 나오고 있다는 표시를 명확히 만든다.

**Files:**
- Create or inline: `src/components/SignalBars.tsx`
- Modify: `src/App.css`

**Design:**

- 5개 정도의 작은 바가 라디오 창 또는 스피커 옆에서 움직인다.
- 재생 중에만 애니메이션.
- 로딩 중에는 느리게 pulse.
- 일시정지/idle/error에서는 정지.

**CSS idea:**

```css
.state-playing .signal-bar {
  animation: equalize 900ms ease-in-out infinite;
}

.signal-bar:nth-child(2) { animation-delay: 120ms; }
.signal-bar:nth-child(3) { animation-delay: 240ms; }

@keyframes equalize {
  0%, 100% { transform: scaleY(0.35); }
  50% { transform: scaleY(1); }
}
```

**Accessibility:**

- 장식 요소는 `aria-hidden="true"`.
- 실제 상태 안내는 기존 `role="status"` 유지.

---

## Task 5: Add a small dancing mascot

**Objective:** 재생 중 캐릭터가 간단히 춤추는 감성 요소를 추가한다.

**Files:**
- Create: `src/components/DancingMascot.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.css`

**Mascot direction:**

- 아주 단순한 초콜릿/라디오 친구 느낌
- 얼굴: 작은 원형/초코 사각형
- 팔/다리: CSS pseudo-element 또는 span
- 복잡한 캐릭터 이미지 금지. CSS 도형만 사용.

**Motion:**

- 재생 중: 좌우 2~3도 흔들림 + 살짝 bounce
- 로딩 중: 고개 갸웃 / pulse
- 정지: 움직이지 않음

**CSS idea:**

```css
.state-playing .mascot {
  animation: tiny-dance 1.1s ease-in-out infinite;
}

@keyframes tiny-dance {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-5px) rotate(3deg); }
}
```

**Important:**

- 캐릭터가 너무 유치하면 안 된다.
- 크기는 작게: 라디오 옆이나 아래에 “살짝” 있는 정도.

---

## Task 6: Update layout hierarchy

**Objective:** 정보 구조를 라디오 앱답게 정리한다.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`

**Proposed order:**

1. Brand: Verygood Radio
2. RetroRadio visual
3. Station: KIIS FM 102.7
4. Status pill
5. Main play/pause button
6. Volume control
7. Hint / reconnect message

**Copy suggestions:**

- `Now streaming` → `ON AIR FROM LA`
- `Live pop radio from LA` → `매장에 흐르는 LA 팝 라디오`
- Button text:
  - idle/paused/error: `라디오 켜기`
  - playing/loading: `잠시 멈추기`

**Caution:**

- 버튼 기능은 바꾸지 않는다.
- 자동 재연결 로직은 건드리지 않는다.

---

## Task 7: Add reduced-motion support

**Objective:** 애니메이션이 부담스러운 환경에서 움직임을 줄인다.

**Files:**
- Modify: `src/App.css`

**CSS:**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.001ms !important;
  }
}
```

**Verification:**

- 브라우저 devtools에서 reduced motion 설정 시 애니메이션이 사실상 멈춰야 한다.

---

## Task 8: Browser QA

**Objective:** 실제 사용 환경에서 디자인/기능이 깨지지 않는지 확인한다.

**Commands:**

```bash
npm run lint
npm run build
npm run preview -- --host 0.0.0.0
```

**Checkpoints:**

- 첫 화면이 정상 표시된다.
- 재생 버튼을 누르면 상태가 `재생 중`으로 바뀐다.
- 재생 중 라디오/캐릭터/이퀄라이저가 움직인다.
- 멈추기를 누르면 애니메이션이 멈춘다.
- 볼륨 조절이 작동한다.
- 모바일 390px 폭에서 레이아웃이 넘치지 않는다.
- 콘솔 JS 오류가 없다.
- `npm run build` 결과 dist 생성 정상.

---

## Task 9: Commit and push

**Objective:** 검증된 디자인 변경사항을 GitHub main에 올린다.

**Commands:**

```bash
git status --short
git add src/App.tsx src/App.css src/components
npm run lint
npm run build
git commit -m "feat: add retro radio visual experience"
git push origin main
```

**Expected:** Cloudflare Pages가 GitHub main 자동 배포를 시작한다.

---

## Acceptance Criteria

- 현재 오디오 재생/자동 재연결 기능이 유지된다.
- 페이지가 레트로 라디오처럼 보인다.
- 재생 중이라는 상태가 한눈에 보인다.
- 캐릭터/이퀄라이저 애니메이션은 재생 중에만 움직인다.
- 모바일에서 보기 좋다.
- 이미지 에셋 없이 CSS 중심으로 구현한다.
- `npm run lint` 통과.
- `npm run build` 통과.
- GitHub에 푸시 가능.

---

## Optional Later Ideas

나중에 추가하면 좋은 것들:

1. 방송국 여러 개 추가 시 라디오 다이얼 돌리는 UI
2. 현재 시간대에 따라 배경 조명 바뀌기
3. 매장 모드: 화면 항상 켜짐 안내
4. Verygood Chocolate 브랜드 컬러 더 반영
5. 작은 “ON AIR” 네온 사인
6. iOS 홈화면 아이콘/스플래시 이미지 개선

---

## Recommendation

1차 구현은 과하게 꾸미지 말고, 아래 3개만 먼저 한다.

1. 레트로 라디오 CSS 일러스트
2. 재생 중 이퀄라이저/전파 애니메이션
3. 작은 캐릭터의 은은한 춤

이 정도면 기능은 그대로 두면서도 “앱을 켜놓고 싶은” 느낌이 생긴다.
