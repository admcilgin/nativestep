import Core
import SwiftUI

struct AboutView: View {
    let vm: AboutViewModel

    var body: some View {
        List {
            Button("Show license") { vm.send(.openLicense) }
        }
        .navigationTitle("About")
    }
}

struct LicenseView: View {
    let vm: LicenseViewModel

    var body: some View {
        Text("MIT License")
            .padding()
            .navigationTitle("License")
    }
}
