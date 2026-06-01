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
    id: 'la-night-groove',
    name: 'LA NIGHT GROOVE',
    city: 'Palm City',
    country: 'West Coast',
    tagline: '야자수 아래 흐르는 LA 음악 방송 무드',
    streamUrl: 'https://stream.revma.ihrhls.com/zc185',
    codecHint: 'aac',
  },
]

export const defaultStation = stations[0]
