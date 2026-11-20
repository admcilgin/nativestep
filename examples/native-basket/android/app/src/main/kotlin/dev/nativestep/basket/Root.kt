package dev.nativestep.basket

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import dev.nativestep.basket.app.AppCore
import dev.nativestep.basket.auth.LoginScreen
import dev.nativestep.basket.basket.BasketNode
import dev.nativestep.basket.basket.BasketScreen
import dev.nativestep.basket.catalog.ProductDetailNode
import dev.nativestep.basket.catalog.ProductDetailScreen
import dev.nativestep.basket.catalog.ProductListNode
import dev.nativestep.basket.catalog.ProductListScreen
import dev.nativestep.kit.StackNavigator
import kotlinx.coroutines.flow.StateFlow

/** Draws the navigator state from Core (R14); keeps no navigation state of its own. */
@Composable
fun Root(cores: StateFlow<AppCore?>) {
    val core = cores.collectAsState().value ?: return
    val user by core.user.collectAsState()
    if (user == null) return LoginScreen(core.login.vm)
    val tabs by core.tabs.tabs.collectAsState()
    val selected by core.tabs.selected.collectAsState()
    Scaffold(
        bottomBar = {
            NavigationBar {
                tabs.forEach { (id, _) ->
                    NavigationBarItem(
                        selected = id == selected,
                        onClick = { core.tabs.select(id) },
                        icon = { Icon(if (id == "basket") Icons.Filled.ShoppingCart else Icons.Filled.Home, contentDescription = null) },
                        label = { Text(if (id == "basket") "Basket" else "Products") },
                    )
                }
            }
        },
    ) { padding ->
        Box(Modifier.padding(padding)) {
            when (val node = tabs.firstOrNull { it.first == selected }?.second) {
                is StackNavigator -> StackContent(node)
                is BasketNode -> BasketScreen(node.vm)
                else -> {}
            }
        }
    }
}

@Composable
fun StackContent(stack: StackNavigator) {
    val screens by stack.screens.collectAsState()
    BackHandler(enabled = screens.size > 1) { stack.goBack() }
    when (val top = screens.lastOrNull()) {
        is ProductListNode -> ProductListScreen(top.vm)
        is ProductDetailNode -> ProductDetailScreen(top.vm, onBack = stack::goBack)
        else -> {}
    }
}
