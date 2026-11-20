package dev.nativestep.basket.shared

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.materialIcon
import androidx.compose.material.icons.materialPath
import androidx.compose.ui.graphics.vector.ImageVector

/** Material's "remove" (minus), which material-icons-core lacks; the extended set is too large for one icon. */
val Icons.Filled.Minus: ImageVector by lazy {
    materialIcon(name = "Filled.Minus") {
        materialPath {
            moveTo(19f, 13f)
            horizontalLineTo(5f)
            verticalLineToRelative(-2f)
            horizontalLineToRelative(14f)
            verticalLineToRelative(2f)
            close()
        }
    }
}
