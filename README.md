# claude-plugins

Claude Code plugins.

## agent-info

Type `/agent-info` to show a progress bar, elapsed time and estimated cost
above the prompt while Claude works on a task:

```
████████████░░░░░░░░ Running 3/5 tasks · 1m 12s · $0.420 so far · est. $0.700
```

- `/agent-info` toggles it; `/agent-info on` / `/agent-info off` set it. The
  choice is remembered across sessions.
- The bar fills as Claude ticks off its task list. With no list, it shows a
  sliding block and a count of tool calls.
- Cost comes from the same total as `/cost`. The estimate is the cost so far
  divided by the share of the task list that is done, so it appears once at
  least one item is complete.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install agent-info --marketplace shajipjoseph-bot/claude-plugins
```

From a shell:

```bash
claude plugin install agent-info --marketplace shajipjoseph-bot/claude-plugins
```

In the desktop app: click **+** next to the prompt box, then **Plugins**,
**Add marketplace** with `shajipjoseph-bot/claude-plugins`, then **Add plugin**.

This repository is private: installing needs read access to it on GitHub and a
git credential for github.com on your machine (an SSH key, or
`gh auth login` then `gh auth setup-git`).
