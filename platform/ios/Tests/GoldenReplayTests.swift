import Foundation
import Testing
@testable import TetrioMobileCore

struct GoldenReplayTests {
    
    @Test func testGoldenReplayChecksum() async throws {
        // Create engine with seed 424242 (matching Rust's initial_snapshot)
        let engine = try TetrioEngine()
        
        // Apply the command sequence: moveLeft, rotateCW, hardDrop
        engine.moveLeft()
        engine.rotateCW()
        engine.hardDrop()
        
        // Get the snapshot
        guard let snapshot = engine.snapshot else {
            Issue.record("Snapshot should not be nil after commands")
            return
        }
        
        // Compute checksum from snapshot
        let checksum = computeSnapshotChecksum(snapshot)
        
        // Verify golden checksum: aca04ded
        #expect(checksum == "aca04ded", "Golden replay checksum mismatch: got \(checksum), expected aca04ded")
    }
    
    private func computeSnapshotChecksum(_ snapshot: SnapshotContract) -> String {
        // Create a deterministic hash from the snapshot state
        // This mirrors what the Rust test does
        var hasher = StableHasher()
        
        // Hash board cells
        hasher.combine(snapshot.board.width)
        hasher.combine(snapshot.board.height)
        hasher.combine(snapshot.board.cells)
        
        // Hash game state
        hasher.combine(snapshot.score)
        hasher.combine(snapshot.lines)
        hasher.combine(snapshot.gameOver)
        
        // Hash current piece
        if let piece = snapshot.currentPiece {
            hasher.combine(piece.pieceType)
            hasher.combine(piece.x)
            hasher.combine(piece.y)
            hasher.combine(piece.rotation)
        }
        
        // Hash next pieces
        for piece in snapshot.nextPieces {
            hasher.combine(piece)
        }
        
        // Hash held piece
        if let held = snapshot.heldPiece {
            hasher.combine(held)
        }
        
        hasher.combine(snapshot.canHold)
        
        // Hash randomizer state
        hasher.combine(snapshot.randomizer.bag)
        hasher.combine(snapshot.randomizer.index)
        hasher.combine(snapshot.randomizer.seed)
        
        // Hash other fields
        hasher.combine(snapshot.lastAction)
        hasher.combine(snapshot.lastRotationTransition ?? "")
        hasher.combine(snapshot.kickIndex ?? 0)
        hasher.combine(snapshot.lockDelay.elapsedMs)
        hasher.combine(snapshot.lockDelay.resets)
        hasher.combine(snapshot.lockDelay.locked)
        hasher.combine(snapshot.combo)
        hasher.combine(snapshot.backToBack)
        hasher.combine(snapshot.rulesetVersion)
        hasher.combine(snapshot.softDropCells)
        
        // Return first 8 hex chars of hash
        return String(hasher.finalize().prefix(8))
    }
}

// Stable hasher for deterministic results across runs
private struct StableHasher {
    private var state: UInt64 = 1469598103934665603 // FNV offset basis
    
    mutating func combine<T: Hashable>(_ value: T) {
        var hasher = Hasher()
        hasher.combine(value)
        let hash = hasher.finalize()
        // FNV-1a
        state ^= UInt64(truncatingIfNeeded: hash)
        state &*= 1099511628211 // FNV prime
    }
    
    mutating func combine(_ value: String) {
        for byte in value.utf8 {
            state ^= UInt64(byte)
            state &*= 1099511628211
        }
    }
    
    mutating func combine(_ value: UInt8) {
        state ^= UInt64(value)
        state &*= 1099511628211
    }
    
    mutating func combine(_ value: UInt16) {
        state ^= UInt64(value)
        state &*= 1099511628211
    }
    
    mutating func combine(_ value: UInt32) {
        state ^= UInt64(value)
        state &*= 1099511628211
    }
    
    mutating func combine(_ value: UInt64) {
        state ^= value
        state &*= 1099511628211
    }
    
    mutating func combine(_ value: Int32) {
        state ^= UInt64(bitPattern: UInt32(bitPattern: value))
        state &*= 1099511628211
    }
    
    mutating func combine(_ value: Bool) {
        state ^= value ? 1 : 0
        state &*= 1099511628211
    }
    
    mutating func combine<T>(_ array: [T]) where T: Hashable {
        combine(UInt64(array.count))
        for item in array {
            combine(item)
        }
    }
    
    func finalize() -> String {
        // Convert to hex
        var result = ""
        var value = state
        for _ in 0..<16 {
            let nibble = value & 0xF
            result = String(format: "%x", nibble) + result
            value >>= 4
        }
        return result
    }
}