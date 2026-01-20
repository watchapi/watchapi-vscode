package com.watchapi.plugin.actions

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.wm.ToolWindowManager
import com.watchapi.plugin.toolwindow.WatchApiToolWindowFactory

/**
 * Action to refresh the routes in the tool window
 */
class RefreshRoutesAction : AnAction() {

    override fun actionPerformed(event: AnActionEvent) {
        val project = event.project ?: return

        // Trigger the detect routes action
        DetectRoutesAction().actionPerformed(event)

        // Refresh the tool window if open
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("WatchAPI")
        toolWindow?.contentManager?.getContent(0)?.let { content ->
            (content.component as? WatchApiToolWindowFactory.WatchApiPanel)?.refresh()
        }
    }

    override fun update(event: AnActionEvent) {
        event.presentation.isEnabledAndVisible = event.project != null
    }

    override fun getActionUpdateThread(): ActionUpdateThread {
        return ActionUpdateThread.BGT
    }
}
