import Foundation
import TetrioMobileCore

/// Swift wrapper around the UniFFI-generated EngineSession
/// Provides Swift-native API with proper memory management
@MainActor
public final class TetrioEngine: ObservableObject {
    private let session: EngineSession
    private var gameLoopTask: Task<Void, Never>?
    private var lastFrameTime: UInt64 = 0

    @Published public private(set) var snapshot: SnapshotContract?
    @Published public private(set) var isGameOver: Bool = false
    @Published public private(set) var score: UInt64 = 0
    @Published public private(set) var lines: UInt32 = 0

    public init() throws {
        // Create initial snapshot matching Rust's initial_snapshot()
        let initialSnapshot = Self.createInitialSnapshot()
        self.session = EngineSession(initial: initialSnapshot)
        self.snapshot = initialSnapshot
        self.updatePublishedProperties(from: initialSnapshot)
    }

    deinit {
        gameLoopTask?.cancel()
        // session is freed automatically via deinit
    }

    /// Start the game loop at ~60fps
    public func start() {
        guard gameLoopTask == nil else { return }
        lastFrameTime = DispatchTime.now().uptimeNanoseconds

        gameLoopTask = Task { [weak self] in
            await self?.gameLoop()
        }
    }

    /// Stop the game loop
    public func stop() {
        gameLoopTask?.cancel()
        gameLoopTask = nil
    }

    private func gameLoop() async {
        while !Task.isCancelled {
            let now = DispatchTime.now().uptimeNanoseconds
            let deltaMs = UInt32((now - lastFrameTime) / 1_000_000) // Convert to ms
            lastFrameTime = now

            // Cap delta to prevent huge jumps
            let cappedDelta = min(deltaMs, 100)

            let tickCommand = EngineCommand.tick(deltaMs: cappedDelta)
            let result = session.applyCommand(command: tickCommand)

            await MainActor.run {
                self.snapshot = result.snapshot
                self.updatePublishedProperties(from: result.snapshot)
                self.isGameOver = result.snapshot.gameOver
            }

            if result.snapshot.gameOver {
                break
            }

            // Target ~60fps (16.67ms per frame)
            try? await Task.sleep(nanoseconds: 16_666_667)
        }
    }

    // MARK: - Input Commands

    public func moveLeft() {
        let command = EngineCommand.moveLeft
        let result = session.applyCommand(command: command)
        updateFromResult(result)
    }

    public func moveRight() {
        let command = EngineCommand.moveRight
        let result = session.applyCommand(command: command)
        updateFromResult(result)
    }

    public func softDrop() {
        let command = EngineCommand.softDrop
        let result = session.applyCommand(command: command)
        updateFromResult(result)
    }

    public func hardDrop() {
        let command = EngineCommand.hardDrop
        let result = session.applyCommand(command: command)
        updateFromResult(result)
    }

    public func rotateCW() {
        let command = EngineCommand.rotateCw
        let result = session.applyCommand(command: command)
        updateFromResult(result)
    }

    public func rotateCCW() {
        let command = EngineCommand.rotateCcw
        let result = session.applyCommand(command: command)
        updateFromResult(result)
    }

    public func rotate180() {
        let command = EngineCommand.rotate180
        let result = session.applyCommand(command: command)
        updateFromResult(result)
    }

    public func hold() {
        let command = EngineCommand.hold
        let result = session.applyCommand(command: command)
        updateFromResult(result)
    }

    private func updateFromResult(_ result: EngineResult) {
        self.snapshot = result.snapshot
        self.updatePublishedProperties(from: result.snapshot)
        self.isGameOver = result.snapshot.gameOver
    }

    private func updatePublishedProperties(from snapshot: SnapshotContract) {
        self.score = snapshot.score
        self.lines = snapshot.lines
    }

    // MARK: - Initial Snapshot Creation

