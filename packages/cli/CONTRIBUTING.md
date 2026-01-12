# Contributing to @watchapi/cli

Help keep this CLI easy to ship by following these lightweight steps.

## Prerequisites

- Node.js 18 or newer
- `pnpm` installed (uses `pnpm-lock.yaml`)

## Setup

```bash
git clone https://github.com/watchapi/watchapi-cli.git
cd packages/cli
pnpm install
```

## Develop

- Build once: `pnpm build`
- Watch mode during edits: `pnpm dev`
- One-off checks: `pnpm type-check`

## Before opening a PR

- Ensure commands you touched still run (e.g., `pnpm start -- --help`).
- Update `README.md` if flags or behavior changed.
- Keep changes focused and small.
