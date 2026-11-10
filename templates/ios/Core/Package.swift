// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Core",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "Core", targets: ["Core"]),
        // Fixture services; the headless host and the debug app use them (R20: only #if DEBUG code calls them).
        .library(name: "CoreHost", targets: ["CoreHost"]),
        .executable(name: "nativestep-host", targets: ["NativeStepHost"]),
    ],
    dependencies: [
        .package(path: "../../kits/ios"),
    ],
    targets: [
        .target(
            name: "Core",
            dependencies: [.product(name: "NativeStepKit", package: "ios")],
            path: "Sources"
        ),
        .target(
            name: "CoreHost",
            dependencies: ["Core", .product(name: "NativeStepHostKit", package: "ios")],
            path: "Host"
        ),
        .executableTarget(
            name: "NativeStepHost",
            dependencies: ["CoreHost", .product(name: "NativeStepHostKit", package: "ios")],
            path: "HostMain"
        ),
    ]
)
