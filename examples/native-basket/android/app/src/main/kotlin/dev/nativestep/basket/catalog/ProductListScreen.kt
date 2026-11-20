package dev.nativestep.basket.catalog

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ListItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.nativestep.basket.shared.errorMessage
import dev.nativestep.basket.shared.formatPrice

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductListScreen(vm: ProductListViewModel) {
    val state by vm.state.collectAsState()
    val error = state.error
    // The outer Scaffold already pads for the status bar.
    Column {
        TopAppBar(
            title = { Text("Products") },
            actions = {
                IconButton(onClick = { vm.send(ProductListViewModel.Action.SignOut) }) {
                    Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = "Sign out")
                }
            },
            windowInsets = WindowInsets(0),
        )
        when {
            vm.listShown -> PullToRefreshBox(
                isRefreshing = state.loading,
                onRefresh = { vm.send(ProductListViewModel.Action.Refresh) },
                modifier = Modifier.fillMaxSize(),
            ) {
                LazyColumn(Modifier.fillMaxSize()) {
                    if (state.products.isEmpty()) item { Text("No products yet.", Modifier.padding(24.dp)) }
                    items(state.products, key = { it.id }) { product ->
                        ListItem(
                            headlineContent = { Text(product.name) },
                            supportingContent = { Text(formatPrice(product.priceCents)) },
                            trailingContent = { Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null) },
                            modifier = Modifier.clickable { vm.send(ProductListViewModel.Action.OpenProduct(product.id)) },
                        )
                    }
                }
            }
            error != null && !state.loading -> Column(
                Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(errorMessage(error))
                OutlinedButton(onClick = { vm.send(ProductListViewModel.Action.Retry) }) { Text("Retry") }
            }
            else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
    }
}
