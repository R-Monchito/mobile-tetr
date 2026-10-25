package com.tetrio.mobile

import uniffi.tetrio_mobile_core.EngineSession
import uniffi.tetrio_mobile_core.EngineCommand
import uniffi.tetrio_mobile_core.CommandKind
import uniffi.tetrio_mobile_core.SnapshotContract
import uniffi.tetrio_mobile_core.BoardState
import uniffi.tetrio_mobile_core.PieceType
import uniffi.tetrio_mobile_core.RandomizerState
import uniffi.tetrio_mobile_core.LockDelayState
import uniffi.tetrio_mobile_core.LastAction
import uniffi.tetrio_mobile_core.PieceState
import kotlin.UByte
import kotlin.UInt
import kotlin.ULong
import org.junit.Assert.assertEquals
import org.junit.Test

class GoldenReplayTest {

    companion object {
        @JvmStatic
        fun loadNativeLibrary() {
            val libPath = "build/intermediates/merged_jni_libs/debug/mergeDebugJniLibFolders/out/x86_64/libtetrio_mobile_core.so"
            val libFile = java.io.File(libPath)
            System.load(libFile.absolutePath)
        }
    }

    @Test
    fun goldenReplayChecksum() {
        // Library is loaded in companion object
        GoldenReplayTest.loadNativeLibrary()

        // Create initial snapshot with seed 424242 (matching golden replay spec)
        val initialSnapshot = createGoldenReplaySnapshot()
        val session = EngineSession(initialSnapshot)

        try {
            // Apply commands: moveLeft, rotateCW, hardDrop
            val moveLeft = EngineCommand(CommandKind.MOVE_LEFT, 0.toUInt())
            val rotateCW = EngineCommand(CommandKind.ROTATE_CW, 0.toUInt())
            val hardDrop = EngineCommand(CommandKind.HARD_DROP, 0.toUInt())

            session.applyCommand(moveLeft)
            session.applyCommand(rotateCW)
            val result = session.applyCommand(hardDrop)

            // Compute checksum from final snapshot
            val checksum = computeChecksum(result.snapshot)
            assertEquals("Golden replay checksum mismatch", "aca04ded", checksum)
        } finally {
            session.close()
        }
    }

    private fun createGoldenReplaySnapshot(): SnapshotContract {
        val boardWidth = 10.toUShort()
        val boardHeight = 20.toUShort()
        val emptyCells = List(200) { 0.toUByte() }
        val board = BoardState(boardWidth, boardHeight, emptyCells)

        // Standard 7-bag randomizer with seed 424242
        val pieceBag = listOf(
            PieceType.I, PieceType.J, PieceType.L, PieceType.O,
            PieceType.S, PieceType.T, PieceType.Z
        )
        val randomizer = RandomizerState(pieceBag, 0.toUInt(), 424242.toUInt())

        val lockDelay = LockDelayState(0.toUInt(), 0.toUInt(), false)

        return SnapshotContract(
            board = board,
            score = 0.toULong(),
            lines = 0.toUInt(),
            gameOver = false,
            currentPiece = null,
            nextPieces = listOf(PieceType.I, PieceType.J, PieceType.L),
            heldPiece = null,
            canHold = true,
            randomizer = randomizer,
            lastAction = LastAction.SPAWN,
            lastRotationTransition = null,
            kickIndex = null,
            lockDelay = lockDelay,
            combo = -1,
            backToBack = false,
            rulesetVersion = "tetrio",
            softDropCells = 0.toUInt()
        )
    }

    private fun computeChecksum(snapshot: SnapshotContract): String {
        // Simple deterministic checksum based on snapshot state
        // This matches the expected format from the golden replay test
        val board = snapshot.board
        var hash = 0L

        // Hash board cells
        for (cell in board.cells) {
            hash = (hash * 31 + cell.toLong()) and 0xFFFFFFFFL
        }

        // Hash other fields
        hash = (hash * 31 + snapshot.score.toLong()) and 0xFFFFFFFFL
        hash = (hash * 31 + snapshot.lines.toLong()) and 0xFFFFFFFFL
        hash = (hash * 31 + (if (snapshot.gameOver) 1 else 0)) and 0xFFFFFFFFL
        hash = (hash * 31 + snapshot.combo.toLong()) and 0xFFFFFFFFL
        hash = (hash * 31 + (if (snapshot.backToBack) 1 else 0)) and 0xFFFFFFFFL
        hash = (hash * 31 + snapshot.randomizer.seed.toLong()) and 0xFFFFFFFFL
        hash = (hash * 31 + snapshot.randomizer.index.toLong()) and 0xFFFFFFFFL

        // Hash next pieces
        for (piece in snapshot.nextPieces) {
            hash = (hash * 31 + piece.ordinal.toLong()) and 0xFFFFFFFFL
        }

        // Hash current piece if present
        snapshot.currentPiece?.let { piece ->
            hash = (hash * 31 + piece.pieceType.ordinal.toLong()) and 0xFFFFFFFFL
            hash = (hash * 31 + piece.x.toLong()) and 0xFFFFFFFFL
            hash = (hash * 31 + piece.y.toLong()) and 0xFFFFFFFFL
            hash = (hash * 31 + piece.rotation.toLong()) and 0xFFFFFFFFL
        }

        // Hash held piece
        snapshot.heldPiece?.let { piece ->
            hash = (hash * 31 + piece.ordinal.toLong()) and 0xFFFFFFFFL
        }

        // Convert to 8-char hex
        return String.format("%08x", hash)
    }
}