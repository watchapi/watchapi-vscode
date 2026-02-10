# WatchAPI - REST Client & API Testing

[![CI](https://github.com/watchapi/watchapi/actions/workflows/ci.yml/badge.svg)](https://github.com/watchapi/watchapi/actions/workflows/ci.yml)
[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/WatchAPI.watchapi-client)](https://marketplace.visualstudio.com/items?itemName=WatchAPI.watchapi-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
<a href="https://discord.gg/5JPCwzASbs">
<img src="https://img.shields.io/badge/chat-on%20discord-7289DA.svg" alt="Discord Chat" />
</a>

<!-- > What is this tool in one short sentence? -->

<!-- > WatchAPI allows you to easily extract and manage endpoints directly from editor. -->

> WatchAPI is REST & tRPC Client for modern backends

---

## Why This Exists

- Makes code as source of truth for API tests
- Reduces API drifts and context switching
- Closes the gap between actual code and tool for testing

---

## What It Does

- Extracts API schemas as ready to use tests
- Removes the need to write tests manually
- Organizing APIs directly in the code editor

---

## Supported Environments

- **Next.js (App router), NestJS and tRPC** - main focus
- **Next.js (Pages router)** - less accurate
- **Express, Fastify and Hono** - planned

---

## Quick Start

### Installation

1. Install the extension: [Marketplace](https://marketplace.visualstudio.com/items?itemName=WatchAPI.watchapi-client) or [Open VSX](https://open-vsx.org/extension/watchapi/watchapi-client)
2. Click the 'watch' icon in the activity bar
3. **Pull from Code:** Auto-detect all Next.js/NestJS/tRPC endpoints (recommended)
4. **Or create manually:** Click '+ New Collection' to add endpoints by hand
5. Navigate and open requests to execute: 'Send Request'

---

## How It Works

Endpoints been extracted from code directlry in deterministic manner. More schemas and transparent

- Where does the data come from?
- Is the behavior static, dynamic, or derived?
- What guarantees correctness?
- What tradeoffs were intentionally made?

---

## Configuration

To configure environments you have: `rest-client.env.json` file.

```json
{
    "local": {
        // To configure base url
        "baseUrl": "http://localhost:3000",
        // To configure authentication token
        "authToken": ""
    },
    "prod": {}
}
```

- Is configuration optional or required?
- What happens with zero configuration?
- What kinds of behavior can be customized?

---

## Design Principles

- What rules guide decisions in this project?
- What is prioritized over convenience?
- What is avoided even if it looks useful?

---

## Typical Use Cases

- When should someone reach for this tool?
- What situations does it fit especially well?
- When might it not be the right choice?

---

## Limitations

- What does the tool not handle yet?
- What assumptions does it make?
- What edge cases should users be aware of?

---

## Roadmap Direction

- What areas will likely evolve next?
- What is intentionally undecided?
- What will not be added without strong reason?

---

## Feedback & Contributions

- How should users report problems?
- What information is essential in a report?
- Are contributions welcome, and under what expectations?

---

## License

- What license applies?
- Are there usage or distribution constraints?

---

## Notes on Automation / AI (if applicable)

- Where is automation used?
- Where is it intentionally not used?
- How is correctness validated?

---
