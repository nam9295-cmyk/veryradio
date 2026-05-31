export type AutoReconnectInput = {
  userWantsPlayback: boolean
  attempt: number
  maxAttempts: number
}

const BASE_RECONNECT_DELAY_MS = 1500
const MAX_RECONNECT_DELAY_MS = 30000

export function shouldAutoReconnect({ userWantsPlayback, attempt, maxAttempts }: AutoReconnectInput) {
  return userWantsPlayback && attempt < maxAttempts
}

export function getReconnectDelayMs(attempt: number) {
  const safeAttempt = Math.max(0, attempt)
  return Math.min(BASE_RECONNECT_DELAY_MS * 2 ** safeAttempt, MAX_RECONNECT_DELAY_MS)
}
