/// Eternal Chess — each finished game is minted as an ownable Sui object whose
/// replay artifacts (PGN, board image, move log) live on Walrus. The object's
/// `image_url` Display field points directly at a Walrus blob, so explorers and
/// wallets render the game straight from decentralized storage.
module eternal_chess::eternal_chess {
    use std::string::{Self, String};
    use sui::display;
    use sui::package;
    use sui::event;

    /// One-time witness for claiming the Publisher and setting up Display.
    public struct ETERNAL_CHESS has drop {}

    /// An eternalized chess game. Owned, transferable, verifiable.
    public struct EternalGame has key, store {
        id: UID,
        player: address,
        white: String,
        black: String,
        result: String,        // "1-0" | "0-1" | "1/2-1/2"
        winner: String,         // winner label/address, or "draw"
        move_count: u64,
        played_at: u64,         // client millis timestamp
        pgn_blob_id: String,    // Walrus blob: full PGN
        board_blob_id: String,  // Walrus blob: final board PNG
        moves_blob_id: String,  // Walrus blob: move-by-move JSON
        image_url: String,      // Walrus aggregator URL of the board PNG
    }

    /// Emitted whenever a game is eternalized — handy for indexers/leaderboards.
    public struct GameEternalized has copy, drop {
        object_id: ID,
        player: address,
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
                b"A chess game frozen forever on Sui + Walrus. Result {result} in {move_count} moves. Replay & proof are stored as decentralized Walrus blobs."
            ),
            string::utf8(b"{image_url}"),
            string::utf8(b"https://walrus.xyz"),
        ];

        let mut disp = display::new_with_fields<EternalGame>(
            &publisher, keys, values, ctx
        );
        display::update_version(&mut disp);

        transfer::public_transfer(publisher, ctx.sender());
        transfer::public_transfer(disp, ctx.sender());
    }

    /// Mint an EternalGame from a finished match and transfer it to the player.
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
        ctx: &mut TxContext,
    ) {
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
        };

        event::emit(GameEternalized {
            object_id: object::id(&game),
            player: ctx.sender(),
        });

        transfer::public_transfer(game, ctx.sender());
    }
}
