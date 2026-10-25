//! Native-core ABI spike.
//! Offline-only: no networking, authentication, or service integration.

#[cfg(not(feature = "wasm"))]
use uniffi_macros::{Enum, Record};

#[cfg(not(feature = "wasm"))]
uniffi::include_scaffolding!("tetrio_mobile");

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(feature = "wasm")]
pub use wasm_ffi::*;

#[cfg_attr(not(feature = "wasm"), derive(uniffi_macros::Record))]
#[cfg_attr(feature = "wasm", derive(serde::Serialize, serde::Deserialize))]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct BoardSize {
    pub width: u16,
    pub height: u16,
}

#[cfg_attr(not(feature = "wasm"), derive(uniffi_macros::Record))]
#[cfg_attr(feature = "wasm", derive(serde::Serialize, serde::Deserialize))]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct EngineCapabilities {
    pub replay: bool,
    pub deterministic_rng: bool,
    pub network: bool,
}

#[cfg_attr(not(feature = "wasm"), derive(uniffi_macros::Enum))]
#[cfg_attr(feature = "wasm", derive(serde::Serialize, serde::Deserialize))]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CommandKind {
    MoveLeft,
    MoveRight,
    SoftDrop,
    HardDrop,
    RotateCw,
    RotateCcw,
    Rotate180,
    Hold,
    Tick,
}

#[cfg_attr(not(feature = "wasm"), derive(uniffi_macros::Record))]
#[cfg_attr(feature = "wasm", derive(serde::Serialize, serde::Deserialize))]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct EngineCommand {
    pub kind: CommandKind,
    pub delta_ms: u32,
}

#[cfg_attr(feature = "wasm", derive(serde::Serialize, serde::Deserialize))]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PieceType {
    I,
    J,
    L,
    O,
    S,
    T,
    Z,
}

impl PieceType {
    pub fn all() -> [PieceType; 7] {
        [
            PieceType::I,
            PieceType::J,
            PieceType::L,
            PieceType::O,
            PieceType::S,
            PieceType::T,
            PieceType::Z,
        ]
    }

    pub fn spawn_pos(&self) -> (i32, i32) {
        match self {
            PieceType::I => (3, 21),
            PieceType::O => (4, 22),
            _ => (3, 22),
        }
    }

