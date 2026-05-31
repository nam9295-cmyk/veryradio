import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { getReconnectDelayMs, shouldAutoReconnect } from '../src/reconnectPolicy.js'

test('auto reconnect only runs while the listener still wants playback', () => {
  assert.equal(shouldAutoReconnect({ userWantsPlayback: true, attempt: 0, maxAttempts: 8 }), true)
  assert.equal(shouldAutoReconnect({ userWantsPlayback: false, attempt: 0, maxAttempts: 8 }), false)
})

test('auto reconnect stops after the configured attempt limit', () => {
  assert.equal(shouldAutoReconnect({ userWantsPlayback: true, attempt: 7, maxAttempts: 8 }), true)
  assert.equal(shouldAutoReconnect({ userWantsPlayback: true, attempt: 8, maxAttempts: 8 }), false)
})

test('reconnect delay backs off but stays capped for shop playback', () => {
  assert.equal(getReconnectDelayMs(0), 1500)
  assert.equal(getReconnectDelayMs(1), 3000)
  assert.equal(getReconnectDelayMs(2), 6000)
  assert.equal(getReconnectDelayMs(10), 30000)
})
