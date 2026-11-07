import AppKit
import ServiceManagement
import SwiftUI

@main
struct SeedwallBarApp: App {
    @StateObject private var service = WallpaperService()

    var body: some Scene {
        MenuBarExtra {
            PanelView()
                .environmentObject(service)
                .task { service.start() }
        } label: {
            Image(systemName: "leaf")
        }
        .menuBarExtraStyle(.window)
    }
}

struct PanelView: View {
    @EnvironmentObject var service: WallpaperService
    @State private var launchAtLogin = SMAppService.mainApp.status == .enabled
    @State private var seedText = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            header
            previewBox
            Picker("Source", selection: $service.mode) {
                ForEach(Mode.allCases) { Text($0.title).tag($0) }
            }
            .pickerStyle(.segmented)
            .labelsHidden()

            modeOptions

            HStack {
                Button { Task { await service.apply(force: true) } } label: { Label("Refresh", systemImage: "arrow.clockwise") }
                Button { service.shuffle() } label: { Label("Shuffle", systemImage: "shuffle") }
                if service.currentSeed != nil && service.mode != .pinned {
                    Button { service.pinCurrent() } label: { Label("Keep", systemImage: "pin") }
                        .help("Pin this seed so it stays")
                }
            }
            .disabled(service.busy)

            Divider()
            HStack {
                if let page = service.currentPage {
                    Button("Open on the web") { NSWorkspace.shared.open(page) }
                    Button("Copy link") {
                        NSPasteboard.general.clearContents()
                        NSPasteboard.general.setString(page.absoluteString, forType: .string)
                    }
                }
                Spacer()
            }
            .buttonStyle(.link)
            Toggle("Open at login", isOn: $launchAtLogin)
                .onChange(of: launchAtLogin) { on in
                    do {
                        if on { try SMAppService.mainApp.register() } else { try SMAppService.mainApp.unregister() }
                    } catch {
                        launchAtLogin = SMAppService.mainApp.status == .enabled
                    }
                }
            HStack {
                Text("A new wallpaper every day.").font(.caption).foregroundStyle(.secondary)
                Spacer()
                Button("Quit") { NSApp.terminate(nil) }
            }
        }
        .padding(14)
        .frame(width: 340)
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            Text("Seedwall").font(.headline)
            Spacer()
            if service.busy { ProgressView().controlSize(.small) }
            Text(service.status).font(.caption).foregroundStyle(.secondary).lineLimit(1)
        }
    }

    private var previewBox: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6).fill(Color.secondary.opacity(0.12))
            if let img = service.preview {
                Image(nsImage: img).resizable().aspectRatio(contentMode: .fill)
            } else {
                Image(systemName: "photo").font(.largeTitle).foregroundStyle(.secondary)
            }
        }
        .frame(height: 180)
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    @ViewBuilder private var modeOptions: some View {
        switch service.mode {
        case .daily:
            Text("Everyone gets the same seed today. It changes at midnight.")
                .font(.caption).foregroundStyle(.secondary)
        case .random:
            Text("A different random seed every day. Shuffle for another.")
                .font(.caption).foregroundStyle(.secondary)
        case .pinned:
            HStack {
                TextField("Seed, 1–999999", text: $seedText)
                    .textFieldStyle(.roundedBorder)
                    .onAppear { seedText = String(service.pinnedSeed) }
                    .onSubmit(applySeed)
                Button("Set", action: applySeed)
            }
        case .github:
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    TextField("GitHub username", text: $service.githubLogin)
                        .textFieldStyle(.roundedBorder)
                        .onSubmit { Task { await service.apply(force: true) } }
                    Button("Set") { Task { await service.apply(force: true) } }
                }
                Picker("Look", selection: $service.githubLook) {
                    ForEach(GitHubLook.all) { Text($0.title).tag($0.id) }
                }
                Picker("Theme", selection: $service.theme) {
                    ForEach(editorThemes, id: \.id) { Text($0.name).tag($0.id) }
                }
                Text("Redrawn from your public activity every day.").font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    private func applySeed() {
        guard let v = Int(seedText.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "#", with: "")), (1...999_999).contains(v) else { return }
        service.pinnedSeed = v
        Task { await service.apply(force: true) }
    }
}
