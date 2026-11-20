package dev.nativestep.basket

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color

/** The reference's `ThemeData(colorSchemeSeed: Colors.teal)`, light scheme. */
private val BasketColors = lightColorScheme(
    primary = Color(0xFF006A60),
    onPrimary = Color.White,
    secondaryContainer = Color(0xFFCCE8E2),
    background = Color(0xFFF4FBF8),
    surface = Color(0xFFF4FBF8),
    surfaceContainer = Color(0xFFE9EFEC),
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val app = application as BasketApplication
        setContent { MaterialTheme(colorScheme = BasketColors) { Surface(Modifier.fillMaxSize()) { Root(app.core) } } }
    }
}
