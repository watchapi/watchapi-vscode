package com.watchapi.plugin.actions

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.progress.Task
import com.intellij.openapi.ui.Messages
import com.watchapi.plugin.services.RouteDetectionService

/**
 * Action to detect API routes in the current project
 */
class DetectRoutesAction : AnAction() {

    private val logger = Logger.getInstance(DetectRoutesAction::class.java)

    override fun actionPerformed(event: AnActionEvent) {
        val project = event.project
        if (project == null) {
            Messages.showErrorDialog("No project is open", "WatchAPI")
            return
        }

        logger.info("DetectRoutesAction triggered for project: ${project.name}")

        ProgressManager.getInstance().run(object : Task.Backgroundable(
            project,
            "Detecting API Routes...",
            true
        ) {
            override fun run(indicator: ProgressIndicator) {
                try {
                    indicator.isIndeterminate = true
                    indicator.text = "Scanning project for API routes..."

                    logger.info("Starting route detection...")
                    val service = project.getService(RouteDetectionService::class.java)
                    val result = service.detectRoutes()
                    logger.info("Detection complete: ${result.totalRoutes} routes found, error: ${result.error}")

                    ApplicationManager.getApplication().invokeLater {
                        showResultDialog(result)
                    }
                } catch (e: Exception) {
                    logger.error("Error during route detection", e)
                    ApplicationManager.getApplication().invokeLater {
                        Messages.showErrorDialog(
                            "Error detecting routes: ${e.message}",
                            "WatchAPI Error"
                        )
                    }
                }
            }

            private fun showResultDialog(result: RouteDetectionService.DetectionResult) {
                if (result.error != null) {
                    Messages.showWarningDialog(
                        "Detection error: ${result.error}",
                        "WatchAPI"
                    )
                    return
                }

                if (result.hasAnyRoutes()) {
                    val message = buildString {
                        append("Found ${result.totalRoutes} API routes:\n\n")
                        if (result.nextAppRoutes > 0) append("• Next.js App Router: ${result.nextAppRoutes}\n")
                        if (result.nextPagesRoutes > 0) append("• Next.js Pages Router: ${result.nextPagesRoutes}\n")
                        if (result.trpcRoutes > 0) append("• tRPC: ${result.trpcRoutes}\n")
                        if (result.nestjsRoutes > 0) append("• NestJS: ${result.nestjsRoutes}\n")
                    }
                    Messages.showInfoMessage(message, "WatchAPI - Routes Detected")
                } else {
                    Messages.showInfoMessage(
                        "No API routes found.\n\nSupported frameworks:\n• Next.js (App Router & Pages Router)\n• tRPC\n• NestJS",
                        "WatchAPI"
                    )
                }
            }
        })
    }

    override fun update(event: AnActionEvent) {
        event.presentation.isEnabledAndVisible = event.project != null
    }

    override fun getActionUpdateThread(): ActionUpdateThread {
        return ActionUpdateThread.BGT
    }
}
