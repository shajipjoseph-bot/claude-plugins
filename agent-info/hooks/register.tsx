import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Run } from '../types'

const BAR = 20
const isOn = atom({ plugin: 'agent-info', key: 'isOn' } as const, false)
const run = atom({ plugin: 'agent-info', key: 'run' } as const, null, {
  shape: 'run-1',
})

const fmtUsd = (usd: number) => `$${usd < 1 ? usd.toFixed(3) : usd.toFixed(2)}`

const fmtTime = (ms: number) => {
  const s = Math.floor(ms / 1000)

  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

// A determinate bar when the model keeps a task list, else a sliding block.
const bar = (r: Run) => {
  if (r.total > 0) {
    const filled = Math.round((Math.min(r.done, r.total) / r.total) * BAR)

    return '█'.repeat(filled) + '░'.repeat(BAR - filled)
  }
  if (!r.isRunning) {
    return '█'.repeat(BAR)
  }
  const span = BAR - 4
  const pos = Math.abs((r.tick % (span * 2)) - span)

  return '░'.repeat(pos) + '████' + '░'.repeat(span - pos)
}

// Projected total: what was spent, scaled by how much of the list is done.
const estimate = (r: Run) =>
  r.total > 0 && r.done > 0 ? (r.spentUsd * r.total) / Math.min(r.done, r.total) : undefined

const summary = (r: Run) => {
  const progress = r.total > 0 ? `${Math.min(r.done, r.total)}/${r.total} tasks` : `${r.steps} tool calls`
  const est = estimate(r)
  const cost = r.isRunning
    ? `${fmtUsd(r.spentUsd)} so far · est. ${est === undefined ? 'n/a' : fmtUsd(est)}`
    : `cost ${fmtUsd(r.spentUsd)}`

  return `${r.isRunning ? 'Running' : 'Done'} ${progress} · ${fmtTime(r.elapsedMs)} · ${cost}`
}

async function costNow($: EngineInterface) {
  return (await $.session.usage()).cost?.usd ?? 0
}

export const register: Register = on => {
  let baseUsd = 0
  let timer: Timer | undefined

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'agent-info',
      description: 'Toggle a live progress bar and estimated cost while a task runs (on|off)',
    })
    if ((await $.store.get('isOn')) === true) {
      await update($, isOn, () => true)
    }

    return next(e)
  })

  on('command.run', { command: 'agent-info' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const want = arg === 'on' ? true : arg === 'off' ? false : !(await read($, isOn))
    await update($, isOn, () => want)
    await $.store.set('isOn', want)
    if (!want) {
      $.ui.status(undefined)
    }

    return {
      text: want
        ? 'Agent info on: a progress bar and estimated cost show above the prompt while a task runs. /agent-info off to hide.'
        : 'Agent info off.',
    }
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }
    const startedAt = await $.clock.now()
    baseUsd = await costNow($)
    await update($, run, () => ({
      isRunning: true,
      startedAt,
      elapsedMs: 0,
      spentUsd: 0,
      done: 0,
      total: 0,
      steps: 0,
      tick: 0,
    }))
    timer?.cancel()
    timer = $.clock.every(1000, async () => {
      const now = await $.clock.now()
      const usd = await costNow($)
      const r = await update($, run, cur =>
        cur && cur.isRunning
          ? { ...cur, elapsedMs: now - cur.startedAt, spentUsd: usd - baseUsd, tick: cur.tick + 1 }
          : cur,
      )
      if (r && r.isRunning && (await read($, isOn))) {
        $.ui.status(`${bar(r)} ${summary(r)}`)
      }
    })

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    await update($, run, cur => (cur && cur.isRunning ? { ...cur, steps: cur.steps + 1 } : cur))

    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const res = await next(e)
    if (res.deny === undefined && res.isError !== true) {
      const total = e.todos.length
      const done = e.todos.filter(t => t.status === 'completed').length
      await update($, run, cur => (cur ? { ...cur, total, done } : cur))
    }

    return res
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const res = await next(e)
    if (res.deny === undefined && res.isError !== true) {
      await update($, run, cur => (cur ? { ...cur, total: cur.total + 1 } : cur))
    }

    return res
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const res = await next(e)
    if (res.deny === undefined && res.isError !== true) {
      if (e.status === 'completed') {
        await update($, run, cur => (cur ? { ...cur, done: cur.done + 1 } : cur))
      } else if (e.status === 'deleted') {
        await update($, run, cur => (cur ? { ...cur, total: Math.max(0, cur.total - 1) } : cur))
      }
    }

    return res
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      timer?.cancel()
      timer = undefined
      const now = await $.clock.now()
      const usd = await costNow($)
      await update($, run, cur =>
        cur
          ? { ...cur, isRunning: false, elapsedMs: now - cur.startedAt, spentUsd: usd - baseUsd }
          : cur,
      )
      $.ui.status(undefined)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const r = await read($, run)
    if (e.props.hasSurvey || r === null || !(await read($, isOn))) {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text color={r.isRunning ? 'claude' : 'success'}>{bar(r)} </Text>
        <Text dimColor>{summary(r)}</Text>
      </Box>
    )
  })
}
