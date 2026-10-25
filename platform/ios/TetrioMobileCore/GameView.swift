import SwiftUI
import TetrioMobileCore

struct GameView: View {
    @StateObject private var engine: TetrioEngine
    @StateObject private var inputAdapter = TouchInputAdapter()

    init() {
        let engineInstance = try! TetrioEngine()
        _engine = StateObject(wrappedValue: engineInstance)
        _inputAdapter = StateObject(wrappedValue: TouchInputAdapter())
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                Color.black.ignoresSafeArea()

                // Game canvas
                GameCanvas(engine: engine)
                    .gesture(
                        DragGesture(minimumDistance: 0, coordinateSpace: .local)
                            .onChanged { value in
                                let fingerCount = 1 // Simplified - real impl would detect multi-touch
                                if value.translation == .zero {
                                    inputAdapter.onTouchStart(
                                        at: value.location,
                                        fingerCount: fingerCount
                                    )
                                } else {
                                    inputAdapter.onTouchMove(
                                        to: value.location,
                                        fingerCount: fingerCount
                                    )
                                }
                            }
                            .onEnded { value in
                                inputAdapter.onTouchEnd(fingerCount: 1)
                            }
                    )
                    .simultaneousGesture(
                        TapGesture(count: 2)
                            .onEnded {
                                // Two-finger tap for CCW rotation
                                engine.rotateCCW()
                            }
                    )

                // Hold button overlay
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        HoldButton(engine: engine)
                            .padding(.trailing, 20)
                            .padding(.bottom, 50)
                    }
                }

                // Score overlay
                VStack {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Score: \(engine.score)")
                                .font(.system(.title, design: .monospaced))
                                .foregroundColor(.white)
                            Text("Lines: \(engine.lines)")
                                .font(.system(.body, design: .monospaced))
                                .foregroundColor(.white.opacity(0.8))
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("Next:")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.7))
                            NextPiecesView(pieces: engine.snapshot?.nextPieces ?? [])
                        }
                    }
                    .padding()
                    Spacer()
                }

                // Game Over overlay
                if engine.isGameOver {
                    GameOverView(engine: engine)
                }
            }
        }
        .onAppear {
            inputAdapter.configure(engine: engine)
            engine.start()
        }
        .onDisappear {
            engine.stop()
        }
    }
}

struct GameCanvas: View {
    @ObservedObject var engine: TetrioEngine

    var body: some View {
        Canvas { context, size in
            guard let snapshot = engine.snapshot else { return }

            let board = snapshot.board
            let cellSize = min(size.width, size.height / 2) / CGFloat(board.width)

            // Draw locked board cells
            for y in 0..<board.height {
                for x in 0..<board.width {
                    let cellValue = board.get(x: Int32(x), y: Int32(y))
                    if cellValue != 0 {
                        let rect = CGRect(
                            x: CGFloat(x) * cellSize,
                            y: CGFloat(y) * cellSize,
                            width: cellSize,
                            height: cellSize
                        )
                        context.fill(Path(rect), with: .color(.white))
                        context.stroke(Path(rect), with: .color(.gray.opacity(0.3)), lineWidth: 0.5)
                    }
                }
            }

            // Draw current piece
            if let piece = snapshot.currentPiece {
                let pieceColor = Color.yellow
                let rect = CGRect(
                    x: CGFloat(piece.x) * cellSize,
                    y: CGFloat(piece.y) * cellSize,
                    width: cellSize * 2, // Simplified
                    height: cellSize * 2
                )
                context.fill(Path(rect), with: .color(pieceColor))
            }

            // Draw ghost piece (where current piece would land)
            if let piece = snapshot.currentPiece {
                // Calculate drop position
                var ghostY = piece.y
                while !boardCollision(piece: piece, atY: ghostY + 1, board: snapshot.board) {
                    ghostY += 1
                }
                if ghostY != piece.y {
                    let ghostColor = Color.yellow.opacity(0.3)
                    let rect = CGRect(
                        x: CGFloat(piece.x) * cellSize,
                        y: CGFloat(ghostY) * cellSize,
                        width: cellSize * 2,
                        height: cellSize * 2
                    )
                    context.fill(Path(rect), with: .color(ghostColor))
                }
            }
        }
        .background(Color.black)
    }

    private func boardCollision(piece: PieceState, atY: Int32, board: BoardState) -> Bool {
        // Simplified collision check
        return false
    }
}

struct NextPiecesView: View {
    let pieces: [PieceType]

    var body: some View {
        VStack(spacing: 8) {
            ForEach(pieces.prefix(3), id: \.self) { piece in
                PiecePreview(pieceType: piece)
            }
        }
    }
}

struct PiecePreview: View {
    let pieceType: PieceType

    var body: some View {
        // Simplified preview - just show piece type
        Text(pieceType.description)
            .font(.system(.caption, design: .monospaced))
            .foregroundColor(.white)
            .frame(width: 60, height: 60)
            .background(Color.gray.opacity(0.2))
            .cornerRadius(8)
    }
}

struct HoldButton: View {
    @ObservedObject var engine: TetrioEngine

    var body: some View {
        Button(action: {
            engine.hold()
        }) {
            VStack(spacing: 4) {
                if let held = engine.snapshot?.heldPiece {
                    PiecePreview(pieceType: held)
                } else {
                    Image(systemName: "hand.tap")
                        .font(.system(size: 24))
                        .foregroundColor(.white.opacity(0.7))
                        .frame(width: 60, height: 60)
                        .background(Color.gray.opacity(0.2))
                        .cornerRadius(12)
                }
                Text("HOLD")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.8))
            }
        }
        .disabled(!(engine.snapshot?.canHold ?? false))
    }
}

struct GameOverView: View {
    @ObservedObject var engine: TetrioEngine

    var body: some View {
        ZStack {
            Color.black.opacity(0.8).ignoresSafeArea()

            VStack(spacing: 20) {
                Text("GAME OVER")
                    .font(.system(.largeTitle, design: .rounded, weight: .bold))
                    .foregroundColor(.red)

                Text("Score: \(engine.score)")
                    .font(.system(.title, design: .monospaced))
                    .foregroundColor(.white)

                Text("Lines: \(engine.lines)")
                    .font(.system(.title2, design: .monospaced))
                    .foregroundColor(.white.opacity(0.8))

                Button("Restart") {
                    // TODO: Implement restart
                }
                .font(.system(.title3, design: .rounded, weight: .semibold))
                .foregroundColor(.black)
                .padding(.horizontal, 40)
                .padding(.vertical, 12)
                .background(Color.white)
                .cornerRadius(12)
            }
        }
    }
}

extension PieceType: CustomStringConvertible {
    public var description: String {
        switch self {
        case .i: return "I"
        case .j: return "J"
        case .l: return "L"
        case .o: return "O"
        case .s: return "S"
        case .t: return "T"
        case .z: return "Z"
        }
    }
}

#Preview {
    GameView()
}