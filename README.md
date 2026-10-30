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

You need [Git](https://git-scm.com/) installed. Then, from a shell
(PowerShell, Command Prompt or a terminal), run these two commands:

```bash
claude plugin marketplace add shajipjoseph-bot/claude-plugins
```

```bash
claude plugin install agent-info@shajipjoseph-plugins
```

`shajipjoseph-plugins` is the marketplace's own name, which differs from the
repository's. Start a new session with `claude` and type `/agent-info`.

This repository is private: installing needs read access to it on GitHub and a
git credential for github.com on your machine. The simplest is the GitHub CLI,
`gh auth login` then `gh auth setup-git`.

Adding the marketplace from the claude.ai / desktop app's Customize screen
failed for this private repository when tried; use the commands above.

### Troubleshooting

- **`'C:\Users\<you>\git' is not recognized`** (Windows): a stray file or
  folder named `git` in the folder you ran the command from is hiding the real
  Git. Run the command from another folder (`cd $env:TEMP`), or rename that
  stray item if it is not yours (an empty file named `git` is safe to rename).
- **`Plugin "agent-info" not found in marketplace`**: the marketplace was not
  added; run the `marketplace add` command again and read its error.

To update later: `claude plugin marketplace update shajipjoseph-plugins`.
