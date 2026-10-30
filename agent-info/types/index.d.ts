export type Run = {
  isRunning: boolean
  startedAt: number
  elapsedMs: number
  // Cost of this task so far, in US dollars
  spentUsd: number
  // Task-list progress, when the model keeps one
  done: number
  total: number
  steps: number
  tick: number
}

declare module 'claude-code' {
  interface PluginState {
    'agent-info': { isOn: boolean; run: Shaped<Run | null> }
  }
}