    private static func createInitialSnapshot() -> SnapshotContract {
        // This mirrors the Rust initial_snapshot() function
        // 7-bag randomizer with seed 424242 - bag order computed by Rust
        let board = BoardState(width: 10, height: 40)
        // Initial bag for seed 424242 (matches Rust's 7-bag shuffle)
        let initialBag: [PieceType] = [.t, .i, .o, .l, .j, .s, .z]
        let randomizer = RandomizerState(bag: initialBag, index: 0, seed: 424242)

        // First piece is T (index 0 in bag)
        let firstPiece = initialBag[0]
        let (sx, sy) = firstPiece.spawnPos()
        let currentPiece = PieceState(
            pieceType: firstPiece,
            x: Int32(sx),
            y: Int32(sy),
            rotation: 0
        )

        // Next 3 pieces from bag: I, O, L
        let nextPieces: [PieceType] = [initialBag[1], initialBag[2], initialBag[3]]

        return SnapshotContract(
            board: board,
            score: 0,
            lines: 0,
            gameOver: false,
            currentPiece: currentPiece,
            nextPieces: nextPieces,
            heldPiece: nil,
            canHold: true,
            randomizer: randomizer,
            lastAction: LastAction.spawn,
            lastRotationTransition: nil,
            kickIndex: nil,
            lockDelay: LockDelayState(elapsedMs: 0, resets: 0, locked: false),
            combo: -1,
            backToBack: false,
            rulesetVersion: "draft",
            softDropCells: 0
        )
    }
}

// MARK: - EngineCommand Convenience Extensions

extension EngineCommand {
    static var moveLeft: EngineCommand { EngineCommand(kind: .moveLeft, deltaMs: 0) }
    static var moveRight: EngineCommand { EngineCommand(kind: .moveRight, deltaMs: 0) }
    static var softDrop: EngineCommand { EngineCommand(kind: .softDrop, deltaMs: 0) }
    static var hardDrop: EngineCommand { EngineCommand(kind: .hardDrop, deltaMs: 0) }
    static var rotateCw: EngineCommand { EngineCommand(kind: .rotateCw, deltaMs: 0) }
    static var rotateCcw: EngineCommand { EngineCommand(kind: .rotateCcw, deltaMs: 0) }
    static var rotate180: EngineCommand { EngineCommand(kind: .rotate180, deltaMs: 0) }
    static var hold: EngineCommand { EngineCommand(kind: .hold, deltaMs: 0) }
    static func tick(deltaMs: UInt32) -> EngineCommand { EngineCommand(kind: .tick, deltaMs: deltaMs) }
}

// MARK: - PieceType Extensions

extension PieceType {
    /// Returns the spawn position (x, y) for this piece type on a 10-wide board
    func spawnPos() -> (Int32, Int32) {
        // Standard SRS spawn positions for 10-wide board
        // All pieces spawn at y=0 (top visible row), centered at x=3 or 4
        switch self {
        case .i: return (3, 0)  // I piece: 4 wide, centered at x=3
        case .o: return (4, 0)  // O piece: 2 wide, centered at x=4
        case .t: return (3, 0)  // T piece: 3 wide, centered at x=3
        case .s: return (3, 0)  // S piece: 3 wide, centered at x=3
        case .z: return (3, 0)  // Z piece: 3 wide, centered at x=3
        case .j: return (3, 0)  // J piece: 3 wide, centered at x=3
        case .l: return (3, 0)  // L piece: 3 wide, centered at x=3
        }
    }
}

// MARK: - BoardState Extensions

extension BoardState {
    /// Get cell value at (x, y) coordinates
    func get(x: Int32, y: Int32) -> UInt8 {
        let idx = Int(y) * Int(width) + Int(x)
        guard idx >= 0 && idx < cells.count else { return 0 }
        return cells[idx]
    }
}

/// Input adapter for touch gestures (mirrors TypeScript input-adapter.ts)
@MainActor
public final class TouchInputAdapter: ObservableObject {
    public struct Settings {
        public var dasMs: Int = 133
        public var arrMs: Int = 33
        public var softDropFactor: Int = 20
        public var tapThresholdMs: Int = 180
        public var tapMaxDistancePx: Int = 12

        public static let `default` = Settings()
    }

    private var settings = Settings.default
    private var engine: TetrioEngine?

    // Touch state
    private var touchStart: CGPoint = .zero
    private var touchCurrent: CGPoint = .zero
    private var touchStartTime: TimeInterval = 0
    private var touchActive: Bool = false
    private var fingerCount: Int = 1

    // DAS/ARR state
    private var horizontalDirection: Int = 0
    private var dasTimer: TimeInterval = 0
    private var arrTimer: TimeInterval = 0
    private var hasDasFired: Bool = false
    private var dasStartTime: TimeInterval = 0
    private var lastUpdateTime: TimeInterval = 0

