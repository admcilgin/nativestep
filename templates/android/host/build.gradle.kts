import org.jetbrains.kotlin.gradle.dsl.JvmTarget

// Fixture services and the headless host. The debug app links it too (debugImplementation, R20).
plugins {
    `java-library`
    application
    alias(libs.plugins.kotlin.jvm)
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

application {
    mainClass.set("__ANDROID_PACKAGE__.host.MainKt")
    applicationName = "host"
}

dependencies {
    api(project(":core"))
    api(libs.nativestep.kit.host)
}
