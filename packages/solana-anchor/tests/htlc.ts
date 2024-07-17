import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import * as spl from '@solana/spl-token';
import { AnchorHtlc } from '../target/types/solana';

interface PDAParameters {
    htlcWalletKey: anchor.web3.PublicKey;
    htlcKey: anchor.web3.PublicKey;
    htlcBump: number;
}

describe("safe_pay", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.AnchorHtlc as anchor.Program<AnchorHtlc>;

    const wallet = provider.wallet as anchor.Wallet;
    const SECRET = "0x051";
    const HASHLOCK = "3ac0ef68371290bdbcb5d1dfdd57b5243d3313d5521edef39f40f84caada21bc";
    const HTLCID = HASHLOCK.slice(0, 16);
    console.log(`${HTLCID} ID`);
    const TIMELOCK = new anchor.BN(Date.now() / 1000 + 1000);
    const AMOUNT = 1 * anchor.web3.LAMPORTS_PER_SOL;
    const CHAINID = 1;
    const TARGETCURRENCYRECEIVERADDRESS = "0x11";

    let mintAddress: anchor.web3.PublicKey;
    let alice: anchor.web3.Keypair;
    let aliceWallet: anchor.web3.PublicKey;
    let bob: anchor.web3.Keypair;

    let pda: PDAParameters;

    const getPdaParams = async (
        htlcId: string,
    ): Promise<PDAParameters> => {
        let seed = Buffer.from(htlcId);
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
        return {
            htlcWalletKey: htlcPubKey,
            htlcKey: htlc,
            htlcBump,
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

        console.log(`[${tokenMint.publicKey}] Created new mint account at ${signature}`);
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

    before(async () => {
        mintAddress = await createMint();
        [alice, aliceWallet] = await createUserAndAssociatedWallet(mintAddress);

        let _rest;
        [bob, ..._rest] = await createUserAndAssociatedWallet();

        pda = await getPdaParams(HTLCID);
    });

    it("Bob can redeem", async () => {
        // try {
        const [, aliceBalancePre] = await readAccount(aliceWallet, provider);
        assert.equal(aliceBalancePre, "1337000000");

        const amount = new anchor.BN(20000000);
        // Initialize mint account and fund the account
        const tx1 = await program.methods
            .create(HTLCID, HASHLOCK, TIMELOCK, new anchor.BN(AMOUNT), new anchor.BN(CHAINID), TARGETCURRENCYRECEIVERADDRESS, pda.htlcBump)
            .accounts({
                sender: alice.publicKey,
                receiver: bob.publicKey,
                tokenContract: mintAddress,
                senderTokenAccount: aliceWallet
            })
            .signers([alice])
            .rpc();
        console.log(`Initialized a new Safe Pay instance. Alice will pay bob 20 tokens`);

        // Assert that 20 tokens were moved from Alice's account to the escrow.
        const [, aliceBalancePost] = await readAccount(aliceWallet, provider);
        assert.equal(aliceBalancePost, "337000000");
        const [, escrowBalancePost] = await readAccount(pda.htlcWalletKey, provider);
        console.log(`${pda.htlcWalletKey} PDA htlcWALLET`);
        console.log(`${escrowBalancePost} escrow balance`);
        assert.equal(escrowBalancePost, "1000000000");

        console.log(`Bob token`);
        // Create a token account for Bob.

        const bobTokenAccount = await spl.getAssociatedTokenAddress(
            mintAddress,
            bob.publicKey
        )
        const details = await program.methods.getDetails(HTLCID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).view();

        // console.log(`${details} details`);
        // const tx2 = await program.methods.redeem(HTLCID, SECRET, pda.htlcBump).
        //   accountsPartial({
        //     htlc: pda.htlcKey,
        //     htlcTokenAccount: pda.htlcWalletKey,
        //     sender: alice.publicKey,
        //     userSigning: alice.publicKey,
        //     receiver: bob.publicKey,
        //     tokenContract: mintAddress,
        //     receiverTokenAccount: bobTokenAccount,

        //   })
        //   .signers([alice])
        //   .rpc();
        // const postDetails = await program.methods.getDetails(HTLCID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).view();
        // console.log(`${postDetails} postdetails`);
        // // Assert that 20 tokens were sent back.
        // const [, bobBalance] = await readAccount(bobTokenAccount, provider);
        // assert.equal(bobBalance, "1000000000");

        // // Assert that escrow was correctly closed.
        // try {
        //   await readAccount(pda.htlcWalletKey, provider);
        //   return assert.fail("Account should be closed");
        // } catch (e) {
        //   assert.equal(e.message, "Cannot read properties of null (reading 'data')");
        // }


        // }

        // catch (e: any) {
        //   console.log(e);
        // }
    });
    function wait(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    // it("can pull back funds once they are deposited", async () => {
    //   const [, aliceBalancePre] = await readAccount(aliceWallet, provider);
    //   assert.equal(aliceBalancePre, "1337000000");

    //   const amount = new anchor.BN(20000000);

    //   // Initialize mint account and fund the account
    //   const tx1 = await program.methods
    //     .create(HTLCID, HASHLOCK, TIMELOCK, new anchor.BN(AMOUNT), new anchor.BN(CHAINID), TARGETCURRENCYRECEIVERADDRESS, pda.htlcBump)
    //     .accountsPartial({
    //       htlc: pda.htlcKey,
    //       htlcTokenAccount: pda.htlcWalletKey,
    //       sender: alice.publicKey,
    //       receiver: bob.publicKey,
    //       tokenContract: mintAddress,
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
    //   await wait(20000);
    //   const tx2 = await program.methods.refund(HTLCID, pda.htlcBump).
    //     accountsPartial({
    //       htlc: pda.htlcKey,
    //       htlcTokenAccount: pda.htlcWalletKey,
    //       // userSigning: alice.publicKey,
    //       userSigning: wallet.publicKey,
    //       sender: alice.publicKey,
    //       tokenContract: mintAddress,
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
