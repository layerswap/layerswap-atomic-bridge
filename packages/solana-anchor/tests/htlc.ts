import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import * as spl from '@solana/spl-token';
//import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { AnchorHtlc } from '../target/types/anchor_htlc';

interface PDAParameters {
    htlcWalletKey: anchor.web3.PublicKey;
    htlcKey: anchor.web3.PublicKey;
    htlcBump: number;
    phtlcWalletKey: anchor.web3.PublicKey;
    phtlcKey: anchor.web3.PublicKey;
    phtlcBump: number;
}

describe("safe_pay", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.AnchorHtlc as anchor.Program<AnchorHtlc>;

    const wallet = provider.wallet as anchor.Wallet;
    const SECRET = "0x005";
    const HASHLOCK = "a09fa0c7461b716cee457fd9e2c58ee9ef456386702a9ce3d64abc805ded033a";
    //const HASHLOCK = "0811a189c16ceadfc5b51f886b3ac267a1810d3";
    const HTLCID = HASHLOCK.slice(0, 32);
    console.log(`${HTLCID} ID`);
    const PHTLCID = new anchor.BN(41);
    //const TIMELOCK = new anchor.BN(Date.now() - 3);
    const AMOUNT = 1 * anchor.web3.LAMPORTS_PER_SOL;
    const CHAIN = "23";
    const ASSET = "1";
    const vecChain = [CHAIN];
    const vecAsset = [ASSET];
    const TARGETCURRENCYRECEIVERADDRESS = "0x11";
    const lpPath = [TARGETCURRENCYRECEIVERADDRESS];


    let tokenMint: anchor.web3.PublicKey;
    let alice: anchor.web3.Keypair;
    let aliceWallet: anchor.web3.PublicKey;
    let bob: anchor.web3.Keypair;

    let pda: PDAParameters;

    const getPdaParams = async (
        htlcId: string,
        phtlcId: anchor.BN,
    ): Promise<PDAParameters> => {
        let seed = Buffer.from(htlcId);
        let pseed = phtlcId.toBuffer('le', 8);
        let [htlc, htlcBump] = await anchor.web3.PublicKey.findProgramAddressSync(
            [seed],
            program.programId
        );
        let [htlcPubKey, bump2] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from("htlc_account"), seed],
            program.programId
        );
        console.log(`[${htlc}] derived htlc`);
        console.log(`[${htlcPubKey}] derived key`);

        let [phtlc, phtlcBump] = await anchor.web3.PublicKey.findProgramAddressSync(
            [pseed],
            program.programId
        );
        let [phtlcPubKey, bump3] = await anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("phtlc_account"), pseed],
            program.programId
        );
        console.log(`[${phtlc}] derived phtlc`);
        console.log(`[${phtlcPubKey}] derived pre-key`);
        return {
            htlcWalletKey: htlcPubKey,
            htlcKey: htlc,
            htlcBump,
            phtlcWalletKey: phtlcPubKey,
            phtlcKey: phtlc,
            phtlcBump,
        };
    };

    const createMint = async (): Promise<anchor.web3.PublicKey> => {
        const tokenMint = new anchor.web3.Keypair();
        const lamportsForMint = await provider.connection.getMinimumBalanceForRentExemption(spl.MintLayout.span);
        let tx = new anchor.web3.Transaction();

        // Allocate mint
        tx.add(
            anchor.web3.SystemProgram.createAccount({
                programId: spl.TOKEN_PROGRAM_ID,
                space: spl.MintLayout.span,
                fromPubkey: provider.wallet.publicKey,
                newAccountPubkey: tokenMint.publicKey,
                lamports: lamportsForMint,
            })
        );
        // Allocate wallet account
        tx.add(
            spl.createInitializeMintInstruction(tokenMint.publicKey, 6, provider.wallet.publicKey, provider.wallet.publicKey)
        );
        const signature = await provider.sendAndConfirm(tx, [tokenMint]);

        console.log(`[${tokenMint.publicKey}] Created new token mint at ${signature}`);
        return tokenMint.publicKey;
    };

    const createUserAndAssociatedWallet = async (
        mint?: anchor.web3.PublicKey
    ): Promise<[anchor.web3.Keypair, anchor.web3.PublicKey | undefined]> => {
        const user = new anchor.web3.Keypair();
        let userAssociatedTokenAccount: anchor.web3.PublicKey | undefined = undefined;

        // Fund user with some SOL
        let txFund = new anchor.web3.Transaction();
        txFund.add(
            anchor.web3.SystemProgram.transfer({
                fromPubkey: provider.wallet.publicKey,
                toPubkey: user.publicKey,
                lamports: 0.05 * anchor.web3.LAMPORTS_PER_SOL,
            })
        );
        const sigTxFund = await provider.sendAndConfirm(txFund);
        console.log(`[${user.publicKey.toBase58()}] Funded new account with 0.005 SOL: ${sigTxFund}`);

        if (mint) {
            // Create a token account for the user and mint some tokens
            userAssociatedTokenAccount = await spl.getAssociatedTokenAddress(mint, user.publicKey);
            const txFundTokenAccount = new anchor.web3.Transaction();
            txFundTokenAccount.add(
                spl.createAssociatedTokenAccountInstruction(
                    provider.wallet.publicKey,
                    userAssociatedTokenAccount,
                    user.publicKey,
                    mint
                )
            );
            txFundTokenAccount.add(spl.createMintToInstruction(mint, userAssociatedTokenAccount, provider.wallet.publicKey, 1337000000));
            const txFundTokenSig = await provider.sendAndConfirm(txFundTokenAccount);//, [user]);
            console.log(`[${userAssociatedTokenAccount.toBase58()}] New associated account for mint ${mint.toBase58()}: ${txFundTokenSig}`);
        }
        return [user, userAssociatedTokenAccount];
    };

    const readAccount = async (
        accountPublicKey: anchor.web3.PublicKey,
        provider: anchor.AnchorProvider
    ): Promise<[spl.RawAccount, string]> => {
        const tokenInfo = await provider.connection.getAccountInfo(accountPublicKey);
        const data = Buffer.from(tokenInfo.data);
        const accountInfo = spl.AccountLayout.decode(data);
        // Convert amount from buffer to bigint, then to anchor.BN
        const amount = accountInfo.amount;
        return [accountInfo, amount.toString()];
    };
    function wait(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    before(async () => {
        tokenMint = await createMint();
        [alice, aliceWallet] = await createUserAndAssociatedWallet(tokenMint);

        let _rest;
        [bob, ..._rest] = await createUserAndAssociatedWallet();

        pda = await getPdaParams(HTLCID, PHTLCID);
    });
    it("create prehtlc", async () => {
        const [, aliceBalancePre] = await readAccount(aliceWallet, provider);
        assert.equal(aliceBalancePre, "1337000000");

        const amount = new anchor.BN(20000000);

        // Initialize mint account and fund the account
        const TIME = new Date().getTime();
        const TIMELOC = (TIME + 2500) / 1000;
        const TIMELOCK = new anchor.BN(TIMELOC);
        console.log(`[${TIMELOC * 1000}] the Timelock`);
        const tx1 = await program.methods
            .createP(PHTLCID, vecChain, vecAsset, lpPath, CHAIN, ASSET, TARGETCURRENCYRECEIVERADDRESS, ASSET, TIMELOCK, pda.phtlcKey, new anchor.BN(AMOUNT), pda.phtlcBump)
            .accountsPartial({
                phtlc: pda.phtlcKey,
                phtlcTokenAccount: pda.phtlcWalletKey,
                sender: alice.publicKey,
                receiver: bob.publicKey,
                tokenContract: tokenMint,
                senderTokenAccount: aliceWallet
            })
            .signers([alice])
            .rpc();
        console.log(`Initialized a new PHTLC. Alice will pay bob 20 tokens`);

        // await wait(3000);
        // const CURTIME = new Date().getTime() / 1000;
        // console.log(`[${CURTIME * 1000}] CURRENT TIME`);
        // const tx2 = await program.methods.refundP(PHTLCID, pda.phtlcBump).
        //   accountsPartial({
        //     phtlc: pda.phtlcKey,
        //     phtlcTokenAccount: pda.phtlcWalletKey,
        //     // userSigning: alice.publicKey,
        //     userSigning: wallet.publicKey,
        //     sender: alice.publicKey,
        //     tokenContract: tokenMint,
        //     senderTokenAccount: aliceWallet,
        //   })
        //   .signers([wallet.payer])
        //   .rpc();
        // console.log(`can refundp`);

        const tx2 = await program.methods.convert(PHTLCID, HTLCID, HASHLOCK, pda.phtlcBump).
            accountsPartial({
                phtlc: pda.phtlcKey,
                htlc: pda.htlcKey,
                phtlcTokenAccount: pda.phtlcWalletKey,
                htlcTokenAccount: pda.htlcWalletKey,
                // userSigning: alice.publicKey,
                userSigning: alice.publicKey,
                tokenContract: tokenMint,
            })
            .signers([alice])
            .rpc(
            //   {
            //   skipPreflight: true
            // }
        );//.catch(e => console.error(e));
        console.log(`can convert`);

        console.log(`Bob token`);
        // Create a token account for Bob.

        const bobTokenAccount = await spl.getAssociatedTokenAddress(
            tokenMint,
            bob.publicKey
        )
        const details = await program.methods.getDetails(HTLCID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).rpc();
        console.log(`${details} details`);
        const tx3 = await program.methods.redeem(HTLCID, SECRET, pda.htlcBump).
            accountsPartial({
                htlc: pda.htlcKey,
                htlcTokenAccount: pda.htlcWalletKey,
                sender: alice.publicKey,
                userSigning: alice.publicKey,
                receiver: bob.publicKey,
                tokenContract: tokenMint,
                receiverTokenAccount: bobTokenAccount,

            })
            .signers([alice])
            .rpc();

        // const tx3 = await program.methods
        //   .create(HTLCID, HASHLOCK, TIMELOCK, new anchor.BN(AMOUNT), CHAIN, TARGETCURRENCYRECEIVERADDRESS, PHTLCID, pda.htlcKey, pda.htlcBump)
        //   .accountsPartial({
        //     htlc: pda.htlcKey,
        //     htlcTokenAccount: pda.htlcWalletKey,
        //     sender: alice.publicKey,
        //     receiver: bob.publicKey,
        //     tokenContract: tokenMint,
        //     senderTokenAccount: aliceWallet
        //   })
        //   .signers([alice])
        //   .rpc();

        // const [, aliceBalancePost] = await readAccount(aliceWallet, provider);
        // assert.equal(aliceBalancePost, "337000000");
        // const [, escrowBalancePost] = await readAccount(pda.htlcWalletKey, provider);
        // assert.equal(escrowBalancePost, "1000000000");

        //const details = await program.methods.getDetails(HTLCID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).rpc();
        // Withdraw the funds back



        // await wait(3000);
        // const CURTIME = new Date().getTime() / 1000;
        // console.log(`[${CURTIME * 1000}] CURRENT TIME`);
        // const tx2 = await program.methods.refundP(PHTLCID, pda.phtlcBump).
        //   accountsPartial({
        //     phtlc: pda.phtlcKey,
        //     phtlcTokenAccount: pda.phtlcWalletKey,
        //     // userSigning: alice.publicKey,
        //     userSigning: wallet.publicKey,
        //     sender: alice.publicKey,
        //     tokenContract: tokenMint,
        //     senderTokenAccount: aliceWallet,
        //   })
        //   .signers([wallet.payer])
        //   .rpc();


        // // Assert that 20 tokens were sent back.
        // const postdetails = await program.methods.getDetails(HTLCID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).rpc();

        // const [, aliceBalanceRefund] = await readAccount(aliceWallet, provider);
        // assert.equal(aliceBalanceRefund, "1337000000");

        // // Assert that escrow was correctly closed.
        // try {
        //   await readAccount(pda.htlcWalletKey, provider);
        //   return assert.fail("Account should be closed");
        // } catch (e) {
        //   assert.equal(e.message, "Cannot read properties of null (reading 'data')");
        // }

    });



    // it("Bob can redeem", async () => {
    //   const [, aliceBalancePre] = await readAccount(aliceWallet, provider);
    //   assert.equal(aliceBalancePre, "1337000000");

    //   const amount = new anchor.BN(20000000);
    //   const TIME = new Date().getTime();
    //   const TIMELOC = (TIME + 2500) / 1000;
    //   const TIMELOCK = new anchor.BN(TIMELOC);
    //   console.log(`[${TIMELOC * 1000}] the Timelock`);
    //   const tx1 = await program.methods
    //     .create(HTLCID, HASHLOCK, TIMELOCK, new anchor.BN(AMOUNT), CHAIN, TARGETCURRENCYRECEIVERADDRESS, PHTLCID, alice.publicKey, pda.htlcBump)
    //     .accounts({
    //       sender: alice.publicKey,
    //       receiver: bob.publicKey,
    //       tokenContract: tokenMint,
    //       senderTokenAccount: aliceWallet
    //     })
    //     .signers([alice])
    //     .rpc();
    //   console.log(`Initialized a new Safe Pay instance. Alice will pay bob 20 tokens`);

    //   // Assert that 20 tokens were moved from Alice's account to the escrow.
    //   const [, aliceBalancePost] = await readAccount(aliceWallet, provider);
    //   assert.equal(aliceBalancePost, "337000000");
    //   const [, escrowBalancePost] = await readAccount(pda.htlcWalletKey, provider);
    //   console.log(`${pda.htlcWalletKey} PDA htlcWALLET`);
    //   console.log(`${escrowBalancePost} escrow balance`);
    //   assert.equal(escrowBalancePost, "1000000000");

    //   console.log(`Bob token`);
    //   // Create a token account for Bob.

    //   const bobTokenAccount = await spl.getAssociatedTokenAddress(
    //     tokenMint,
    //     bob.publicKey
    //   )
    //   const details = await program.methods.getDetails(HTLCID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).rpc();
    //   console.log(`${details} details`);
    //   const tx2 = await program.methods.redeem(HTLCID, SECRET, pda.htlcBump).
    //     accountsPartial({
    //       htlc: pda.htlcKey,
    //       htlcTokenAccount: pda.htlcWalletKey,
    //       sender: alice.publicKey,
    //       userSigning: alice.publicKey,
    //       receiver: bob.publicKey,
    //       tokenContract: tokenMint,
    //       receiverTokenAccount: bobTokenAccount,

    //     })
    //     .signers([alice])
    //     .rpc();
    //   const postDetails = await program.methods.getDetails(HTLCID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).rpc();
    //   console.log(`${postDetails} postdetails`);
    //   // Assert that 20 tokens were sent back.
    //   const [, bobBalance] = await readAccount(bobTokenAccount, provider);
    //   assert.equal(bobBalance, "1000000000");

    //   // Assert that escrow was correctly closed.
    //   try {
    //     await readAccount(pda.htlcWalletKey, provider);
    //     return assert.fail("Account should be closed");
    //   } catch (e) {
    //     assert.equal(e.message, "Cannot read properties of null (reading 'data')");
    //   }
    // });





    // it("can pull back funds once they are deposited", async () => {
    //   const [, aliceBalancePre] = await readAccount(aliceWallet, provider);
    //   assert.equal(aliceBalancePre, "1337000000");

    //   const amount = new anchor.BN(20000000);

    //   // Initialize mint account and fund the account
    //   const TIME = new Date().getTime();
    //   const TIMELOC = (TIME + 2500) / 1000;
    //   const TIMELOCK = new anchor.BN(TIMELOC);
    //   console.log(`[${TIMELOC * 1000}] the Timelock`);
    //   const tx1 = await program.methods
    //     .create(HTLCID, HASHLOCK, TIMELOCK, new anchor.BN(AMOUNT), CHAIN, TARGETCURRENCYRECEIVERADDRESS, PHTLCID, pda.htlcKey, pda.htlcBump)
    //     .accountsPartial({
    //       htlc: pda.htlcKey,
    //       htlcTokenAccount: pda.htlcWalletKey,
    //       sender: alice.publicKey,
    //       receiver: bob.publicKey,
    //       tokenContract: tokenMint,
    //       senderTokenAccount: aliceWallet
    //     })
    //     .signers([alice])
    //     .rpc();
    //   console.log(`Initialized a new Safe Pay instance. Alice will pay bob 20 tokens`);

    //   // Assert that 20 tokens were moved from Alice's account to the escrow.
    //   const [, aliceBalancePost] = await readAccount(aliceWallet, provider);
    //   assert.equal(aliceBalancePost, "337000000");
    //   const [, escrowBalancePost] = await readAccount(pda.htlcWalletKey, provider);
    //   assert.equal(escrowBalancePost, "1000000000");

    //   const details = await program.methods.getDetails(HTLCID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).rpc();
    //   // Withdraw the funds back
    //   await wait(2000);
    //   const CURTIME = new Date().getTime() / 1000;
    //   console.log(`[${CURTIME * 1000}] CURRENT TIME`);
    //   const tx2 = await program.methods.refund(HTLCID, pda.htlcBump).
    //     accountsPartial({
    //       htlc: pda.htlcKey,
    //       htlcTokenAccount: pda.htlcWalletKey,
    //       // userSigning: alice.publicKey,
    //       userSigning: wallet.publicKey,
    //       sender: alice.publicKey,
    //       tokenContract: tokenMint,
    //       senderTokenAccount: aliceWallet,
    //     })
    //     .signers([wallet.payer])
    //     .rpc();
    //   // Assert that 20 tokens were sent back.
    //   const postdetails = await program.methods.getDetails(HTLCID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).rpc();

    //   const [, aliceBalanceRefund] = await readAccount(aliceWallet, provider);
    //   assert.equal(aliceBalanceRefund, "1337000000");

    //   // Assert that escrow was correctly closed.
    //   try {
    //     await readAccount(pda.htlcWalletKey, provider);
    //     return assert.fail("Account should be closed");
    //   } catch (e) {
    //     assert.equal(e.message, "Cannot read properties of null (reading 'data')");
    //   }

    //   // const state = await program.account.state.fetch(pda.stateKey);
    //   // assert.equal(state.amountTokens.toString(), "20000000");
    //   // assert.equal(state.stage.toString(), "3");

    // });

});
