package __ANDROID_PACKAGE__

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import __ANDROID_PACKAGE__.ui.Root

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val app = application as __APP_NAME__Application
        setContent { MaterialTheme { Root(app.core) } }
    }
}
