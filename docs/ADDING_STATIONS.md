# 방송국 추가 방법

현재 앱은 KIIS FM 102.7 한 채널만 화면에 보여주지만, 내부 구조는 여러 방송국을 추가하기 쉽게 `src/stations.ts`로 분리되어 있습니다.

## 추가 순서

1. 먼저 후보 스트림 URL을 브라우저나 curl로 확인합니다.
   - 브라우저에서 직접 열었을 때 오디오가 나오면 1차 통과입니다.
   - `content-type`이 `audio/aac`, `audio/mpeg`, `application/vnd.apple.mpegurl` 같은 오디오/플레이리스트인지 확인합니다.
2. `src/stations.ts`의 `stations` 배열에 새 항목을 추가합니다.
3. 아직 UI는 첫 번째 방송국만 사용합니다. 여러 채널 UI를 만들 때는 이 배열을 선택 리스트로 바꾸면 됩니다.

## 형식

```ts
{
  id: 'kiis-fm-la',
  name: 'KIIS FM 102.7',
  city: 'Los Angeles',
  country: 'USA',
  tagline: 'Live pop radio from LA',
  streamUrl: 'https://stream.revma.ihrhls.com/zc185',
  codecHint: 'aac',
}
```

## 주의

- 라이브 스트림은 서비스 워커에 캐싱하면 안 됩니다.
- 방송국마다 한국 접속 차단, CORS, 코덱 호환성 문제가 다를 수 있습니다.
- 공식 홈페이지가 막혀도 직접 스트림은 되는 경우가 있고, 반대로 직접 스트림이 나중에 막힐 수도 있습니다.
