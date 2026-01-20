package com.watchapi.plugin.services

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.util.concurrent.TimeUnit

/**
 * Service for detecting API routes in the project
 * Uses the @watchapi/parsers package via Node.js subprocess
 */
@Service(Service.Level.PROJECT)
class RouteDetectionService(private val project: Project) {

    private val logger = Logger.getInstance(RouteDetectionService::class.java)

    data class DetectionResult(
        val nextAppRoutes: Int = 0,
        val nextPagesRoutes: Int = 0,
        val trpcRoutes: Int = 0,
        val nestjsRoutes: Int = 0,
        val routes: List<Route> = emptyList(),
        val error: String? = null
    ) {
        val totalRoutes: Int get() = nextAppRoutes + nextPagesRoutes + trpcRoutes + nestjsRoutes
        fun hasAnyRoutes(): Boolean = totalRoutes > 0
    }

    data class Route(
        val name: String,
        val path: String,
        val method: String,
        val type: String,
        val filePath: String
    )

    /**
     * Detect routes in the current project
     */
    fun detectRoutes(): DetectionResult {
        val projectPath = project.basePath ?: return DetectionResult(error = "No project path")

        // Check if package.json exists
        val packageJson = File(projectPath, "package.json")
        if (!packageJson.exists()) {
            return DetectionResult(error = "No package.json found")
        }

        // Try Node.js first, then fall back to simple detection
        val nodeResult = try {
            detectWithNodeJs(projectPath)
        } catch (e: Exception) {
            logger.warn("Node.js detection failed: ${e.message}")
            null
        }

        // If Node.js worked and found routes (or no error), use it
        if (nodeResult != null && nodeResult.error == null) {
            return nodeResult
        }

        // Fallback to simple file-based detection
        logger.info("Using simple file-based detection")
        return detectSimple(projectPath)
    }

    /**
     * Detect routes using Node.js and @watchapi/parsers
     */
    private fun detectWithNodeJs(projectPath: String): DetectionResult {
        val script = """
            const path = require('path');

            async function detect() {
                try {
                    // Try to load from project's node_modules first
                    let parsers;
                    try {
                        parsers = require(path.join('$projectPath', 'node_modules', '@watchapi/parsers'));
                    } catch (e) {
                        // Try global or linked package
                        parsers = require('@watchapi/parsers');
                    }

                    const result = await parsers.detectAndParseRoutes('$projectPath');
                    console.log(JSON.stringify({
                        detected: result.detected,
                        routes: result.routes.map(r => ({
                            name: r.name,
                            path: r.path,
                            method: r.method,
                            type: r.type,
                            filePath: r.filePath
                        }))
                    }));
                } catch (e) {
                    console.log(JSON.stringify({ error: e.message }));
                }
            }

            detect();
        """.trimIndent()

        val process = ProcessBuilder("node", "-e", script)
            .directory(File(projectPath))
            .redirectErrorStream(true)
            .start()

        val output = BufferedReader(InputStreamReader(process.inputStream)).readText()
        val completed = process.waitFor(30, TimeUnit.SECONDS)

        if (!completed) {
            process.destroyForcibly()
            throw RuntimeException("Node.js process timed out")
        }

        if (process.exitValue() != 0) {
            throw RuntimeException("Node.js process failed: $output")
        }

        return parseNodeJsOutput(output)
    }

    /**
     * Parse the JSON output from Node.js
     */
    private fun parseNodeJsOutput(output: String): DetectionResult {
        // Simple JSON parsing (in production, use a proper JSON library)
        val jsonLine = output.lines().lastOrNull { it.trim().startsWith("{") } ?: return DetectionResult()

        // Check for error
        if (jsonLine.contains("\"error\"")) {
            val errorMatch = Regex("\"error\"\\s*:\\s*\"([^\"]+)\"").find(jsonLine)
            return DetectionResult(error = errorMatch?.groupValues?.get(1))
        }

        // Parse detected types (used for debugging if needed)
        // val nextApp = jsonLine.contains("\"nextApp\":true")
        // val nextPages = jsonLine.contains("\"nextPages\":true")
        // val trpc = jsonLine.contains("\"trpc\":true")
        // val nestjs = jsonLine.contains("\"nestjs\":true")

        // Count routes by type (simplified parsing)
        val routes = mutableListOf<Route>()
        val routePattern = Regex("\"type\"\\s*:\\s*\"([^\"]+)\"")
        val typeMatches = routePattern.findAll(jsonLine)

        var nextAppCount = 0
        var nextPagesCount = 0
        var trpcCount = 0
        var nestjsCount = 0

        typeMatches.forEach { match ->
            when (match.groupValues[1]) {
                "nextjs-app" -> nextAppCount++
                "nextjs-page" -> nextPagesCount++
                "trpc" -> trpcCount++
                "nestjs" -> nestjsCount++
            }
        }

        return DetectionResult(
            nextAppRoutes = nextAppCount,
            nextPagesRoutes = nextPagesCount,
            trpcRoutes = trpcCount,
            nestjsRoutes = nestjsCount,
            routes = routes
        )
    }

