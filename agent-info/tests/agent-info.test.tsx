import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'agent-info',
  component: 'AbovePrompt',
  surface: 'terminal',
  props: { hasSurvey: false, isWorking: true, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

test('progress bar and cost estimate follow the task list', async ($, on) => {
  let usd = 1.0
  let now = 0
  on('clock.now', () => ({ value: now }))
  on('clock.every', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'agent-info' } }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000 }, rateLimits: [], cost: { usd } } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.run', () => ({ text: 'engine' }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('tool.call', () => ({ result: {} }))
  on('turn.complete', () => ({ text: 'the answer' }))
  const toasts: string[] = []
  on('ui.toast', (_, e) => (toasts.push(String((e as any).text)), { value: undefined }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const r = await $.command.run({ command: 'agent-info', args: '', origin: { kind: 'composer' } } as any)
  expect(r.text).toMatch(/Agent info on/)

  await $.turn.start({ text: 'go', turnId: 't1' })
  usd = 1.5
  now = 65000
  await $.tool.call({
    tool: 'TodoWrite',
    todos: [
      { content: 'a', status: 'completed', activeForm: 'a' },
      { content: 'b', status: 'in_progress', activeForm: 'b' },
    ],
  })
  expect(toasts.some(t => /1\/2 tasks/.test(t))).toBe(true)
  const done = await $.turn.complete({ answer: '', durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer' } as any)
  expect(done.text).toMatch(/Done 1\/2 tasks · 1m 5s · cost \$0\.500/)

  const ui = await $.ui.mount(BAND as any)
  const line = await ui.find({ type: 'Text', text: /cost/ })
  expect(line?.text).toMatch(/Done 1\/2 tasks/)
  expect(line?.text).toMatch(/1m 5s/)
  expect(line?.text).toMatch(/cost \$0\.500/)
  await ui.unmount()
})
