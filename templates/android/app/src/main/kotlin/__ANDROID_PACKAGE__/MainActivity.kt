package __ANDROID_PACKAGE__

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Dark status-bar icons on a light theme; the platform theme alone leaves them light.
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val app = application as __APP_NAME__Application
        // The Surface gives the screens the theme's background instead of the window's gray.
        setContent { MaterialTheme { Surface(Modifier.fillMaxSize()) { Root(app.core) } } }
    }
}