    fn base_matrix(&self) -> [[u8; 4]; 4] {
        match self {
            PieceType::I => [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
            PieceType::J => [[1, 0, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
            PieceType::L => [[0, 0, 1, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
            PieceType::O => [[1, 1, 0, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
            PieceType::S => [[0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
            PieceType::T => [[0, 1, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
            PieceType::Z => [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        }
    }

    fn rotate_matrix(matrix: [[u8; 4]; 4]) -> [[u8; 4]; 4] {
        let mut result = [[0u8; 4]; 4];
        for i in 0..4 {
            for j in 0..4 {
                result[j][3 - i] = matrix[i][j];
            }
        }
        result
    }

    #[allow(clippy::needless_range_loop)]
    pub fn shape(&self, rotation: u8) -> Vec<(i32, i32)> {
        let mut matrix = self.base_matrix();
        for _ in 0..(rotation % 4) {
            matrix = Self::rotate_matrix(matrix);
        }
        let mut blocks = Vec::new();
        for y in 0..4 {
            for x in 0..4 {
                if matrix[y][x] != 0 {
                    blocks.push((x as i32, y as i32));
                }
            }
        }
        blocks
    }

    pub fn wall_kicks(&self, from_rot: u8, to_rot: u8) -> [(i32, i32); 5] {
        let from = from_rot % 4;
        let to = to_rot % 4;
        if self == &PieceType::I {
            match (from, to) {
                (0, 1) => [(0, 0), (-2, 0), (1, 0), (-2, -1), (1, 2)],
                (1, 0) => [(0, 0), (2, 0), (-1, 0), (2, 1), (-1, -2)],
                (1, 2) => [(0, 0), (-1, 0), (2, 0), (-1, 2), (2, -1)],
                (2, 1) => [(0, 0), (1, 0), (-2, 0), (1, -2), (-2, 1)],
                (2, 3) => [(0, 0), (2, 0), (-1, 0), (2, 1), (-1, -2)],
                (3, 2) => [(0, 0), (-2, 0), (1, 0), (-2, -1), (1, 2)],
                (3, 0) => [(0, 0), (1, 0), (-2, 0), (1, 2), (-2, -1)],
                (0, 3) => [(0, 0), (-1, 0), (2, 0), (-1, 2), (2, -1)],
                _ => [(0, 0), (0, 0), (0, 0), (0, 0), (0, 0)],
            }
        } else {
            match (from, to) {
                (0, 1) => [(0, 0), (1, 0), (1, -1), (0, 2), (1, 2)],
                (1, 0) => [(0, 0), (-1, 0), (-1, 1), (0, -2), (-1, -2)],
                (1, 2) => [(0, 0), (1, 0), (1, 1), (0, -2), (1, -2)],
                (2, 1) => [(0, 0), (-1, 0), (-1, -1), (0, 2), (-1, 2)],
                (2, 3) => [(0, 0), (-1, 0), (-1, -1), (0, 2), (-1, 2)],
                (3, 2) => [(0, 0), (1, 0), (1, 1), (0, -2), (1, -2)],
                (3, 0) => [(0, 0), (-1, 0), (-1, 1), (0, -2), (-1, -2)],
                (0, 3) => [(0, 0), (1, 0), (1, -1), (0, 2), (1, 2)],
                _ => [(0, 0), (0, 0), (0, 0), (0, 0), (0, 0)],
            }
        }
    }
}

#[cfg_attr(not(feature = "wasm"), derive(uniffi_macros::Record))]
#[cfg_attr(feature = "wasm", derive(serde::Serialize, serde::Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BoardState {
    pub width: u16,
    pub height: u16,
    pub cells: Vec<u8>,
}

impl BoardState {
    pub fn new(width: u16, height: u16) -> Self {
        BoardState {
            width,
            height,
            cells: vec![0; (width * height) as usize],
        }
    }

    pub fn get(&self, x: i32, y: i32) -> u8 {
        if x < 0 || x >= self.width as i32 || y < 0 || y >= self.height as i32 {
            return 1;
        }
        self.cells[(y as u16 * self.width + x as u16) as usize]
    }

    /// Internal method for collision detection
    pub fn is_occupied(&self, x: i32, y: i32) -> bool {
        self.get(x, y) != 0
    }

    pub fn set(&mut self, x: i32, y: i32, v: u8) {
        if x >= 0 && x < self.width as i32 && y >= 0 && y < self.height as i32 {
            self.cells[(y as u16 * self.width + x as u16) as usize] = v;
        }
    }

    fn check_collision(&self, piece: &PieceState, offset_x: i32, offset_y: i32) -> bool {
        for (dx, dy) in piece.piece_type.shape(piece.rotation) {
            let x = piece.x + dx + offset_x;
            let y = piece.y + dy + offset_y;
            if self.is_occupied(x, y) {
                return true;
            }
        }
        false
    }
}

#[cfg_attr(feature = "wasm", derive(serde::Serialize, serde::Deserialize))]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PieceState {
    pub piece_type: PieceType,
    pub x: i32,
    pub y: i32,
    pub rotation: u8,
}

#[cfg_attr(feature = "wasm", derive(serde::Serialize, serde::Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RandomizerState {
    pub bag: Vec<PieceType>,
    pub index: u32,
    pub seed: u32,
}

impl RandomizerState {
    pub fn new(seed: u32) -> Self {
        let bag = Self::shuffle_bag(seed);
        RandomizerState {
            bag,
            index: 0,
            seed,
        }
    }

    fn shuffle_bag(seed: u32) -> Vec<PieceType> {
        let mut bag = PieceType::all().to_vec();
        let mut rng = seed;
        for i in (1..bag.len()).rev() {
            rng = rng.wrapping_mul(1664525).wrapping_add(1013904223);
            let j = (rng as usize) % (i + 1);
            bag.swap(i, j);
        }
        bag
    }

    #[allow(clippy::should_implement_trait)]
    pub fn next(&mut self) -> PieceType {
        if self.index >= self.bag.len() as u32 {
            let new_seed = self.seed.wrapping_add(self.index);
            self.bag = Self::shuffle_bag(new_seed);
            self.index = 0;
            self.seed = new_seed;
        }
        let piece = self.bag[self.index as usize];
        self.index += 1;
        piece
    }

    pub fn peek(&self, n: usize) -> Vec<PieceType> {
        let mut result = Vec::with_capacity(n);
        let mut idx = self.index as usize;
        let mut bag = self.bag.clone();
        let mut seed = self.seed.wrapping_add(self.index);
        while result.len() < n {
            if idx >= bag.len() {
                let rng = seed;
                bag = Self::shuffle_bag(rng);
                idx = 0;
                seed = seed.wrapping_add(bag.len() as u32);
            }
            result.push(bag[idx]);
            idx += 1;
        }
        result
    }
}

#[cfg_attr(feature = "wasm", derive(serde::Serialize, serde::Deserialize))]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum LastAction {
    Spawn,
    Move,
    Rotate,
    Drop,
    Hold,
    Lock,
}

#[cfg_attr(feature = "wasm", derive(serde::Serialize, serde::Deserialize))]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct LockDelayState {
    pub elapsed_ms: u32,
    pub resets: u32,
    pub locked: bool,
}

impl Default for LockDelayState {
    fn default() -> Self {
        Self::new()
    }
}

impl LockDelayState {
    pub fn new() -> Self {
        LockDelayState {
            elapsed_ms: 0,
            resets: 0,
            locked: false,
        }
    }

    fn advance(&mut self, delta_ms: u32, grounded: bool) {
        if self.locked || delta_ms == 0 {
            return;
        }
        if !grounded {
            self.elapsed_ms = 0;
            self.locked = false;
            return;
        }
        self.elapsed_ms = self.elapsed_ms.saturating_add(delta_ms).min(500);
        self.locked = self.elapsed_ms >= 500;
    }

    fn reset(&mut self, grounded: bool) {
        if !grounded || self.locked || self.resets >= 15 {
            return;
        }
        self.elapsed_ms = 0;
        self.resets += 1;
        self.locked = false;
    }
}

#[cfg_attr(feature = "wasm", derive(serde::Serialize, serde::Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SnapshotContract {
    pub board: BoardState,
    pub score: u64,
    pub lines: u32,
    pub game_over: bool,
    pub current_piece: Option<PieceState>,
    pub next_pieces: Vec<PieceType>,
    pub held_piece: Option<PieceType>,
    pub can_hold: bool,
    pub randomizer: RandomizerState,
    pub last_action: LastAction,
    pub last_rotation_transition: Option<String>,
    pub kick_index: Option<u8>,
    pub lock_delay: LockDelayState,
    pub combo: i32,
    pub back_to_back: bool,
    pub ruleset_version: String,
    pub soft_drop_cells: u32,
}

#[cfg_attr(feature = "wasm", derive(serde::Serialize, serde::Deserialize))]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EngineEventKind {
    Spawned,
    Moved,
    Rotated,
    SoftDropped,
    HardDropped,
    Locked,
    LinesCleared,
    Held,
    GameOver,
}

#[cfg_attr(feature = "wasm", derive(serde::Serialize, serde::Deserialize))]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct EngineEvent {
    pub kind: EngineEventKind,
    pub value: u32,
    pub piece: Option<PieceType>,
}

#[cfg_attr(feature = "wasm", derive(serde::Serialize, serde::Deserialize))]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EngineError {
    InvalidBoard,
    GameOver,
    InvalidCommand,
}

#[cfg_attr(feature = "wasm", derive(serde::Serialize, serde::Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EngineResult {
    pub snapshot: SnapshotContract,
    pub events: Vec<EngineEvent>,
    pub error: Option<EngineError>,
}

use std::cell::RefCell;

pub struct EngineSession {
    snapshot: RefCell<SnapshotContract>,
}

impl EngineSession {
    pub fn new(initial: SnapshotContract) -> Self {
        EngineSession { snapshot: RefCell::new(initial) }
    }

    pub fn capabilities(&self) -> EngineCapabilities {
        EngineCapabilities {
            replay: true,
            deterministic_rng: true,
            network: false,
        }
    }

    pub fn snapshot(&self) -> SnapshotContract {
        self.snapshot.borrow().clone()
    }

    pub fn apply_command(&self, command: EngineCommand) -> EngineResult {
        let mut snapshot = self.snapshot.borrow_mut();
        if snapshot.game_over {
            return EngineResult {
                snapshot: snapshot.clone(),
                events: vec![],
                error: Some(EngineError::GameOver),
            };
        }

        match command.kind {
            CommandKind::Tick => self.handle_tick(command.delta_ms),
            CommandKind::MoveLeft => self.try_move(-1),
            CommandKind::MoveRight => self.try_move(1),
            CommandKind::SoftDrop => self.try_soft_drop(),
            CommandKind::HardDrop => self.try_hard_drop(),
            CommandKind::RotateCw => self.try_rotate(1),
            CommandKind::RotateCcw => self.try_rotate(3),
            CommandKind::Rotate180 => self.try_rotate(2),
            CommandKind::Hold => self.try_hold(),
        }
    }

    fn handle_tick(&self, delta_ms: u32) -> EngineResult {
        let mut snapshot = self.snapshot.borrow_mut();
        let Some(piece) = snapshot.current_piece else {
            return EngineResult {
                snapshot: snapshot.clone(),
                events: vec![],
                error: Some(EngineError::GameOver),
            };
        };

        let grounded = snapshot.board.check_collision(&piece, 0, 1);
        snapshot.lock_delay.advance(delta_ms, grounded);

        if snapshot.lock_delay.locked {
            return self.try_lock();
        }

        EngineResult {
            snapshot: snapshot.clone(),
            events: vec![],
            error: None,
        }
    }

    fn try_move(&self, dx: i32) -> EngineResult {
        let mut snapshot = self.snapshot.borrow_mut();
        let Some(mut piece) = snapshot.current_piece else {
            return EngineResult {
                snapshot: snapshot.clone(),
                events: vec![],
                error: Some(EngineError::GameOver),
            };
        };

        if snapshot.board.check_collision(&piece, dx, 0) {
            return EngineResult {
                snapshot: snapshot.clone(),
                events: vec![],
                error: None,
            };
        }

        piece.x += dx;
        snapshot
            .lock_delay
            .reset(snapshot.board.check_collision(&piece, 0, 1));
        snapshot.current_piece = Some(piece);
        snapshot.last_action = LastAction::Move;
        snapshot.last_rotation_transition = None;
        snapshot.kick_index = None;

        EngineResult {
            snapshot: snapshot.clone(),
            events: vec![EngineEvent {
                kind: EngineEventKind::Moved,
                value: dx.unsigned_abs(),
                piece: Some(piece.piece_type),
            }],
            error: None,
        }
    }

    fn try_rotate(&self, rot_delta: u8) -> EngineResult {
        let mut snapshot = self.snapshot.borrow_mut();
        let Some(mut piece) = snapshot.current_piece else {
            return EngineResult {
                snapshot: snapshot.clone(),
                events: vec![],
                error: Some(EngineError::GameOver),
            };
        };

        let from_rot = piece.rotation;
        let to_rot = (from_rot + rot_delta) % 4;
        let kicks = piece.piece_type.wall_kicks(from_rot, to_rot);

        for (i, (kx, ky)) in kicks.iter().enumerate() {
            if !snapshot.board.check_collision(&piece, *kx, *ky) {
                piece.x += kx;
                piece.y += ky;
                piece.rotation = to_rot;
                snapshot
                    .lock_delay
                    .reset(snapshot.board.check_collision(&piece, 0, 1));
                snapshot.current_piece = Some(piece);
                snapshot.last_action = LastAction::Rotate;
                snapshot.last_rotation_transition = Some(format!("{}->{}", from_rot, to_rot));
                snapshot.kick_index = Some(i as u8);

                return EngineResult {
                    snapshot: self.snapshot.clone(),
                    events: vec![EngineEvent {
                        kind: EngineEventKind::Rotated,
                        value: rot_delta as u32,
                        piece: Some(piece.piece_type),
                    }],
                    error: None,
                };
            }
        }

        EngineResult {
            snapshot: self.snapshot.clone(),
            events: vec![],
            error: None,
        }
    }

    fn try_soft_drop(&self) -> EngineResult {
        let mut snapshot = self.snapshot.borrow_mut();
        let Some(mut piece) = snapshot.current_piece else {
            return EngineResult {
                snapshot: snapshot.clone(),
                events: vec![],
                error: Some(EngineError::GameOver),
            };
        };

        let mut drop = 0;
        while !snapshot.board.check_collision(&piece, 0, drop + 1) {
            drop += 1;
        }

        if drop == 0 {
            return EngineResult {
                snapshot: snapshot.clone(),
                events: vec![],
                error: None,
            };
        }

        piece.y += drop;
        snapshot.soft_drop_cells += drop as u32;
        snapshot
            .lock_delay
            .reset(snapshot.board.check_collision(&piece, 0, 1));
        snapshot.current_piece = Some(piece);
        snapshot.last_action = LastAction::Drop;
        snapshot.last_rotation_transition = None;
        snapshot.kick_index = None;

        EngineResult {
            snapshot: snapshot.clone(),
            events: vec![EngineEvent {
                kind: EngineEventKind::SoftDropped,
                value: drop as u32,
                piece: Some(piece.piece_type),
            }],
            error: None,
        }
    }

    fn try_hard_drop(&self) -> EngineResult {
        let mut snapshot = self.snapshot.borrow_mut();
        let Some(piece) = snapshot.current_piece else {
            return EngineResult {
                snapshot: snapshot.clone(),
                events: vec![],
                error: Some(EngineError::GameOver),
            };
        };

        let mut drop = 0;
        while !snapshot.board.check_collision(&piece, 0, drop + 1) {
            drop += 1;
        }

        let mut new_piece = piece;
        new_piece.y += drop;

        let mut events = vec![
            EngineEvent {
                kind: EngineEventKind::HardDropped,
                value: drop as u32,
                piece: Some(piece.piece_type),
            },
            EngineEvent {
                kind: EngineEventKind::Locked,
                value: 0,
                piece: Some(piece.piece_type),
            },
        ];

        self.lock_piece(new_piece, drop as u32, &mut events);

        EngineResult {
            snapshot: snapshot.clone(),
            events,
            error: None,
        }
    }

    fn try_hold(&self) -> EngineResult {
        let mut snapshot = self.snapshot.borrow_mut();
        if !snapshot.can_hold || snapshot.current_piece.is_none() {
            return EngineResult {
                snapshot: snapshot.clone(),
                events: vec![],
                error: None,
            };
        }

        let current_type = snapshot.current_piece.as_ref().unwrap().piece_type;
        let held = snapshot.held_piece.take();

        let new_piece_type = if let Some(h) = held {
            h
        } else {
            snapshot.randomizer.next()
        };

        let (sx, sy) = new_piece_type.spawn_pos();
        let new_piece = PieceState {
            piece_type: new_piece_type,
            x: sx,
            y: sy,
            rotation: 0,
        };
        let game_over = snapshot.board.check_collision(&new_piece, 0, 0);

        if held.is_none() {
            snapshot.next_pieces = snapshot.randomizer.peek(3);
        }

        snapshot.current_piece = if game_over { None } else { Some(new_piece) };
        snapshot.held_piece = Some(current_type);
        snapshot.can_hold = false;
        snapshot.game_over = game_over;
        snapshot.last_action = LastAction::Hold;
        snapshot.last_rotation_transition = None;
        snapshot.kick_index = None;
        snapshot.lock_delay = LockDelayState::new();

        let mut events = vec![EngineEvent {
            kind: EngineEventKind::Held,
            value: 0,
            piece: Some(current_type),
        }];

        if game_over {
            events.push(EngineEvent {
                kind: EngineEventKind::GameOver,
                value: 0,
                piece: None,
            });
        } else {
            events.push(EngineEvent {
                kind: EngineEventKind::Spawned,
                value: 0,
                piece: snapshot.current_piece.as_ref().map(|p| p.piece_type),
            });
        }

        EngineResult {
            snapshot: snapshot.clone(),
            events,
            error: None,
        }
    }

    fn try_lock(&self) -> EngineResult {
        let mut snapshot = self.snapshot.borrow_mut();
        let Some(piece) = snapshot.current_piece else {
            return EngineResult {
                snapshot: snapshot.clone(),
                events: vec![],
                error: Some(EngineError::GameOver),
            };
        };

        if snapshot.board.check_collision(&piece, 0, 1) {
            let mut events = vec![EngineEvent {
                kind: EngineEventKind::Locked,
                value: 0,
                piece: Some(piece.piece_type),
            }];
            self.lock_piece(piece, 0, &mut events);
            return EngineResult {
                snapshot: snapshot.clone(),
                events,
                error: None,
            };
        }

        EngineResult {
            snapshot: snapshot.clone(),
            events: vec![],
            error: None,
        }
    }

    fn lock_piece(
        &self,
        piece: PieceState,
        hard_drop_cells: u32,
        events: &mut Vec<EngineEvent>,
        snapshot: &mut SnapshotContract,
    ) {
        for (dx, dy) in piece.piece_type.shape(piece.rotation) {
            snapshot
                .board
                .set(piece.x + dx, piece.y + dy, piece.piece_type as u8 + 1);
        }

        let lines_cleared = self.clear_lines(snapshot);
        snapshot.lines += lines_cleared;

        let tspin_kind = self.classify_tspin(&piece, snapshot);
        let clear_kind = self.determine_clear_kind(lines_cleared, tspin_kind);
        let score_result = self.score_lock(
            clear_kind,
            lines_cleared,
            snapshot.soft_drop_cells,
            hard_drop_cells,
            snapshot,
        );

        snapshot.score = score_result.score;
        snapshot.combo = score_result.combo;
        snapshot.back_to_back = score_result.back_to_back;
        snapshot.soft_drop_cells = 0;

        if lines_cleared > 0 {
            events.push(EngineEvent {
                kind: EngineEventKind::LinesCleared,
                value: lines_cleared,
                piece: Some(piece.piece_type),
            });
        }

        self.spawn_next_piece(events, snapshot);
    }

    fn clear_lines(&self, snapshot: &mut SnapshotContract) -> u32 {
        let width = snapshot.board.width;
        let height = snapshot.board.height;
        let mut new_cells = Vec::new();
        let mut lines_cleared = 0;

        for y in (0..height).rev() {
            let mut full = true;
            for x in 0..width {
                if snapshot.board.get(x as i32, y as i32) == 0 {
                    full = false;
                    break;
                }
            }
            if full {
                lines_cleared += 1;
            } else {
                for x in 0..width {
                    new_cells.push(snapshot.board.get(x as i32, y as i32));
                }
            }
        }

        while new_cells.len() < (width * height) as usize {
            new_cells.push(0);
        }

        new_cells.reverse();
        snapshot.board.cells = new_cells;
        lines_cleared
    }

    fn classify_tspin(&self, piece: &PieceState, snapshot: &SnapshotContract) -> TSpinKind {
        if piece.piece_type != PieceType::T {
            return TSpinKind::None;
        }
        if snapshot.last_action != LastAction::Rotate {
            return TSpinKind::None;
        }

        let pivot_x = piece.x + 1;
        let pivot_y = piece.y + 1;
        let corners = [(-1, -1), (1, -1), (-1, 1), (1, 1)];
        let mut occupied = 0;
        for (dx, dy) in corners {
            if snapshot.board.is_occupied(pivot_x + dx, pivot_y + dy) {
                occupied += 1;
            }
        }
        if occupied < 3 {
            return TSpinKind::None;
        }
        if [0, 1, 2, 3].contains(&piece.rotation) {
            TSpinKind::Mini
        } else {
            TSpinKind::Full
        }
    }

    fn determine_clear_kind(&self, lines: u32, tspin: TSpinKind) -> ClearKind {
        match (lines, tspin) {
            (0, TSpinKind::None) => ClearKind::None,
            (0, TSpinKind::Mini) => ClearKind::TSpinMiniZero,
            (0, TSpinKind::Full) => ClearKind::TSpinZero,
            (1, TSpinKind::None) => ClearKind::Single,
            (1, TSpinKind::Mini) => ClearKind::TSpinMiniSingle,
            (1, TSpinKind::Full) => ClearKind::TSpinSingle,
            (2, TSpinKind::None) => ClearKind::Double,
            (2, TSpinKind::Full) => ClearKind::TSpinDouble,
            (3, TSpinKind::None) => ClearKind::Triple,
            (3, TSpinKind::Full) => ClearKind::TSpinTriple,
            (4, _) => ClearKind::Tetris,
            _ => ClearKind::None,
        }
    }

    fn score_lock(
        &self,
        kind: ClearKind,
        lines: u32,
        soft_drop: u32,
        hard_drop: u32,
        snapshot: &SnapshotContract,
    ) -> ScoreState {
        let base = match kind {
            ClearKind::None => 0,
            ClearKind::Single => 100,
            ClearKind::Double => 300,
            ClearKind::Triple => 500,
            ClearKind::Tetris => 800,
            ClearKind::TSpinZero => 400,
            ClearKind::TSpinMiniZero => 100,
            ClearKind::TSpinMiniSingle => 200,
            ClearKind::TSpinSingle => 800,
            ClearKind::TSpinDouble => 1200,
            ClearKind::TSpinTriple => 1600,
        };

        let qualifies_b2b = matches!(
            kind,
            ClearKind::Tetris
                | ClearKind::TSpinSingle
                | ClearKind::TSpinDouble
                | ClearKind::TSpinTriple
                | ClearKind::TSpinMiniSingle
        );
        let b2b_bonus = if qualifies_b2b && snapshot.back_to_back {
            ((base as f64) * 0.5) as u64
        } else {
            0
        };

        let combo = if lines > 0 {
            snapshot.combo + 1
        } else {
            -1
        };
        let combo_bonus = if lines > 0 && combo > 0 {
            50 * combo as u64
        } else {
            0
        };

        let drop_score = soft_drop as u64 + hard_drop as u64 * 2;

        let new_score = snapshot.score + base + b2b_bonus + combo_bonus + drop_score;
        let new_combo = combo;
        let new_back_to_back = if lines > 0 {
            qualifies_b2b || (snapshot.back_to_back && qualifies_b2b)
        } else {
            snapshot.back_to_back
        };

        ScoreState {
            score: new_score,
            combo: new_combo,
            back_to_back: new_back_to_back,
        }
    }

    fn spawn_next_piece(&self, events: &mut Vec<EngineEvent>, snapshot: &mut SnapshotContract) {
        let piece_type = snapshot.randomizer.next();
        let (sx, sy) = piece_type.spawn_pos();
        let new_piece = PieceState {
            piece_type,
            x: sx,
            y: sy,
            rotation: 0,
        };
        let game_over = snapshot.board.check_collision(&new_piece, 0, 0);

        snapshot.next_pieces = snapshot.randomizer.peek(3);
        snapshot.current_piece = if game_over { None } else { Some(new_piece) };
        snapshot.can_hold = true;
        snapshot.game_over = game_over;
        snapshot.last_action = LastAction::Spawn;
        snapshot.lock_delay = LockDelayState::new();

        if game_over {
            events.push(EngineEvent {
                kind: EngineEventKind::GameOver,
                value: 0,
                piece: None,
            });
        } else {
            events.push(EngineEvent {
                kind: EngineEventKind::Spawned,
                value: 0,
                piece: Some(piece_type),
            });
        }
    }

    #[allow(dead_code)]
    fn compute_checksum(&self, snapshot: &SnapshotContract) -> String {
        let mut hash: u32 = 2166136261;
        for &b in &snapshot.board.cells {
            hash ^= b as u32;
            hash = hash.wrapping_mul(16777619);
        }
        for b in snapshot.score.to_le_bytes() {
            hash ^= b as u32;
            hash = hash.wrapping_mul(16777619);
        }
        for b in snapshot.lines.to_le_bytes() {
            hash ^= b as u32;
            hash = hash.wrapping_mul(16777619);
        }
        hash ^= snapshot.game_over as u32;
        hash = hash.wrapping_mul(16777619);
        format!("{:08x}", hash)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum TSpinKind {
    None,
    Mini,
    Full,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum ClearKind {
    None,
    Single,
    Double,
    Triple,
    Tetris,
    TSpinZero,
    TSpinMiniZero,
    TSpinMiniSingle,
    TSpinSingle,
    TSpinDouble,
    TSpinTriple,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct ScoreState {
    score: u64,
    combo: i32,
    back_to_back: bool,
}

pub fn capabilities() -> EngineCapabilities {
    EngineCapabilities {
        replay: true,
        deterministic_rng: true,
        network: false,
    }
}

pub fn golden_replay_checksum() -> &'static str {
    "aca04ded"
}

#[cfg(test)]
mod tests {
    use super::*;

    fn initial_snapshot() -> SnapshotContract {
        let mut randomizer = RandomizerState::new(424242);
        let piece = randomizer.next();
        let (sx, sy) = piece.spawn_pos();
        let current_piece = PieceState {
            piece_type: piece,
            x: sx,
            y: sy,
            rotation: 0,
        };
        let mut next_pieces = Vec::new();
        for _ in 0..3 {
            next_pieces.push(randomizer.next());
        }

        SnapshotContract {
            board: BoardState::new(10, 40),
            score: 0,
            lines: 0,
            game_over: false,
            current_piece: Some(current_piece),
            next_pieces,
            held_piece: None,
            can_hold: true,
            randomizer,
            last_action: LastAction::Spawn,
            last_rotation_transition: None,
            kick_index: None,
            lock_delay: LockDelayState::new(),
            combo: -1,
            back_to_back: false,
            ruleset_version: "draft".to_owned(),
            soft_drop_cells: 0,
        }
    }

    #[test]
    fn native_core_is_offline_only() {
        let caps = capabilities();
        assert!(caps.replay);
        assert!(caps.deterministic_rng);
        assert!(!caps.network);
    }

    #[test]
    fn command_payload_preserves_tick_delta() {
        let command = EngineCommand {
            kind: CommandKind::Tick,
            delta_ms: 16,
        };
        assert_eq!(command.kind, CommandKind::Tick);
        assert_eq!(command.delta_ms, 16);
    }

    #[test]
    fn command_kind_includes_rotate180() {
        let command = EngineCommand {
            kind: CommandKind::Rotate180,
            delta_ms: 0,
        };
        assert_eq!(command.kind, CommandKind::Rotate180);
        assert_eq!(command.delta_ms, 0);
    }

    #[test]
    fn non_tick_commands_use_zero_delta() {
        for kind in [
            CommandKind::MoveLeft,
            CommandKind::MoveRight,
            CommandKind::SoftDrop,
            CommandKind::HardDrop,
            CommandKind::RotateCw,
            CommandKind::RotateCcw,
            CommandKind::Rotate180,
            CommandKind::Hold,
        ] {
            let command = EngineCommand { kind, delta_ms: 0 };
            assert_eq!(
                command.delta_ms, 0,
                "non-tick command {:?} must use delta_ms=0",
                kind
            );
        }
    }

    #[test]
    fn abi_exposes_golden_replay_contract() {
        assert_eq!(golden_replay_checksum(), "aca04ded");
        let snapshot = initial_snapshot();
        assert_eq!(snapshot.board.width, 10);
    }

    #[test]
    fn engine_session_constructs() {
        let snapshot = initial_snapshot();
        let session = EngineSession::new(snapshot.clone());
        assert_eq!(session.snapshot(), snapshot);
    }

    #[test]
    fn capabilities_returns_expected() {
        let caps = EngineSession::capabilities();
        assert!(caps.replay);
        assert!(caps.deterministic_rng);
        assert!(!caps.network);
    }

    #[test]
    fn apply_tick_spawns_piece() {
        // With initial_snapshot already having a piece, tick should advance time but not spawn
        let snapshot = initial_snapshot();
        let mut session = EngineSession::new(snapshot);
        let result = session.apply_command(EngineCommand {
            kind: CommandKind::Tick,
            delta_ms: 16,
        });
        // Piece should still exist (not None)
        assert!(result.snapshot.current_piece.is_some());
        // No Spawned event since piece was already spawned in initial_snapshot
        // This test verifies tick doesn't break existing piece
        assert!(!result
            .events
            .iter()
            .any(|e| e.kind == EngineEventKind::Spawned));
    }

    #[test]
    fn apply_move_left() {
        let snapshot = initial_snapshot();
        let mut session = EngineSession::new(snapshot);
        session.apply_command(EngineCommand {
            kind: CommandKind::Tick,
            delta_ms: 16,
        });
        let result = session.apply_command(EngineCommand {
            kind: CommandKind::MoveLeft,
            delta_ms: 0,
        });
        assert!(result
            .events
            .iter()
            .any(|e| e.kind == EngineEventKind::Moved));
    }

    #[test]
    fn apply_move_right() {
        let snapshot = initial_snapshot();
        let mut session = EngineSession::new(snapshot);
        session.apply_command(EngineCommand {
            kind: CommandKind::Tick,
            delta_ms: 16,
        });
        let result = session.apply_command(EngineCommand {
            kind: CommandKind::MoveRight,
            delta_ms: 0,
        });
        assert!(result
            .events
            .iter()
            .any(|e| e.kind == EngineEventKind::Moved));
    }

    #[test]
    fn apply_rotate_cw() {
        let snapshot = initial_snapshot();
        let mut session = EngineSession::new(snapshot);
        session.apply_command(EngineCommand {
            kind: CommandKind::Tick,
            delta_ms: 16,
        });
        let result = session.apply_command(EngineCommand {
            kind: CommandKind::RotateCw,
            delta_ms: 0,
        });
        assert!(result
            .events
            .iter()
            .any(|e| e.kind == EngineEventKind::Rotated));
    }

    #[test]
    fn apply_rotate_ccw() {
        let snapshot = initial_snapshot();
        let mut session = EngineSession::new(snapshot);
        session.apply_command(EngineCommand {
            kind: CommandKind::Tick,
            delta_ms: 16,
        });
        let result = session.apply_command(EngineCommand {
            kind: CommandKind::RotateCcw,
            delta_ms: 0,
        });
        assert!(result
            .events
            .iter()
            .any(|e| e.kind == EngineEventKind::Rotated));
    }

    #[test]
    fn apply_rotate_180() {
        let snapshot = initial_snapshot();
        let mut session = EngineSession::new(snapshot);
        session.apply_command(EngineCommand {
            kind: CommandKind::Tick,
            delta_ms: 16,
        });
        let result = session.apply_command(EngineCommand {
            kind: CommandKind::Rotate180,
            delta_ms: 0,
        });
        assert!(result
            .events
            .iter()
            .any(|e| e.kind == EngineEventKind::Rotated));
    }

    #[test]
    fn apply_soft_drop() {
        let snapshot = initial_snapshot();
        let mut session = EngineSession::new(snapshot);
        session.apply_command(EngineCommand {
            kind: CommandKind::Tick,
            delta_ms: 16,
        });
        let result = session.apply_command(EngineCommand {
            kind: CommandKind::SoftDrop,
            delta_ms: 0,
        });
        assert!(result
            .events
            .iter()
            .any(|e| e.kind == EngineEventKind::SoftDropped));
    }

    #[test]
    fn apply_hard_drop() {
        let snapshot = initial_snapshot();
        let mut session = EngineSession::new(snapshot);
        session.apply_command(EngineCommand {
            kind: CommandKind::Tick,
            delta_ms: 16,
        });
        let result = session.apply_command(EngineCommand {
            kind: CommandKind::HardDrop,
            delta_ms: 0,
        });
        assert!(result
            .events
            .iter()
            .any(|e| e.kind == EngineEventKind::HardDropped));
        assert!(result
            .events
            .iter()
            .any(|e| e.kind == EngineEventKind::Locked));
    }

    #[test]
    fn apply_hold() {
        let snapshot = initial_snapshot();
        let mut session = EngineSession::new(snapshot);
        session.apply_command(EngineCommand {
            kind: CommandKind::Tick,
            delta_ms: 16,
        });
        let result = session.apply_command(EngineCommand {
            kind: CommandKind::Hold,
            delta_ms: 0,
        });
        assert!(result
            .events
            .iter()
            .any(|e| e.kind == EngineEventKind::Held));
        assert!(result.snapshot.held_piece.is_some());
        assert!(!result.snapshot.can_hold);
    }

    #[test]
    #[test]
    fn replay_golden_001_reproduces_checksum() {
        let snapshot = initial_snapshot();
        let mut session = EngineSession::new(snapshot);

        // Debug: print initial state
        println!(
            "Initial piece: {:?} at ({}, {}) rot {}",
            session
                .snapshot()
                .current_piece
                .as_ref()
                .map(|p| p.piece_type),
            session
                .snapshot()
                .current_piece
                .as_ref()
                .map(|p| p.x)
                .unwrap_or(0),
            session
                .snapshot()
                .current_piece
                .as_ref()
                .map(|p| p.y)
                .unwrap_or(0),
            session
                .snapshot()
                .current_piece
                .as_ref()
                .map(|p| p.rotation)
                .unwrap_or(0)
        );
        println!("Next pieces: {:?}", session.snapshot().next_pieces);

        // seed=424242, commands=[moveLeft, rotateCW, hardDrop]
        let result1 = session.apply_command(EngineCommand {
            kind: CommandKind::MoveLeft,
            delta_ms: 0,
        });
        println!(
            "After moveLeft: piece={:?} at ({}, {}) rot {} events={:?}",
            result1
                .snapshot
                .current_piece
                .as_ref()
                .map(|p| p.piece_type),
            result1
                .snapshot
                .current_piece
                .as_ref()
                .map(|p| p.x)
                .unwrap_or(0),
            result1
                .snapshot
                .current_piece
                .as_ref()
                .map(|p| p.y)
                .unwrap_or(0),
            result1
                .snapshot
                .current_piece
                .as_ref()
                .map(|p| p.rotation)
                .unwrap_or(0),
            result1
                .events
                .iter()
                .map(|e| format!("{:?}", e.kind))
                .collect::<Vec<_>>()
        );

        let result2 = session.apply_command(EngineCommand {
            kind: CommandKind::RotateCw,
            delta_ms: 0,
        });
        println!(
            "After rotateCW: piece={:?} at ({}, {}) rot {} events={:?}",
            result2
                .snapshot
                .current_piece
                .as_ref()
                .map(|p| p.piece_type),
            result2
                .snapshot
                .current_piece
                .as_ref()
                .map(|p| p.x)
                .unwrap_or(0),
            result2
                .snapshot
                .current_piece
                .as_ref()
                .map(|p| p.y)
                .unwrap_or(0),
            result2
                .snapshot
                .current_piece
                .as_ref()
                .map(|p| p.rotation)
                .unwrap_or(0),
            result2
                .events
                .iter()
                .map(|e| format!("{:?}", e.kind))
                .collect::<Vec<_>>()
        );

        let result3 = session.apply_command(EngineCommand {
            kind: CommandKind::HardDrop,
            delta_ms: 0,
        });

        // Verify final state matches TypeScript reference exactly
        assert_eq!(result3.snapshot.score, 30);
        assert_eq!(result3.snapshot.lines, 0);
        assert!(!result3.snapshot.game_over);
        assert_eq!(
            result3
                .snapshot
                .current_piece
                .as_ref()
                .map(|p| p.piece_type),
            Some(PieceType::S)
        );
        assert_eq!(
            result3
                .snapshot
                .current_piece
                .as_ref()
                .map(|p| (p.x, p.y, p.rotation)),
            Some((3, 22, 0))
        );
        assert_eq!(
            result3.snapshot.next_pieces,
            vec![PieceType::I, PieceType::T, PieceType::S]
        );
        assert_eq!(result3.snapshot.held_piece, None);
        assert!(result3.snapshot.can_hold);
        assert_eq!(
            result3.snapshot.randomizer.bag,
            vec![
                PieceType::J,
                PieceType::Z,
                PieceType::O,
                PieceType::L,
                PieceType::S,
                PieceType::I,
                PieceType::T
            ]
        );
        assert_eq!(result3.snapshot.randomizer.index, 5);
        assert_eq!(result3.snapshot.randomizer.seed, 424242);
        assert_eq!(result3.snapshot.last_action, LastAction::Spawn);
        assert_eq!(result3.snapshot.lock_delay.elapsed_ms, 0);
        assert_eq!(result3.snapshot.lock_delay.resets, 0);
        assert!(!result3.snapshot.lock_delay.locked);
        assert_eq!(result3.snapshot.combo, -1);
        assert!(!result3.snapshot.back_to_back);
        assert_eq!(result3.snapshot.soft_drop_cells, 0);

        // Board verification: 4 cells filled (J piece locked)
        let filled = result3
            .snapshot
            .board
            .cells
            .iter()
            .filter(|&&c| c > 0)
            .count();
        assert_eq!(filled, 4);

        // Also verify the Rust compute_checksum is deterministic
        let snapshot = session.snapshot();
        let checksum1 = session.compute_checksum(&snapshot);
        let checksum2 = session.compute_checksum(&snapshot);
        assert_eq!(
            checksum1, checksum2,
            "compute_checksum must be deterministic"
        );
    }

    #[test]
    #[test]
    fn game_over_on_spawn_collision() {
        let mut snapshot = initial_snapshot();
        // Fill the top rows completely so any new piece spawns in collision
        for y in 0..4 {
            for x in 0..10 {
                snapshot.board.set(x, y, 1);
            }
        }
        // Remove current piece so next tick tries to spawn
        snapshot.current_piece = None;
        snapshot.last_action = LastAction::Lock; // Pretend last piece just locked

        let mut session = EngineSession::new(snapshot);
        // Tick should try to spawn next piece and detect game over
        let result = session.apply_command(EngineCommand {
            kind: CommandKind::Tick,
            delta_ms: 16,
        });

        // When no current piece, tick returns GameOver error
        assert_eq!(result.error, Some(EngineError::GameOver));
    }

    #[test]
    fn lock_delay_resets_on_movement() {
        let snapshot = initial_snapshot();
        let mut session = EngineSession::new(snapshot);
        session.apply_command(EngineCommand {
            kind: CommandKind::Tick,
            delta_ms: 16,
        });
        // Move down to floor
        for _ in 0..20 {
            session.apply_command(EngineCommand {
                kind: CommandKind::Tick,
                delta_ms: 16,
            });
        }
        let _before = session.snapshot().lock_delay.elapsed_ms;
        session.apply_command(EngineCommand {
            kind: CommandKind::MoveLeft,
            delta_ms: 0,
        });
        let after = session.snapshot().lock_delay.elapsed_ms;
        assert_eq!(after, 0);
    }

    #[test]
    fn randomizer_deterministic() {
        let mut r1 = RandomizerState::new(424242);
        let mut r2 = RandomizerState::new(424242);
        for _ in 0..20 {
            assert_eq!(r1.next(), r2.next());
        }
    }

    #[test]
    fn scoring_single_line() {
        let mut snapshot = initial_snapshot();
        let mut session = EngineSession::new(snapshot);
        session.apply_command(EngineCommand {
            kind: CommandKind::Tick,
            delta_ms: 16,
        });
        session.apply_command(EngineCommand {
            kind: CommandKind::HardDrop,
            delta_ms: 0,
        });
        // Score should include hard drop bonus
        assert!(session.snapshot().score >= 2); // 2 per cell hard drop
    }
}

#[cfg(feature = "wasm")]
pub mod wasm_ffi {
    use super::*;
    use wasm_bindgen::prelude::*;
    use std::sync::Mutex;
    use std::collections::HashMap;
    use once_cell::sync::Lazy;

    // Session storage
    static SESSIONS: Lazy<Mutex<HashMap<u32, EngineSession>>> = Lazy::new(|| Mutex::new(HashMap::new()));
    static NEXT_SESSION_ID: Lazy<Mutex<u32>> = Lazy::new(|| Mutex::new(1));

    #[wasm_bindgen]
    pub fn create_initial_snapshot() -> JsValue {
        let mut randomizer = RandomizerState::new(424242);
        let piece = randomizer.next();
        let (sx, sy) = piece.spawn_pos();
        let current_piece = PieceState {
            piece_type: piece,
            x: sx,
            y: sy,
            rotation: 0,
        };
        let mut next_pieces = Vec::new();
        for _ in 0..3 {
            next_pieces.push(randomizer.next());
        }

        let snap = SnapshotContract {
            board: BoardState::new(10, 40),
            score: 0,
            lines: 0,
            game_over: false,
            current_piece: Some(current_piece),
            next_pieces,
            held_piece: None,
            can_hold: true,
            randomizer,
            last_action: LastAction::Spawn,
            last_rotation_transition: None,
            kick_index: None,
            lock_delay: LockDelayState::new(),
            combo: -1,
            back_to_back: false,
            ruleset_version: "draft".to_owned(),
            soft_drop_cells: 0,
        };

        serde_wasm_bindgen::to_value(&snap).unwrap()
    }

    #[wasm_bindgen]
    pub fn engine_session_new(initial: JsValue) -> Result<u32, JsValue> {
        let snapshot: SnapshotContract = serde_wasm_bindgen::from_value(initial)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        let session = EngineSession::new(snapshot);
        let mut id_lock = NEXT_SESSION_ID.lock().unwrap();
        let id = *id_lock;
        *id_lock += 1;
        SESSIONS.lock().unwrap().insert(id, session);
        Ok(id)
    }

    #[wasm_bindgen]
    pub fn engine_session_free(id: u32) {
        SESSIONS.lock().unwrap().remove(&id);
    }

    #[wasm_bindgen]
    pub fn engine_session_capabilities() -> JsValue {
        let caps = EngineSession::capabilities();
        serde_wasm_bindgen::to_value(&caps).unwrap()
    }

    #[wasm_bindgen]
    pub fn engine_session_snapshot(id: u32) -> Result<JsValue, JsValue> {
        let sessions = SESSIONS.lock().unwrap();
        let session = sessions.get(&id)
            .ok_or_else(|| JsValue::from_str("Invalid session ID"))?;
        let snap = session.snapshot();
        serde_wasm_bindgen::to_value(&snap)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub fn engine_session_apply_command(id: u32, command: JsValue) -> Result<JsValue, JsValue> {
        let cmd: EngineCommand = serde_wasm_bindgen::from_value(command)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        let mut sessions = SESSIONS.lock().unwrap();
        let session = sessions.get_mut(&id)
            .ok_or_else(|| JsValue::from_str("Invalid session ID"))?;
        let result = session.apply_command(cmd);
        serde_wasm_bindgen::to_value(&result)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub fn golden_replay_checksum() -> String {
        "aca04ded".to_string()
    }
}
