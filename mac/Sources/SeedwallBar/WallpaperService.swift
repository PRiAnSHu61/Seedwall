import AppKit
import Foundation

/// Where wallpapers come from. Raw values are stored in UserDefaults.
enum Mode: String, CaseIterable, Identifiable {
    case daily      // today's seed — the same one everyone gets
    case random     // a new random seed every day
    case pinned     // one seed, always
    case github     // the user's own GitHub graph, refreshed daily

    var id: String { rawValue }
    var title: String {
        switch self {
        case .daily: return "Today's seed"
        case .random: return "Random"
        case .pinned: return "Pinned seed"
        case .github: return "My GitHub"
        }
    }
}

struct GitHubLook: Identifiable, Hashable {
    let id: String
    let title: String
    static let all = [
        GitHubLook(id: "grid", title: "Contribution grid"),
        GitHubLook(id: "skyline", title: "Skyline"),
        GitHubLook(id: "dots", title: "Dots"),
        GitHubLook(id: "light", title: "Grid · light"),
        GitHubLook(id: "history", title: "Commit history"),
        GitHubLook(id: "history-paper", title: "History · paper"),
    ]
}

let editorThemes: [(id: String, name: String)] = [
    ("", "Original"), ("dracula", "Dracula"), ("nord", "Nord"), ("tokyo-night", "Tokyo Night"),
    ("gruvbox", "Gruvbox"), ("catppuccin", "Catppuccin Mocha"), ("one-dark", "One Dark"),
    ("rose-pine", "Rosé Pine"), ("solarized", "Solarized Dark"), ("github-light", "GitHub Light"),
]

/// Fetches wallpapers from the Seedwall image API and sets them on every screen.
@MainActor
final class WallpaperService: ObservableObject {
    // Settings (persisted)
    @Published var mode: Mode { didSet { defaults.set(mode.rawValue, forKey: "mode"); applySoon() } }
    @Published var pinnedSeed: Int { didSet { defaults.set(pinnedSeed, forKey: "pinnedSeed") } }
    @Published var githubLogin: String { didSet { defaults.set(githubLogin, forKey: "githubLogin") } }
    @Published var githubLook: String { didSet { defaults.set(githubLook, forKey: "githubLook"); if mode == .github { applySoon() } } }
    @Published var theme: String { didSet { defaults.set(theme, forKey: "theme"); if mode == .github { applySoon() } } }

    // State
    @Published private(set) var currentSeed: Int?
    @Published private(set) var currentPage: URL?
    @Published private(set) var preview: NSImage?
    @Published private(set) var status = "Ready"
    @Published private(set) var busy = false

    let baseURL: URL
    private let defaults = UserDefaults.standard
    private var lastAppliedDay: String? {
        get { defaults.string(forKey: "lastAppliedDay") }
        set { defaults.set(newValue, forKey: "lastAppliedDay") }
    }
    private var lastKey: String? {
        get { defaults.string(forKey: "lastKey") }
        set { defaults.set(newValue, forKey: "lastKey") }
    }
    private var timer: Timer?
    private var pending: Task<Void, Never>?

    init() {
        let d = UserDefaults.standard
        // `defaults write work.suryansh.seedwallbar baseURL http://localhost:3000` for local development.
        baseURL = URL(string: d.string(forKey: "baseURL") ?? "https://seedwall.suryansh.work")!
        mode = Mode(rawValue: d.string(forKey: "mode") ?? "") ?? .daily
        pinnedSeed = d.object(forKey: "pinnedSeed") as? Int ?? 48213
        githubLogin = d.string(forKey: "githubLogin") ?? ""
        githubLook = d.string(forKey: "githubLook") ?? "grid"
        theme = d.string(forKey: "theme") ?? ""
        if let s = d.object(forKey: "currentSeed") as? Int { currentSeed = s }
    }

