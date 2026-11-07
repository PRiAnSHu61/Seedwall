// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "SeedwallBar",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(name: "SeedwallBar", path: "Sources/SeedwallBar")
    ]
)
