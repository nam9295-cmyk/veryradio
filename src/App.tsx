import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { defaultStation } from './stations'

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

const statusCopy: Record<PlaybackState, string> = {
  idle: '대기 중',
  loading: '연결 중',
  playing: '재생 중',
  paused: '일시정지',
  error: '연결 오류',
}

function App() {
  const station = defaultStation
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [volume, setVolume] = useState(0.82)
  const [errorMessage, setErrorMessage] = useState('')

  const isPlaying = playbackState === 'playing' || playbackState === 'loading'

  const mediaMetadata = useMemo(
    () => ({
      title: station.name,
      artist: '베리굿 라디오',
      album: `${station.city}, ${station.country}`,
    }),
    [station.city, station.country, station.name],
  )

  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    setErrorMessage('')
    setPlaybackState('loading')

    if (!audio.src) {
      audio.src = station.streamUrl
    }

    try {
      await audio.play()
      setPlaybackState('playing')
    } catch (error) {
      const message = error instanceof Error ? error.message : '재생을 시작할 수 없습니다.'
      setPlaybackState('error')
      setErrorMessage(message)
    }
  }, [station.streamUrl])

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    setPlaybackState('paused')
  }, [])

  const reconnect = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    audio.src = `${station.streamUrl}?_=${Date.now()}`
    await play()
  }, [play, station.streamUrl])

  const togglePlayback = () => {
    if (isPlaying) {
      pause()
    } else {
      void play()
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = volume
  }, [volume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleWaiting = () => setPlaybackState('loading')
    const handlePlaying = () => {
      setErrorMessage('')
      setPlaybackState('playing')
    }
    const handlePause = () => setPlaybackState((state) => (state === 'error' ? 'error' : 'paused'))
    const handleError = () => {
      setPlaybackState('error')
      setErrorMessage('스트림 연결이 끊겼습니다. 다시 연결을 눌러주세요.')
    }
    const handleStalled = () => setPlaybackState('loading')

    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('playing', handlePlaying)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('error', handleError)
    audio.addEventListener('stalled', handleStalled)

    return () => {
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('playing', handlePlaying)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('stalled', handleStalled)
    }
  }, [])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata(mediaMetadata)
    navigator.mediaSession.setActionHandler('play', () => {
      void play()
    })
    navigator.mediaSession.setActionHandler('pause', pause)
    navigator.mediaSession.setActionHandler('stop', pause)

    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('stop', null)
    }
  }, [mediaMetadata, pause, play])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    navigator.mediaSession.playbackState = playbackState === 'playing' ? 'playing' : playbackState === 'paused' ? 'paused' : 'none'
  }, [playbackState])

  return (
    <main className="app-shell">
      <audio ref={audioRef} preload="none" playsInline crossOrigin="anonymous" />

      <section className="radio-card" aria-label="베리굿 라디오 플레이어">
        <div className="brand-row">
          <span className="brand-mark" aria-hidden="true">VG</span>
          <div>
            <p className="eyebrow">Verygood Radio</p>
            <h1>베리굿 라디오</h1>
          </div>
        </div>

        <div className="station-panel">
          <p className="station-kicker">Now streaming</p>
          <h2>{station.name}</h2>
          <p className="station-meta">{station.city} · {station.country} · {station.codecHint.toUpperCase()}</p>
          <p className="station-tagline">{station.tagline}</p>
        </div>

        <button
          className={`play-button ${isPlaying ? 'is-playing' : ''}`}
          type="button"
          onClick={togglePlayback}
          aria-label={isPlaying ? '라디오 일시정지' : '라디오 재생'}
        >
          <span className="play-icon" aria-hidden="true">{isPlaying ? 'Ⅱ' : '▶'}</span>
          <span>{isPlaying ? '멈추기' : '재생'}</span>
        </button>

        <div className={`status-pill status-${playbackState}`} role="status" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          {statusCopy[playbackState]}
        </div>

        {errorMessage && (
          <div className="error-box">
            <p>{errorMessage}</p>
            <button type="button" onClick={() => void reconnect()}>다시 연결</button>
          </div>
        )}

        <label className="volume-control">
          <span>볼륨</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
          <strong>{Math.round(volume * 100)}%</strong>
        </label>

        <p className="hint">
          처음 한 번은 재생 버튼을 눌러야 백그라운드 재생이 시작됩니다. 홈 화면에 설치하면 앱처럼 사용할 수 있어요.
        </p>
      </section>
    </main>
  )
}

export default App
