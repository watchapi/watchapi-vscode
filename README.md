# WatchAPI Client

WatchAPI Client is an API client for organizing, and testing REST and tRPC endpoints.

It extracts endpoints directly from Next.js or tRPC codebase, structures them into collections, and lets execute requests and inspect responses - without context switches.

![WatchAPI](./assets/screenshot-preview-2.png "WatchAPI Client")

> Built on the official [REST Client extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) for request syntax and execution.

## Features

- **Endpoint Collections**: Automatically group and organize discovered endpoints
- **HTTP Method Support**: Execute GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS requests
- **Response Inspection**: Inspect status codes, headers, and response bodies inline
- **Bulk Import**: Sync multiple endpoints from Next.js and tRPC projects in one pass
- **Local-First by Default**: All data stored locally in VS Code
- **Optional Cloud Sync**: Sync collections across devices and collaborate with teams
- **Multi-Organization Support**: Switch between organizations when logged in
- **Dashboard Access**: Open related endpoints in the WatchAPI dashboard (when logged in)

## Quick Start

1. Install the extension
2. Open the WatchAPI activity view in VS Code
3. Sync or create a collection
4. Execute requests and inspect responses
5. **(Optional)** Sign in to enable sync and collaboration

## Privacy & Security

- **Local-First**: Collections and endpoints remain on your machine by default
- **Opt-In Sync**: Cloud sync is enabled only when you explicitly sign in
- **No Telemetry**: No usage tracking or analytics collected from the extension
- **Full Control**: Your data stays local unless you choose otherwise

Privacy Policy: [https://watchapi.dev/privacy](https://watchapi.dev/privacy)

## Need Help?

Found a bug or missing feature?
Open an issue on [GitHub](https://github.com/watchapi/watchapi-client/issues/new) or visit [https://watchapi.dev](https://watchapi.dev)

---

Built by developers who want API management and control **where they write code**.
