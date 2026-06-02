import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { NenneDJ } from './components/NenneDJ'
import { getReconnectDelayMs, shouldAutoReconnect } from './reconnectPolicy'
import { defaultStation } from './stations'

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error'
type AudioMood = 'silent' | 'voice' | 'music'
type AudioContextConstructor = typeof AudioContext

const statusCopy: Record<PlaybackState, string> = {
  idle: '대기 중',
  loading: '연결 중',
  playing: '재생 중',
  paused: '일시정지',
  error: '연결 오류',
}

const MAX_AUTO_RECONNECT_ATTEMPTS = 8
const STALL_RECONNECT_DELAY_MS = 12000
const AUDIO_ANALYSIS_INTERVAL_MS = 220
const AUDIO_MUSIC_RMS_THRESHOLD = 0.052
const AUDIO_VOICE_RMS_THRESHOLD = 0.017
const AUDIO_SILENCE_RMS_THRESHOLD = 0.011
const AUDIO_DYNAMIC_THRESHOLD = 0.014

function App() {
  const station = defaultStation
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioAnalysisTimerRef = useRef<number | null>(null)
  const audioMoodFallbackTimerRef = useRef<number | null>(null)
  const audioSourceCreatedRef = useRef(false)
  const recentRmsRef = useRef<number[]>([])
  const audioAnalysisUnavailableRef = useRef(false)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const stallTimeoutRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const userWantsPlaybackRef = useRef(false)
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [audioMood, setAudioMood] = useState<AudioMood>('silent')
  const [volume, setVolume] = useState(0.82)
  const [errorMessage, setErrorMessage] = useState('')

  const isPlaying = playbackState === 'playing' || playbackState === 'loading'
  const cardClassName = `radio-card state-${playbackState} audio-${audioMood}`

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

  const stopAudioAnalysis = useCallback(() => {
    if (audioAnalysisTimerRef.current !== null) {
      window.clearInterval(audioAnalysisTimerRef.current)
      audioAnalysisTimerRef.current = null
    }
    if (audioMoodFallbackTimerRef.current !== null) {
      window.clearTimeout(audioMoodFallbackTimerRef.current)
      audioMoodFallbackTimerRef.current = null
    }
    recentRmsRef.current = []
  }, [])

  const setupAudioAnalysis = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || audioAnalysisUnavailableRef.current) return false

    try {
      const AudioContextClass = (window.AudioContext
        || (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext) as AudioContextConstructor | undefined
      if (!AudioContextClass) {
        audioAnalysisUnavailableRef.current = true
        setAudioMood('music')
        return false
      }

      const audioContext = audioContextRef.current ?? new AudioContextClass()
      audioContextRef.current = audioContext

      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      if (!analyserRef.current) {
        analyserRef.current = audioContext.createAnalyser()
        analyserRef.current.fftSize = 1024
        analyserRef.current.smoothingTimeConstant = 0.78
      }

      if (!audioSourceCreatedRef.current) {
        const source = audioContext.createMediaElementSource(audio)
        source.connect(analyserRef.current)
        analyserRef.current.connect(audioContext.destination)
        audioSourceCreatedRef.current = true
      }

      return true
    } catch {
      audioAnalysisUnavailableRef.current = true
      setAudioMood('music')
      return false
    }
  }, [])

  const startAudioAnalysis = useCallback(() => {
    stopAudioAnalysis()

    const analyser = analyserRef.current
    const audio = audioRef.current
    if (!analyser || !audio) return

    const frequencyData = new Uint8Array(analyser.frequencyBinCount)
    let silentTicks = 0

    audioMoodFallbackTimerRef.current = window.setTimeout(() => {
      if (!audio.paused && !audio.ended && userWantsPlaybackRef.current) {
        const hasReadableSignal = recentRmsRef.current.some((rms) => rms > AUDIO_SILENCE_RMS_THRESHOLD)
        if (!hasReadableSignal) {
          setAudioMood('music')
        }
      }
    }, 1800)

    const analyze = () => {
      if (audio.paused || audio.ended || !userWantsPlaybackRef.current) {
        setAudioMood('silent')
        return
      }

      analyser.getByteFrequencyData(frequencyData)

      const normalized = Array.from(frequencyData, (value) => value / 255)
      const rms = Math.sqrt(normalized.reduce((sum, value) => sum + value * value, 0) / normalized.length)
      const bassEnd = Math.max(4, Math.floor(normalized.length * 0.16))
      const bass = normalized.slice(0, bassEnd).reduce((sum, value) => sum + value, 0) / bassEnd
      const recent = [...recentRmsRef.current.slice(-7), rms]
      recentRmsRef.current = recent
      const mean = recent.reduce((sum, value) => sum + value, 0) / recent.length
      const dynamics = recent.reduce((sum, value) => sum + Math.abs(value - mean), 0) / recent.length

      let nextMood: AudioMood = 'voice'
      if (rms < AUDIO_SILENCE_RMS_THRESHOLD) {
        silentTicks += 1
        const noReadableSignal = silentTicks > 8 && recent.every((value) => value < AUDIO_SILENCE_RMS_THRESHOLD)
        nextMood = noReadableSignal ? 'music' : 'silent'
      } else if (
        rms > AUDIO_MUSIC_RMS_THRESHOLD
        || (rms > AUDIO_VOICE_RMS_THRESHOLD && bass > AUDIO_MUSIC_RMS_THRESHOLD && dynamics > AUDIO_DYNAMIC_THRESHOLD)
      ) {
        silentTicks = 0
        nextMood = 'music'
      } else {
        silentTicks = 0
        nextMood = rms > AUDIO_VOICE_RMS_THRESHOLD ? 'voice' : 'silent'
      }

      setAudioMood((currentMood) => (currentMood === nextMood ? currentMood : nextMood))
    }

    analyze()
    audioAnalysisTimerRef.current = window.setInterval(analyze, AUDIO_ANALYSIS_INTERVAL_MS)
  }, [stopAudioAnalysis])

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
      const canAnalyzeAudio = await setupAudioAnalysis()
      if (canAnalyzeAudio) {
        startAudioAnalysis()
      } else {
        setAudioMood('music')
      }
      reconnectAttemptsRef.current = 0
      setPlaybackState('playing')
    } catch (error) {
      const message = error instanceof Error ? error.message : '재생을 시작할 수 없습니다.'
      setPlaybackState('error')
      setErrorMessage(message)
    }
  }, [clearReconnectTimer, clearStallTimer, setupAudioAnalysis, startAudioAnalysis, station.streamUrl])

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
    stopAudioAnalysis()
    audio.pause()
    setAudioMood('silent')
    setErrorMessage('')
    setPlaybackState('paused')
  }, [clearReconnectTimer, clearStallTimer, stopAudioAnalysis])

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
      stopAudioAnalysis()
    }
  }, [clearReconnectTimer, clearStallTimer, scheduleAutoReconnect, stopAudioAnalysis])

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

        <div className="club-board">
          <div className="visual-stage">
            <NenneDJ state={playbackState} />
          </div>

          <div className="station-panel">
            <p className="station-kicker">LIVE FROM LOS ANGELES</p>
            <h2>{station.name}</h2>
            <p className="station-meta">{station.city} · {station.country} · LIVE MUSIC</p>
            <p className="station-tagline">{station.tagline}</p>
          </div>

          <div className="board-controls">
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
              <span>{isPlaying ? 'STOP' : 'PLAY'}</span>
            </button>
          </div>
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
