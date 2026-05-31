import type { RetroRadioState } from './RetroRadio'

type DancingMascotProps = {
  state: RetroRadioState
}

export function DancingMascot({ state }: DancingMascotProps) {
  return (
    <div className={`mascot mascot-${state}`} aria-hidden="true">
      <span className="mascot-arm mascot-arm-left" />
      <span className="mascot-arm mascot-arm-right" />
      <span className="mascot-head">
        <span className="mascot-eye mascot-eye-left" />
        <span className="mascot-eye mascot-eye-right" />
        <span className="mascot-smile" />
      </span>
      <span className="mascot-foot mascot-foot-left" />
      <span className="mascot-foot mascot-foot-right" />
    </div>
  )
}
