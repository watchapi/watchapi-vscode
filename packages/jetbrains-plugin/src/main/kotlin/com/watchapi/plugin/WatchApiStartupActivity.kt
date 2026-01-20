package com.watchapi.plugin

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectActivity

/**
 * Startup activity that runs when a project is opened
 */
class WatchApiStartupActivity : ProjectActivity {

    private val logger = Logger.getInstance(WatchApiStartupActivity::class.java)

    override suspend fun execute(project: Project) {
        logger.info("WatchAPI plugin initialized for project: ${project.name}")
        logger.info("Use Tools -> WatchAPI -> Detect API Routes to scan for routes")
    }
}
