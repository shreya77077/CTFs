const web3 = require('@solana/web3.js');
const fs = require('fs');

// Connect to local blockchain
const connection = new web3.Connection("http://localhost:8899", "confirmed");

// Load your wallet keypair
const payer = web3.Keypair.fromSecretKey(
    Uint8Array.from(
        JSON.parse(fs.readFileSync('/Users/shreyagupta/.config/solana/id.json'))
    )
);

// Your deployed Program ID
const programId = new web3.PublicKey('9YiXuCK1NrjP8gthvEt19zBm77X1edDuECvwTUVtMmLx');

async function main() {
    console.log("Starting PoC exploit...");

    const gameConfig = await createGameConfig(5); // 5 credits per level
    const user = await createUser(gameConfig);

    console.log("🧨 Attack setup done (GameConfig + User accounts created)");

    // // Get basic info about program
    // const programInfo = await connection.getAccountInfo(programId);

    // console.log("Program Account Info:", programInfo);

    // // ⚡ Here we'll craft malicious transactions next
}

main().catch((err) => {
    console.error(err);
});

async function createGameConfig(creditsPerLevel) {
    console.log("🛠️ Creating GameConfig...");

    const gameConfig = web3.Keypair.generate();

    const lamports = await connection.getMinimumBalanceForRentExemption(36); // Approx size of GameConfig struct

    const transaction = new web3.Transaction();

    transaction.add(
        web3.SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: gameConfig.publicKey,
            lamports,
            space: 36,
            programId: programId,
        })
    );

    await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, gameConfig]
    );

    console.log("✅ GameConfig created at:", gameConfig.publicKey.toBase58());
    return gameConfig.publicKey;
}

async function createUser(gameConfigPubkey) {
    console.log("🛠️ Creating User...");

    const user = web3.Keypair.generate();

    const lamports = await connection.getMinimumBalanceForRentExemption(48); // Approx size of User struct

    const transaction = new web3.Transaction();

    transaction.add(
        web3.SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: user.publicKey,
            lamports,
            space: 48,
            programId: programId,
        })
    );

    await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, user]
    );

    console.log("✅ User created at:", user.publicKey.toBase58());
    return user.publicKey;
}

