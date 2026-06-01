export type NenneDJState = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

type NenneDJProps = {
  state: NenneDJState
}

const frames = [1, 2, 3, 4, 5, 6]

export function NenneDJ({ state }: NenneDJProps) {
  return (
    <div className={`nenne-dj nenne-dj-${state}`} aria-hidden="true">
      <div className="nenne-dj-glow" />
      {frames.map((frame) => (
        <img
          className={`nenne-dj-frame nenne-dj-frame-${frame}`}
          key={frame}
          src={`/characters/nenne_dj_${frame}.webp`}
          alt=""
          draggable="false"
        />
      ))}
    </div>
  )
}
