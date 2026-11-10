package __ANDROID_PACKAGE__.sample

import __ANDROID_PACKAGE__.sample.SampleViewModel.Action
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
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
