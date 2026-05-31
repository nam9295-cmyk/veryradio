import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { DancingMascot } from './components/DancingMascot'
import { RetroRadio } from './components/RetroRadio'
import { getReconnectDelayMs, shouldAutoReconnect } from './reconnectPolicy'
import { defaultStation } from './stations'

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

const statusCopy: Record<PlaybackState, string> = {
  idle: '대기 중',
  loading: '연결 중',
  playing: '재생 중',
  paused: '일시정지',
  error: '연결 오류',
}

const MAX_AUTO_RECONNECT_ATTEMPTS = 8
const STALL_RECONNECT_DELAY_MS = 12000

function App() {
  const station = defaultStation
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const stallTimeoutRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const userWantsPlaybackRef = useRef(false)
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [volume, setVolume] = useState(0.82)
  const [errorMessage, setErrorMessage] = useState('')

  const isPlaying = playbackState === 'playing' || playbackState === 'loading'
  const cardClassName = `radio-card state-${playbackState}`

  const mediaMetadata = useMemo(
    () => ({
      title: station.name,
      artist: '베리굿 라디오',
      album: `${station.city}, ${station.country}`,
    }),
    [station.city, station.country, station.name],
  )

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current === null) return
    window.clearTimeout(reconnectTimeoutRef.current)
    reconnectTimeoutRef.current = null
  }, [])

  const clearStallTimer = useCallback(() => {
    if (stallTimeoutRef.current === null) return
    window.clearTimeout(stallTimeoutRef.current)
    stallTimeoutRef.current = null
  }, [])

  const startPlayback = useCallback(async (forceFreshStream = false) => {
    const audio = audioRef.current
    if (!audio) return

    clearReconnectTimer()
    clearStallTimer()
    setErrorMessage('')
    setPlaybackState('loading')

    if (forceFreshStream) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }

    if (!audio.src) {
      const cacheBuster = forceFreshStream ? `?_=${Date.now()}` : ''
      audio.src = `${station.streamUrl}${cacheBuster}`
    }

    try {
      await audio.play()
      reconnectAttemptsRef.current = 0
      setPlaybackState('playing')
    } catch (error) {
      const message = error instanceof Error ? error.message : '재생을 시작할 수 없습니다.'
      setPlaybackState('error')
      setErrorMessage(message)
    }
  }, [clearReconnectTimer, clearStallTimer, station.streamUrl])

  const scheduleAutoReconnect = useCallback((reason: string) => {
    clearReconnectTimer()
    clearStallTimer()

    const attempt = reconnectAttemptsRef.current
    if (!shouldAutoReconnect({
      userWantsPlayback: userWantsPlaybackRef.current,
      attempt,
      maxAttempts: MAX_AUTO_RECONNECT_ATTEMPTS,
    })) {
      setPlaybackState('error')
      setErrorMessage('스트림 연결이 반복해서 끊겼습니다. 다시 연결을 눌러주세요.')
      return
    }

    const delayMs = getReconnectDelayMs(attempt)
    reconnectAttemptsRef.current = attempt + 1
    setPlaybackState('loading')
    setErrorMessage(`스트림이 잠시 끊겼습니다. 자동으로 다시 연결 중입니다. (${reason})`)

    reconnectTimeoutRef.current = window.setTimeout(() => {
      void startPlayback(true)
    }, delayMs)
  }, [clearReconnectTimer, clearStallTimer, startPlayback])

  const play = useCallback(async () => {
    userWantsPlaybackRef.current = true
    await startPlayback(false)
  }, [startPlayback])

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    userWantsPlaybackRef.current = false
    reconnectAttemptsRef.current = 0
    clearReconnectTimer()
    clearStallTimer()
    audio.pause()
    setErrorMessage('')
    setPlaybackState('paused')
  }, [clearReconnectTimer, clearStallTimer])

  const reconnect = useCallback(async () => {
    userWantsPlaybackRef.current = true
    reconnectAttemptsRef.current = 0
    await startPlayback(true)
  }, [startPlayback])

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

    const handleWaiting = () => {
      if (!userWantsPlaybackRef.current) return
      setPlaybackState('loading')
      clearStallTimer()
      stallTimeoutRef.current = window.setTimeout(() => {
        scheduleAutoReconnect('버퍼 지연')
      }, STALL_RECONNECT_DELAY_MS)
    }
    const handlePlaying = () => {
      clearReconnectTimer()
      clearStallTimer()
      reconnectAttemptsRef.current = 0
      setErrorMessage('')
      setPlaybackState('playing')
    }
    const handlePause = () => {
      if (userWantsPlaybackRef.current) return
      setPlaybackState((state) => (state === 'error' ? 'error' : 'paused'))
    }
    const handleError = () => {
      scheduleAutoReconnect('연결 오류')
    }
    const handleStalled = () => {
      if (!userWantsPlaybackRef.current) return
      setPlaybackState('loading')
      clearStallTimer()
      stallTimeoutRef.current = window.setTimeout(() => {
        scheduleAutoReconnect('스트림 정지')
      }, STALL_RECONNECT_DELAY_MS)
    }
    const handleEnded = () => {
      scheduleAutoReconnect('방송 연결 종료')
    }

    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('playing', handlePlaying)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('error', handleError)
    audio.addEventListener('stalled', handleStalled)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('playing', handlePlaying)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('stalled', handleStalled)
      audio.removeEventListener('ended', handleEnded)
      clearReconnectTimer()
      clearStallTimer()
    }
  }, [clearReconnectTimer, clearStallTimer, scheduleAutoReconnect])

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

      <section className={cardClassName} aria-label="베리굿 라디오 플레이어">
        <div className="brand-row">
          <span className="brand-mark" aria-hidden="true">VG</span>
          <div>
            <p className="eyebrow">Verygood Radio</p>
            <h1>베리굿 라디오</h1>
          </div>
        </div>

        <div className="visual-stage">
          <RetroRadio state={playbackState} />
          <DancingMascot state={playbackState} />
        </div>

        <div className="station-panel">
          <p className="station-kicker">ON AIR FROM LA</p>
          <h2>{station.name}</h2>
          <p className="station-meta">{station.city} · {station.country} · {station.codecHint.toUpperCase()}</p>
          <p className="station-tagline">{station.tagline}</p>
        </div>

        <div className={`status-pill status-${playbackState}`} role="status" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          {statusCopy[playbackState]}
        </div>

        <button
          className={`play-button ${isPlaying ? 'is-playing' : ''}`}
          type="button"
          onClick={togglePlayback}
          aria-label={isPlaying ? '라디오 일시정지' : '라디오 재생'}
        >
          <span className="play-icon" aria-hidden="true">{isPlaying ? 'Ⅱ' : '▶'}</span>
          <span>{isPlaying ? '잠시 멈추기' : '라디오 켜기'}</span>
        </button>

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