    /**
     * Simple file-based detection fallback
     */
    private fun detectSimple(projectPath: String): DetectionResult {
        val projectDir = File(projectPath)

        // Check package.json for dependencies
        val packageJson = File(projectDir, "package.json")
        val packageContent = if (packageJson.exists()) packageJson.readText() else ""

        val hasNext = packageContent.contains("\"next\"")
        val hasTrpc = packageContent.contains("\"@trpc/server\"")
        val hasNestjs = packageContent.contains("\"@nestjs/core\"") ||
                        packageContent.contains("\"@nestjs/common\"")

        // Simple route counting by file patterns
        var nextAppRoutes = 0
        var nextPagesRoutes = 0
        var trpcRoutes = 0
        var nestjsRoutes = 0

        if (hasNext) {
            // Count app router routes
            nextAppRoutes = countFiles(projectDir, "app/**/route.ts") +
                           countFiles(projectDir, "app/**/route.js") +
                           countFiles(projectDir, "src/app/**/route.ts") +
                           countFiles(projectDir, "src/app/**/route.js")

            // Count pages router routes
            nextPagesRoutes = countFiles(projectDir, "pages/api/**/*.ts") +
                             countFiles(projectDir, "pages/api/**/*.js") +
                             countFiles(projectDir, "src/pages/api/**/*.ts") +
                             countFiles(projectDir, "src/pages/api/**/*.js")
        }

        if (hasTrpc) {
            trpcRoutes = countFiles(projectDir, "**/*router*.ts") +
                        countFiles(projectDir, "**/*trpc*.ts")
        }

        if (hasNestjs) {
            nestjsRoutes = countFiles(projectDir, "**/*.controller.ts")
        }

        return DetectionResult(
            nextAppRoutes = nextAppRoutes,
            nextPagesRoutes = nextPagesRoutes,
            trpcRoutes = trpcRoutes,
            nestjsRoutes = nestjsRoutes
        )
    }

    /**
     * Count files matching a glob pattern
     */
    private fun countFiles(dir: File, pattern: String): Int {
        // Simplified glob matching
        val parts = pattern.split("/")
        return countFilesRecursive(dir, parts, 0)
    }

    private fun countFilesRecursive(dir: File, parts: List<String>, index: Int): Int {
        if (!dir.exists() || !dir.isDirectory) return 0
        if (index >= parts.size) return 0

        val part = parts[index]
        val isLast = index == parts.size - 1

        return when {
            part == "**" -> {
                var count = countFilesRecursive(dir, parts, index + 1)
                dir.listFiles()?.filter { it.isDirectory && !it.name.startsWith(".") && it.name != "node_modules" }?.forEach {
                    count += countFilesRecursive(it, parts, index)
                }
                count
            }
            part.contains("*") -> {
                val regex = part.replace(".", "\\.").replace("*", ".*").toRegex()
                dir.listFiles()?.sumOf { file ->
                    if (regex.matches(file.name)) {
                        if (isLast && file.isFile) 1
                        else if (!isLast && file.isDirectory) countFilesRecursive(file, parts, index + 1)
                        else 0
                    } else 0
                } ?: 0
            }
            else -> {
                val subDir = File(dir, part)
                if (isLast && subDir.isFile) 1
                else if (!isLast && subDir.isDirectory) countFilesRecursive(subDir, parts, index + 1)
                else 0
            }
        }
    }
}
