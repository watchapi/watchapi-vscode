package com.watchapi.plugin.toolwindow

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.content.ContentFactory
import com.intellij.util.ui.JBUI
import com.watchapi.plugin.services.RouteDetectionService
import java.awt.BorderLayout
import java.awt.Component
import java.awt.FlowLayout
import javax.swing.*

/**
 * Factory for creating the WatchAPI tool window
 */
class WatchApiToolWindowFactory : ToolWindowFactory {

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val panel = WatchApiPanel(project)
        val content = ContentFactory.getInstance().createContent(panel, "", false)
        toolWindow.contentManager.addContent(content)
    }

    /**
     * Main panel for the WatchAPI tool window
     */
    class WatchApiPanel(private val project: Project) : JPanel(BorderLayout()) {

        private val routeListModel = DefaultListModel<RouteItem>()
        private val routeList = JList(routeListModel)
        private val statusLabel = JBLabel("Click 'Detect Routes' to scan your project")
        private val countLabel = JBLabel("")

        init {
            setupUI()
        }

        private fun setupUI() {
            border = JBUI.Borders.empty(8)

            // Header panel
            val headerPanel = JPanel(BorderLayout()).apply {
                border = JBUI.Borders.emptyBottom(8)

                val titleLabel = JBLabel("API Routes").apply {
                    font = font.deriveFont(font.size + 2f)
                }
                add(titleLabel, BorderLayout.WEST)
                add(countLabel, BorderLayout.EAST)
            }
            add(headerPanel, BorderLayout.NORTH)

            // Route list
            routeList.apply {
                cellRenderer = RouteListCellRenderer()
                selectionMode = ListSelectionModel.SINGLE_SELECTION
                border = JBUI.Borders.empty(4)
            }

            val scrollPane = JBScrollPane(routeList).apply {
                border = JBUI.Borders.customLine(JBUI.CurrentTheme.CustomFrameDecorations.separatorForeground(), 1)
            }
            add(scrollPane, BorderLayout.CENTER)

            // Footer panel with buttons
            val footerPanel = JPanel(FlowLayout(FlowLayout.LEFT)).apply {
                border = JBUI.Borders.emptyTop(8)

                val detectButton = JButton("Detect Routes").apply {
                    addActionListener { refresh() }
                }
                add(detectButton)

                val clearButton = JButton("Clear").apply {
                    addActionListener {
                        routeListModel.clear()
                        countLabel.text = ""
                        statusLabel.text = "Click 'Detect Routes' to scan your project"
                    }
                }
                add(clearButton)
            }
            add(footerPanel, BorderLayout.SOUTH)
        }

        /**
         * Refresh the route list
         */
        fun refresh() {
            statusLabel.text = "Detecting routes..."
            countLabel.text = ""
            routeListModel.clear()

            // Run detection in background
            SwingWorker.execute {
                val service = project.getService(RouteDetectionService::class.java)
                val result = service.detectRoutes()

                SwingUtilities.invokeLater {
                    if (result.error != null) {
                        statusLabel.text = "Error: ${result.error}"
                    } else if (result.hasAnyRoutes()) {
                        // Add route categories
                        if (result.nextAppRoutes > 0) {
                            routeListModel.addElement(RouteItem("Next.js App Router", "${result.nextAppRoutes} routes", true))
                        }
                        if (result.nextPagesRoutes > 0) {
                            routeListModel.addElement(RouteItem("Next.js Pages Router", "${result.nextPagesRoutes} routes", true))
                        }
                        if (result.trpcRoutes > 0) {
                            routeListModel.addElement(RouteItem("tRPC", "${result.trpcRoutes} procedures", true))
                        }
                        if (result.nestjsRoutes > 0) {
                            routeListModel.addElement(RouteItem("NestJS", "${result.nestjsRoutes} routes", true))
                        }

                        countLabel.text = "${result.totalRoutes} total"
                        statusLabel.text = ""
                    } else {
                        statusLabel.text = "No routes found"
                    }
                }
            }
        }
    }

    /**
     * Data class for route items in the list
     */
    data class RouteItem(
        val name: String,
        val detail: String,
        val isCategory: Boolean = false
    )

    /**
     * Custom cell renderer for route list
     */
    class RouteListCellRenderer : ListCellRenderer<RouteItem> {
        private val panel = JPanel(BorderLayout())
        private val nameLabel = JBLabel()
        private val detailLabel = JBLabel()

        init {
            panel.border = JBUI.Borders.empty(4, 8)
            panel.add(nameLabel, BorderLayout.WEST)
            panel.add(detailLabel, BorderLayout.EAST)
        }

        override fun getListCellRendererComponent(
            list: JList<out RouteItem>,
            value: RouteItem,
            index: Int,
            isSelected: Boolean,
            cellHasFocus: Boolean
        ): Component {
            nameLabel.text = if (value.isCategory) "▸ ${value.name}" else "  ${value.name}"
            nameLabel.font = if (value.isCategory) {
                nameLabel.font.deriveFont(java.awt.Font.BOLD)
            } else {
                nameLabel.font.deriveFont(java.awt.Font.PLAIN)
            }

            detailLabel.text = value.detail
            detailLabel.foreground = if (isSelected) {
                list.selectionForeground
            } else {
                JBUI.CurrentTheme.Label.disabledForeground()
            }

            panel.background = if (isSelected) list.selectionBackground else list.background
            nameLabel.foreground = if (isSelected) list.selectionForeground else list.foreground

            return panel
        }
    }
}

/**
 * Simple SwingWorker utility
 */
object SwingWorker {
    fun execute(task: () -> Unit) {
        Thread {
            try {
                task()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()
    }
}
