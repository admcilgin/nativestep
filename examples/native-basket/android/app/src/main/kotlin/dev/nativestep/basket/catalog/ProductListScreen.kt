package dev.nativestep.basket.catalog

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ListItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import dev.nativestep.basket.shared.errorMessage
import dev.nativestep.basket.shared.formatPrice

@Composable
fun ProductListScreen(vm: ProductListViewModel) {
    val state by vm.state.collectAsState()
    val error = state.error
    when {
        state.loading && state.products.isEmpty() ->
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(errorMessage(error)) }
        state.products.isEmpty() -> Text("No products yet.")
        else -> LazyColumn {
            items(state.products, key = { it.id }) { product ->
                ListItem(headlineContent = { Text(product.name) }, supportingContent = { Text(formatPrice(product.priceCents)) })
            }
        }
    }
}
