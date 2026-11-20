package dev.nativestep.basket.catalog

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.nativestep.basket.shared.errorMessage
import dev.nativestep.basket.shared.formatPrice

/** [onBack] is the stack's lent goBack (R14); the screen keeps no navigation state. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailScreen(vm: ProductDetailViewModel, onBack: () -> Unit) {
    val state by vm.state.collectAsState()
    val product = state.product
    val error = state.error
    Column {
        TopAppBar(
            title = { Text(product?.name ?: "") },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") } },
            windowInsets = WindowInsets(0),
        )
        when {
            product != null -> Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(formatPrice(product.priceCents), style = MaterialTheme.typography.headlineSmall)
                Text(product.description)
                Button(
                    onClick = { vm.send(ProductDetailViewModel.Action.AddToBasket) },
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                ) {
                    Icon(Icons.Filled.ShoppingCart, contentDescription = null)
                    Text("Add to basket", Modifier.padding(start = 8.dp))
                }
            }
            error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(errorMessage(error)) }
            else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
    }
}