    // Soft drop state
    private var softDropActive: Bool = false
    private var softDropLastUpdate: TimeInterval = 0

    // Hold state
    private var holdUsedForCurrentPiece: Bool = false

    public func configure(engine: TetrioEngine, settings: Settings = .default) {
        self.engine = engine
        self.settings = settings
    }

    public func onTouchStart(at point: CGPoint, fingerCount: Int = 1, time: TimeInterval = Date().timeIntervalSince1970 * 1000) {
        self.touchStart = point
        self.touchCurrent = point
        self.touchStartTime = time
        self.touchActive = true
        self.fingerCount = fingerCount
    }

    public func onTouchMove(to point: CGPoint, fingerCount: Int = 1, time: TimeInterval = Date().timeIntervalSince1970 * 1000) {
        guard touchActive, let engine = engine else { return }

        let dx = point.x - touchCurrent.x
        let dy = point.y - touchCurrent.y
        touchCurrent = point
        self.fingerCount = fingerCount
        let dt = time - touchStartTime

        if fingerCount == 1 {
            let absDx = abs(dx)
            let absDy = abs(dy)

            if absDx > absDy && absDx > CGFloat(settings.tapMaxDistancePx) {
                // Horizontal drag
                let newDirection = dx > 0 ? 1 : -1
                if horizontalDirection != newDirection {
                    resetHorizontal()
                    horizontalDirection = newDirection
                    dasStartTime = touchStartTime
                    engine.moveLeft() // or moveRight based on direction
                } else if horizontalDirection != 0 {
                    dasTimer = time - dasStartTime
                    arrTimer += dt

                    if !hasDasFired && dasTimer >= TimeInterval(settings.dasMs) {
                        hasDasFired = true
                        arrTimer = 0
                        if horizontalDirection == 1 { engine.moveRight() } else { engine.moveLeft() }
                    } else if hasDasFired && arrTimer >= TimeInterval(settings.arrMs) {
                        let repeats = Int(arrTimer / TimeInterval(settings.arrMs))
                        arrTimer -= TimeInterval(repeats) * TimeInterval(settings.arrMs)
                        for _ in 0..<repeats {
                            if horizontalDirection == 1 { engine.moveRight() } else { engine.moveLeft() }
                        }
                    }
                }
            } else if absDy > CGFloat(settings.tapMaxDistancePx) && dy > 0 {
                // Downward drag - soft drop
                if !softDropActive {
                    softDropActive = true
                    softDropLastUpdate = time
                }
                engine.softDrop()
                // Also tick for gravity
                // Note: In real implementation, we'd use the engine's tick command
            }
        } else if fingerCount >= 2 {
            // Two fingers - cancel horizontal and soft drop
            resetHorizontal()
            softDropActive = false
        }
    }

    public func onTouchEnd(fingerCount: Int = 1, time: TimeInterval = Date().timeIntervalSince1970 * 1000) {
        guard touchActive, let engine = engine else { return }

        let dt = time - touchStartTime
        let dx = touchCurrent.x - touchStart.x
        let dy = touchCurrent.y - touchStart.y
        let distance = sqrt(dx * dx + dy * dy)

        touchActive = false
        resetHorizontal()
        softDropActive = false

        if fingerCount == 1 && dt <= TimeInterval(settings.tapThresholdMs) && distance <= CGFloat(settings.tapMaxDistancePx) {
            // Tap -> rotate CW
            engine.rotateCW()
        } else if fingerCount >= 2 && dt <= TimeInterval(settings.tapThresholdMs) && distance <= CGFloat(settings.tapMaxDistancePx) {
            // Two-finger tap -> rotate CCW
            engine.rotateCCW()
        }
    }

    public func onHoldPress() {
        guard !holdUsedForCurrentPiece, let engine = engine else { return }
        holdUsedForCurrentPiece = true
        engine.hold()
    }

    public func onPieceSpawn() {
        holdUsedForCurrentPiece = false
    }

    public func update(currentTimeMs: TimeInterval = Date().timeIntervalSince1970 * 1000) {
        // This would be called from a game loop timer
        // For now, the engine handles its own game loop
    }

    private func resetHorizontal() {
        horizontalDirection = 0
        dasTimer = 0
        arrTimer = 0
        hasDasFired = false
        dasStartTime = 0
    }
}