package __ANDROID_PACKAGE__

import __ANDROID_PACKAGE__.about.AboutNode
import __ANDROID_PACKAGE__.about.AboutScreen
import __ANDROID_PACKAGE__.about.LicenseDialog
import __ANDROID_PACKAGE__.about.LicenseNode
import __ANDROID_PACKAGE__.app.AppCore
import __ANDROID_PACKAGE__.sample.SampleDetailNode
import __ANDROID_PACKAGE__.sample.SampleDetailScreen
import __ANDROID_PACKAGE__.sample.SampleNode
import __ANDROID_PACKAGE__.sample.SampleScreen
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import dev.nativestep.kit.StackNavigator
import kotlinx.coroutines.flow.StateFlow

/** Draws the navigator state from Core (R14); keeps no navigation state of its own. */
@Composable
fun Root(cores: StateFlow<AppCore?>) {
    val core = cores.collectAsState().value ?: return
    val tabs by core.tabs.tabs.collectAsState()
    val selected by core.tabs.selected.collectAsState()
    val presented by core.modal.presented.collectAsState()
    Scaffold(
        bottomBar = {
            NavigationBar {
                tabs.forEach { (id, _) ->
                    NavigationBarItem(
                        selected = id == selected,
                        onClick = { core.tabs.select(id) },
                        icon = {},
                        label = { Text(if (id == "about") "About" else "Sample") },
                    )
                }
            }
        },
    ) { padding ->
        Box(Modifier.padding(padding)) {
            when (val node = tabs.firstOrNull { it.first == selected }?.second) {
                is StackNavigator -> StackContent(node)
                is AboutNode -> AboutScreen(node.vm)
                else -> {}
            }
        }
    }
    (presented as? LicenseNode)?.let { LicenseDialog(it.vm, onDismiss = { core.modal.dismiss() }) }
}

@Composable
fun StackContent(stack: StackNavigator) {
    val screens by stack.screens.collectAsState()
    BackHandler(enabled = screens.size > 1) { stack.goBack() }
    when (val top = screens.lastOrNull()) {
        is SampleNode -> SampleScreen(top.vm)
        is SampleDetailNode -> SampleDetailScreen(top.vm, stack)
        else -> {}
    }
}
