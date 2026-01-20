# WatchAPI JetBrains Plugin

A JetBrains IDE plugin for API route detection and monitoring. Works with WebStorm, IntelliJ IDEA, and other JetBrains IDEs.

## Features

- Automatic API route detection on project open
- Support for:
  - Next.js App Router
  - Next.js Pages Router
  - tRPC
  - NestJS
- Tool window for viewing detected routes
- Menu actions for manual route detection

## Development

### Prerequisites

- JDK 17 or later
- Gradle 8.5 or later
- IntelliJ IDEA (for plugin development)

### Quick Start (macOS)

```bash
# Install Java 17
brew install openjdk@17
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk

# Install Gradle
brew install gradle

# Initialize the Gradle wrapper
cd packages/jetbrains-plugin
gradle wrapper

# Build the plugin
./gradlew build

# Run the plugin in a sandboxed IDE (downloads IntelliJ automatically)
./gradlew runIde
```

### Building

```bash
# Build the plugin
./gradlew build

# Run the plugin in a sandboxed IDE
./gradlew runIde

# Package the plugin for distribution
./gradlew buildPlugin
```

### Project Structure

```
src/main/
├── kotlin/com/watchapi/plugin/
│   ├── actions/           # Menu actions
│   │   ├── DetectRoutesAction.kt
│   │   └── RefreshRoutesAction.kt
│   ├── services/          # Background services
│   │   └── RouteDetectionService.kt
│   ├── toolwindow/        # UI components
│   │   └── WatchApiToolWindowFactory.kt
│   └── WatchApiStartupActivity.kt
└── resources/
    ├── META-INF/
    │   └── plugin.xml     # Plugin configuration
    └── icons/
        └── watchapi.svg   # Plugin icon
```

### Testing with WebStorm

To test specifically with WebStorm, uncomment the `ideDir` line in `build.gradle.kts`:

```kotlin
runIde {
    ideDir.set(file("/Applications/WebStorm.app/Contents"))
}
```

## Integration with @watchapi/parsers

This plugin can use the `@watchapi/parsers` npm package for accurate route detection. When Node.js is available and the package is installed, the plugin will use it for parsing. Otherwise, it falls back to simple file-based detection.

To enable full parsing support:

```bash
npm install @watchapi/parsers
# or
pnpm add @watchapi/parsers
```

## License

MIT
