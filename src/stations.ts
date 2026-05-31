export type Station = {
  id: string
  name: string
  city: string
  country: string
  tagline: string
  streamUrl: string
  codecHint: 'aac' | 'mp3' | 'hls'
}

export const stations: Station[] = [
  {
    id: 'kiis-fm-la',
    name: 'KIIS FM 102.7',
    city: 'Los Angeles',
    country: 'USA',
    tagline: '매장에 흐르는 LA 팝 라디오',
    streamUrl: 'https://stream.revma.ihrhls.com/zc185',
    codecHint: 'aac',
  },
]

export const defaultStation = stations[0]
