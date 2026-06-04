/// Eternal Chess — upgraded contract with 6-tier trophy system and scarcity gates.
///
/// Trophy tiers (stored on-chain):
///   0 = Bronze    — any valid game ≥ 25 moves
///   1 = Silver    — checkmate in ≥ 50 moves
///   2 = Gold      — checkmate in ≥ 80 moves vs Hard AI or any human
///   3 = Diamond   — checkmate vs human in ≥ 60 moves
///   4 = Legendary — checkmate vs human in ≥ 100 moves
///   5 = Emeritus  — checkmate vs human in ≥ 150 moves (near impossible — ultimate rarity)
module eternal_chess::eternal_chess {
    use std::string::{Self, String};
    use sui::display;
    use sui::package;
    use sui::event;

    const E_TOO_FEW_MOVES: u64 = 1;

    /// One-time witness for Publisher + Display setup.
    public struct ETERNAL_CHESS has drop {}

    /// Represents a single eternalized chess game. Owned, transferable, tradeable.
    public struct EternalGame has key, store {
        id: UID,
        player: address,
        white: String,
        black: String,
        result: String,          // "1-0" | "0-1" | "1/2-1/2"
        winner: String,          // winner label / address / "draw"
        move_count: u64,
        played_at: u64,          // client millis timestamp
        pgn_blob_id: String,     // Walrus blob: full PGN
        board_blob_id: String,   // Walrus blob: final board PNG
        moves_blob_id: String,   // Walrus blob: move-by-move JSON
        image_url: String,       // Walrus aggregator URL (NFT image)
        trophy: u8,              // 0=Bronze 1=Silver 2=Gold 3=Diamond 4=Legendary 5=Emeritus
        is_online: bool,         // true = real human opponent
        difficulty: String,      // "easy" | "medium" | "hard" | "human"
    }

    /// Emitted on every mint — useful for indexers, leaderboards, feeds.
    public struct GameEternalized has copy, drop {
        object_id: ID,
        player: address,
        trophy: u8,
        is_online: bool,
        move_count: u64,
    }

    fun init(otw: ETERNAL_CHESS, ctx: &mut TxContext) {
        let publisher = package::claim(otw, ctx);

        let keys = vector[
            string::utf8(b"name"),
            string::utf8(b"description"),
            string::utf8(b"image_url"),
            string::utf8(b"project_url"),
        ];

        let values = vector[
            string::utf8(b"Eternal Chess — {white} vs {black}"),
            string::utf8(
                b"A chess game frozen forever on Sui + Walrus. Result: {result} in {move_count} moves. Trophy: {trophy}. Replay & proof stored as decentralized Walrus blobs."
            ),
            string::utf8(b"{image_url}"),
            string::utf8(b"https://walrus.xyz"),
        ];

        let mut disp = display::new_with_fields<EternalGame>(&publisher, keys, values, ctx);
        display::update_version(&mut disp);

        transfer::public_transfer(publisher, ctx.sender());
        transfer::public_transfer(disp, ctx.sender());
    }

    /// Compute trophy tier from game metadata.
    /// Evaluated top-down — highest qualifying tier wins.
    fun compute_trophy(move_count: u64, result: &String, is_online: bool, difficulty: &String): u8 {
        let is_checkmate = result == &string::utf8(b"1-0") || result == &string::utf8(b"0-1");
        let is_hard = difficulty == &string::utf8(b"hard");

        // 5 — Emeritus: checkmate vs human, ≥ 150 moves
        if (is_online && is_checkmate && move_count >= 150) { return 5 };

        // 4 — Legendary: checkmate vs human, ≥ 100 moves
        if (is_online && is_checkmate && move_count >= 100) { return 4 };

        // 3 — Diamond: checkmate vs human, ≥ 60 moves
        if (is_online && is_checkmate && move_count >= 60) { return 3 };

        // 2 — Gold: checkmate in ≥ 80 moves vs Hard AI, OR any checkmate vs human
        if (is_checkmate && move_count >= 80 && (is_hard || is_online)) { return 2 };

        // 1 — Silver: checkmate in ≥ 50 moves (any mode)
        if (is_checkmate && move_count >= 50) { return 1 };

        // 0 — Bronze: at least 25 moves played
        0
    }

    /// Mint an EternalGame — requires at least 25 moves.
    public entry fun eternalize(
        white: String,
        black: String,
        result: String,
        winner: String,
        move_count: u64,
        played_at: u64,
        pgn_blob_id: String,
        board_blob_id: String,
        moves_blob_id: String,
        image_url: String,
        is_online: bool,
        difficulty: String,
        ctx: &mut TxContext,
    ) {
        assert!(move_count >= 25, E_TOO_FEW_MOVES);

        let trophy = compute_trophy(move_count, &result, is_online, &difficulty);

        let game = EternalGame {
            id: object::new(ctx),
            player: ctx.sender(),
            white,
            black,
            result,
            winner,
            move_count,
            played_at,
            pgn_blob_id,
            board_blob_id,
            moves_blob_id,
            image_url,
            trophy,
            is_online,
            difficulty,
        };

        event::emit(GameEternalized {
            object_id: object::id(&game),
            player: ctx.sender(),
            trophy,
            is_online,
            move_count,
        });

        transfer::public_transfer(game, ctx.sender());
    }

    /// Allow the owner to transfer their EternalGame NFT to another address.
    public entry fun transfer_game(game: EternalGame, recipient: address) {
        transfer::public_transfer(game, recipient);
    }

    // ── Read-only accessors (for composability with other contracts) ──────────

    public fun trophy(game: &EternalGame): u8 { game.trophy }
    public fun move_count(game: &EternalGame): u64 { game.move_count }
    public fun is_online(game: &EternalGame): bool { game.is_online }
    public fun result(game: &EternalGame): &String { &game.result }
    public fun player(game: &EternalGame): address { game.player }
    public fun difficulty(game: &EternalGame): &String { &game.difficulty }
}
