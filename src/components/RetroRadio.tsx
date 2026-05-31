export type RetroRadioState = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

export type RetroRadioProps = {
  state: RetroRadioState
}

const equalizerBars = Array.from({ length: 5 }, (_, index) => index)
const signalRings = Array.from({ length: 3 }, (_, index) => index)

export function RetroRadio({ state }: RetroRadioProps) {
  return (
    <div className={`retro-radio retro-radio-${state}`} aria-hidden="true">
      <div className="radio-signal" aria-hidden="true">
        {signalRings.map((ring) => (
          <span key={ring} />
        ))}
      </div>
      <div className="radio-antenna" />
      <div className="radio-body">
        <div className="radio-speaker">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="radio-face">
          <div className="radio-window">
            <span className="radio-window-copy">KIIS 102.7</span>
            <span className="radio-window-scan" />
          </div>
          <div className="signal-bars">
            {equalizerBars.map((bar) => (
              <span className="signal-bar" key={bar} />
            ))}
          </div>
          <div className="radio-controls">
            <div className="radio-dial" />
            <div className="radio-tuning-line" />
          </div>
        </div>
      </div>
      <div className="radio-shadow" />
    </div>
  )
}
