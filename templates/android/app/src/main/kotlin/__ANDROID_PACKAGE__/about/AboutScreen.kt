package __ANDROID_PACKAGE__.about

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AboutScreen(vm: AboutViewModel) {
    Scaffold(topBar = { TopAppBar(title = { Text("About") }) }) { padding ->
        Button(onClick = { vm.send(AboutViewModel.Action.OpenLicense) }, Modifier.padding(padding).padding(16.dp)) {
            Text("Show license")
        }
    }
}

/** Presented by the modal navigator; closing it calls `dismiss`. */
@Composable
fun LicenseDialog(vm: LicenseViewModel, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } },
        title = { Text("License") },
        text = { Text("MIT License") },
    )
}