    /// Starts the daily schedule: check every 10 minutes, on wake, and when displays change.
    func start() {
        let nc = NSWorkspace.shared.notificationCenter
        nc.addObserver(forName: NSWorkspace.didWakeNotification, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.tick() }
        }
        NotificationCenter.default.addObserver(forName: NSApplication.didChangeScreenParametersNotification, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.applySoon(force: true) }
        }
        timer = Timer.scheduledTimer(withTimeInterval: 600, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.tick() }
        }
        tick()
    }

    /// Applies once per local day (or immediately if never applied).
    func tick() {
        if lastAppliedDay != Self.today() { Task { await apply() } }
    }

    /// Debounced apply after a settings change.
    func applySoon(force: Bool = true) {
        pending?.cancel()
        pending = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 400_000_000)
            guard !Task.isCancelled else { return }
            await self?.apply(force: force)
        }
    }

    func shuffle() {
        mode = .random   // triggers applySoon
        lastKey = nil
    }

    func pinCurrent() {
        guard let s = currentSeed else { return }
        pinnedSeed = s
        mode = .pinned
    }

    func apply(force: Bool = false) async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        let day = Self.today()
        do {
            var seed: Int?
            var page: URL?
            switch mode {
            case .daily:
                let info = try await fetchDaily(date: day)
                seed = info.seed
                page = URL(string: info.page)
            case .random:
                // Keep today's random seed stable across wakes; re-roll on a new day or on Shuffle.
                if !force, lastAppliedDay == day, let s = currentSeed, lastKey?.hasPrefix("random:") == true { seed = s }
                else { seed = Int.random(in: 1...999_999) }
                page = baseURL.appendingPathComponent("s/\(seed!)")
            case .pinned:
                seed = max(1, min(999_999, pinnedSeed))
                page = baseURL.appendingPathComponent("s/\(seed!)")
            case .github:
                let login = githubLogin.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "@", with: "")
                guard !login.isEmpty else { status = "Add your GitHub username first"; return }
                var c = URLComponents(url: baseURL.appendingPathComponent("u/\(login)"), resolvingAgainstBaseURL: false)!
                c.queryItems = queryItems(look: githubLook, theme: theme)
                page = c.url
            }

            let key = "\(mode.rawValue):\(seed.map(String.init) ?? githubLogin):\(githubLook):\(theme):\(day)"
            if !force, key == lastKey, lastAppliedDay == day { return }

            status = "Downloading…"
            var first: NSImage?
            for screen in NSScreen.screens {
                let px = Self.pixelSize(of: screen)
                let url = imageURL(seed: seed, size: px)
                let file = try await download(url, name: "\(mode.rawValue)-\(seed.map(String.init) ?? "gh")-\(Int(px.width))x\(Int(px.height))-\(day)")
                try NSWorkspace.shared.setDesktopImageURL(file, for: screen, options: [
                    .imageScaling: NSImageScaling.scaleProportionallyUpOrDown.rawValue,
                    .allowClipping: true,
                ])
                if first == nil { first = NSImage(contentsOf: file) }
            }

            currentSeed = seed
            defaults.set(seed, forKey: "currentSeed")
            currentPage = page
            preview = first
            lastAppliedDay = day
            lastKey = key
            status = seed.map { "Seed #\($0) · set \(Self.timeString())" } ?? "@\(githubLogin) · set \(Self.timeString())"
            cleanup()
        } catch {
            status = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    // MARK: - Network

    private struct DailyInfo: Decodable { let seed: Int; let page: String }

    private func fetchDaily(date: String) async throws -> DailyInfo {
        var c = URLComponents(url: baseURL.appendingPathComponent("api/daily"), resolvingAgainstBaseURL: false)!
        c.queryItems = [URLQueryItem(name: "format", value: "json"), URLQueryItem(name: "date", value: date)]
        let (data, res) = try await URLSession.shared.data(from: c.url!)
        try Self.check(res)
        return try JSONDecoder().decode(DailyInfo.self, from: data)
    }

    private func imageURL(seed: Int?, size: CGSize) -> URL {
        let wh = [URLQueryItem(name: "w", value: String(Int(size.width))), URLQueryItem(name: "h", value: String(Int(size.height)))]
        if let seed {
            var c = URLComponents(url: baseURL.appendingPathComponent("api/s/\(seed)"), resolvingAgainstBaseURL: false)!
            c.queryItems = wh
            return c.url!
        }
        var c = URLComponents(url: baseURL.appendingPathComponent("api/u/\(githubLogin.replacingOccurrences(of: "@", with: ""))"), resolvingAgainstBaseURL: false)!
        c.queryItems = wh + queryItems(look: githubLook, theme: theme)
        return c.url!
    }

    private func queryItems(look: String, theme: String) -> [URLQueryItem] {
        var q = [URLQueryItem]()
        if look != "grid" { q.append(URLQueryItem(name: "look", value: look)) }
        if !theme.isEmpty { q.append(URLQueryItem(name: "theme", value: theme)) }
        return q
    }

    /// Downloads to a unique file — macOS caches wallpapers by path, so reusing one wouldn't refresh.
    private func download(_ url: URL, name: String) async throws -> URL {
        let (tmp, res) = try await URLSession.shared.download(from: url)
        try Self.check(res)
        let dest = Self.folder.appendingPathComponent("\(name).png")
        try? FileManager.default.removeItem(at: dest)
        try FileManager.default.moveItem(at: tmp, to: dest)
        return dest
    }

    /// Keeps the files the screens currently use and the few before, deletes the rest.
    private func cleanup() {
        let fm = FileManager.default
        guard let files = try? fm.contentsOfDirectory(at: Self.folder, includingPropertiesForKeys: [.contentModificationDateKey]) else { return }
        let sorted = files.sorted {
            let a = (try? $0.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
            let b = (try? $1.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
            return a > b
        }
        for f in sorted.dropFirst(max(6, NSScreen.screens.count * 3)) { try? fm.removeItem(at: f) }
    }

    private static func check(_ res: URLResponse) throws {
        guard let http = res as? HTTPURLResponse else { return }
        switch http.statusCode {
        case 200..<300: return
        case 404: throw ServiceError("Not found: check the GitHub username or seed")
        case 429: throw ServiceError("GitHub is busy, will retry later")
        default: throw ServiceError("Seedwall returned \(http.statusCode)")
        }
    }

    // MARK: - Helpers

    static let folder: URL = {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let dir = base.appendingPathComponent("SeedwallBar", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }()

    /// Native pixels for a screen (points × backing scale).
    static func pixelSize(of screen: NSScreen) -> CGSize {
        let s = screen.backingScaleFactor
        return CGSize(width: (screen.frame.width * s).rounded(), height: (screen.frame.height * s).rounded())
    }

    /// The local calendar date, so the wallpaper changes at the user's midnight.
    static func today() -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }

    static func timeString() -> String {
        let f = DateFormatter()
        f.timeStyle = .short
        return f.string(from: Date())
    }
}

struct ServiceError: LocalizedError {
    let message: String
    init(_ message: String) { self.message = message }
    var errorDescription: String? { message }
}
