package dev.nativestep.basket.basket

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.nativestep.basket.shared.Minus
import dev.nativestep.basket.shared.formatPrice

/** Lines with add one and remove one, the total and Place order. The order error comes with basket cp4. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BasketScreen(vm: BasketViewModel) {
    val state by vm.state.collectAsState()
    Column(Modifier.fillMaxSize()) {
        TopAppBar(title = { Text("Basket") }, windowInsets = WindowInsets(0))
        if (state.lines.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("Your basket is empty.") }
        } else {
            LazyColumn(Modifier.weight(1f)) {
                items(state.lines, key = { it.productId }) { line ->
                    ListItem(
                        headlineContent = { Text(line.name) },
                        supportingContent = { Text("${line.quantity} × ${formatPrice(line.priceCents)}") },
                        trailingContent = {
                            Row {
                                IconButton(onClick = { vm.send(BasketViewModel.Action.RemoveOne(line.productId)) }) {
                                    Icon(Icons.Filled.Minus, contentDescription = "Remove one")
                                }
                                IconButton(onClick = { vm.send(BasketViewModel.Action.AddOne(line.productId)) }) {
                                    Icon(Icons.Filled.Add, contentDescription = "Add one")
                                }
                            }
                        },
                    )
                }
            }
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Text("Total ${formatPrice(state.totalCents)}", style = MaterialTheme.typography.titleMedium)
                Button(
                    onClick = { vm.send(BasketViewModel.Action.PlaceOrder) },
                    enabled = !state.placing,
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                ) { Text("Place order") }
            }
        }
    }
}
