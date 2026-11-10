package __ANDROID_PACKAGE__.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.nativestep.kit.StackNavigator
import __ANDROID_PACKAGE__.about.AboutNode
import __ANDROID_PACKAGE__.about.AboutViewModel
import __ANDROID_PACKAGE__.about.LicenseNode
import __ANDROID_PACKAGE__.app.AppCore
import __ANDROID_PACKAGE__.sample.SampleDetailNode
import __ANDROID_PACKAGE__.sample.SampleDetailViewModel
import __ANDROID_PACKAGE__.sample.SampleNode
import __ANDROID_PACKAGE__.sample.SampleViewModel
import __ANDROID_PACKAGE__.sample.SampleViewModel.Action
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
    if (presented is LicenseNode) {
        AlertDialog(
            onDismissRequest = { core.modal.dismiss() },
            confirmButton = { TextButton(onClick = { core.modal.dismiss() }) { Text("Close") } },
            title = { Text("License") },
            text = { Text("MIT License") },
        )
    }
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

/** Reads state and calls send, nothing else (R9). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SampleScreen(vm: SampleViewModel) {
    val state by vm.state.collectAsState()
    Scaffold(topBar = { TopAppBar(title = { Text("Sample") }) }) { padding ->
        Column(Modifier.padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                OutlinedButton(onClick = { vm.send(Action.Decrement) }) { Text("−") }
                Text("${state.count}", style = MaterialTheme.typography.headlineMedium)
                OutlinedButton(onClick = { vm.send(Action.Increment) }) { Text("+") }
            }
            Button(onClick = { vm.send(Action.Load) }, enabled = !state.loading) {
                Text(if (state.loading) "Loading…" else "Load items")
            }
            state.error?.let { Text("Error: ${it.message ?: it.code}", color = MaterialTheme.colorScheme.error) }
            LazyColumn {
                items(state.items, key = { it.id }) { item ->
                    ListItem(
                        headlineContent = { Text(item.title) },
                        modifier = Modifier.clickable { vm.send(Action.OpenDetail(item.id)) },
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SampleDetailScreen(vm: SampleDetailViewModel, stack: StackNavigator) {
    val state by vm.state.collectAsState()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Item ${state.id}") },
                navigationIcon = { TextButton(onClick = { stack.goBack() }) { Text("Back") } },
            )
        },
    ) { padding ->
        Text("Item ${state.id}", Modifier.padding(padding).padding(16.dp), style = MaterialTheme.typography.headlineSmall)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AboutScreen(vm: AboutViewModel) {
    Scaffold(topBar = { TopAppBar(title = { Text("About") }) }) { padding ->
        Button(onClick = { vm.send(AboutViewModel.Action.OpenLicense) }, Modifier.padding(padding).padding(16.dp)) {
            Text("Show license")
        }
    }
}
