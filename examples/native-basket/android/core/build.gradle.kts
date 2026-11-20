import org.jetbrains.kotlin.gradle.dsl.JvmTarget

// Pure JVM module: android.* and androidx.* cannot compile here (R1).
plugins {
    `java-library`
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

dependencies {
    api(libs.nativestep.kit.core)
}
