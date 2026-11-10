// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "NativeStepKit",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "NativeStepKit", targets: ["NativeStepKit"]),
        .library(name: "NativeStepHostKit", targets: ["NativeStepHostKit"]),
    ],
    targets: [
        .target(name: "NativeStepKit"),
        .target(name: "NativeStepHostKit", dependencies: ["NativeStepKit"]),
    ]
)
