# Verygood Radio 배포 메모

## 앱 형태

- Vite + React + TypeScript 정적 PWA
- 서버/API 없음
- Cloudflare Pages 배포에 적합
- 빌드 결과물: `dist/`

## 로컬 명령

```bash
npm install
npm run lint
npm run build
npm run preview -- --host 0.0.0.0
```

## Cloudflare Pages 배포

```bash
npm run build
npx wrangler pages project create verygood-radio --production-branch main
npx wrangler pages deploy dist --project-name verygood-radio
```

이미 프로젝트가 있으면 create 명령은 생략하고 deploy만 실행합니다.

## 설정값

- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`

## PWA/오디오 주의

- 사용자가 처음 한 번 재생 버튼을 눌러야 모바일 브라우저에서 오디오 재생이 시작됩니다.
- 서비스 워커는 앱 화면만 캐싱합니다.
- KIIS FM 라이브 오디오 스트림은 항상 NetworkOnly로 받아야 하며 캐싱하지 않습니다.
- iOS/Android 백그라운드 재생은 OS 정책에 따라 강제 종료될 수 있으므로 실제 매장 폰에서 테스트해야 합니다.
