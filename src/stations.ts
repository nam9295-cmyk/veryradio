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
    tagline: 'Live pop radio from LA',
    streamUrl: 'https://stream.revma.ihrhls.com/zc185',
    codecHint: 'aac',
  },
]

export const defaultStation = stations[0]
