import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import * as spl from '@solana/spl-token';
//import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { AnchorHtlc } from '../target/types/token';

interface PDAParameters {
  htlcTokenAccount: anchor.web3.PublicKey;
  htlcKey: anchor.web3.PublicKey;
  htlcBump: number;
  phtlcTokenAccount: anchor.web3.PublicKey;
  phtlcKey: anchor.web3.PublicKey;
  phtlcBump: number;
}

describe("safe_pay", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.AnchorHtlc as anchor.Program<AnchorHtlc>;
  const wallet = provider.wallet as anchor.Wallet;
  const tokenMint = new PublicKey("9ZP28ycX1bkQzwJ4H1ZJdsMtKtuXg6z3wEE41564yUfG");

  //const COMMITID = new anchor.BN(24);
  const SECRET = "12";
  const COMMITID = SECRET;
  const HASHLOCK = "778cd1ef949ae90bddcffbb0143f043a086641c8d768a83ff0881d7fcdbfab3c";
  const LOCKID = HASHLOCK.slice(0, 32);
  console.log(`${LOCKID} ID`);
  //const TIMELOCK = new anchor.BN(Date.now() - 3);
  const AMOUNT = 1 * anchor.web3.LAMPORTS_PER_SOL;
  const DSTCHAIN = "ETHEREUM";
  const SRCASSET = "USDC";
  const DSTASSET = "USDC";
  const HOPCHAINS = [DSTCHAIN];
  const HOPASSETS = [DSTASSET];
  const DSTADDRESS = "0x11";
  const HOPADDRESSES = [DSTADDRESS];


  // let tokenMint: anchor.web3.PublicKey;
  let alice: anchor.web3.Keypair;
  let aliceWallet: anchor.web3.PublicKey;
  let bob: anchor.web3.Keypair;

  let pda: PDAParameters;

  const getPdaParams = async (
    lockId: string,
    commitId: String,
  ): Promise<PDAParameters> => {
    let seed = Buffer.from(lockId);
    // let pseed = commitId.toBuffer('le', 8);
    let pseed = Buffer.from(commitId);
    let [htlc, htlcBump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [seed],
      program.programId
    );
    let [htlcTokenAccount, bump2] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("htlc_token_account"), seed],
      program.programId
    );
    console.log(`[${htlc}] derived htlc`);
    console.log(`[${htlcTokenAccount}] derived htlc token account`);

    let [phtlc, phtlcBump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [pseed],
      program.programId
    );
    let [phtlcTokenAccount, bump3] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("phtlc_token_account"), pseed],
      program.programId
    );
    console.log(`[${phtlc}] derived phtlc`);
    console.log(`[${phtlcTokenAccount}] derived phtlc token account`);
    return {
      htlcTokenAccount: htlcTokenAccount,
      htlcKey: htlc,
      htlcBump,
      phtlcTokenAccount: phtlcTokenAccount,
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
      const txFundTokenSig = await provider.sendAndConfirm(txFundTokenAccount);
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
    // tokenMint = await createMint();
    [alice, aliceWallet] = await createUserAndAssociatedWallet(tokenMint);

    let _rest;
    [bob, ..._rest] = await createUserAndAssociatedWallet();

    pda = await getPdaParams(LOCKID, COMMITID);
  });
  // it("Create Prehtlc", async () => {
  //   const [, aliceBalancePre] = await readAccount(aliceWallet, provider);
  //   assert.equal(aliceBalancePre, "1337000000");

  //   // Initialize mint account and fund the account
  //   const TIME = new Date().getTime();
  //   const TIMELOC = (TIME + 2500) / 1000;
  //   const TIMELOCK = new anchor.BN(TIMELOC);
  //   console.log(`[${TIMELOC * 1000}] the Timelock`);
  //   const tx1 = await program.methods
  //     .commit(COMMITID, HOPCHAINS, HOPASSETS, HOPADDRESSES, DSTCHAIN, DSTASSET, DSTADDRESS, SRCASSET, bob.publicKey, TIMELOCK, alice.publicKey, new anchor.BN(AMOUNT), pda.phtlcBump)
  //     .accountsPartial({
  //       phtlc: pda.phtlcKey,
  //       phtlcTokenAccount: pda.phtlcTokenAccount,
  //       sender: alice.publicKey,
  //       tokenContract: tokenMint,
  //       senderTokenAccount: aliceWallet
  //     })
  //     .signers([alice])
  //     .rpc();
  //   console.log(`Initialized a new PHTLC. Alice will pay bob 100 tokens`);

  //   // Assert that 100 tokens were moved from Alice's account to the escrow.
  //   const [, aliceBalancePost] = await readAccount(aliceWallet, provider);
  //   assert.equal(aliceBalancePost, "337000000");
  //   const [, phtlcBalance] = await readAccount(pda.phtlcTokenAccount, provider);
  //   console.log(`${pda.phtlcTokenAccount} PDA htlcWALLET`);
  //   console.log(`${phtlcBalance} phtlc Balance after the commitment`);
  //   assert.equal(phtlcBalance, "1000000000");

  //   // await wait(3000);
  //   // const CURTIME = new Date().getTime() / 1000;
  //   // console.log(`[${CURTIME * 1000}] CURRENT TIME`);
  //   // const tx2 = await program.methods.uncommit(COMMITID, pda.phtlcBump).
  //   //   accountsPartial({
  //   //     phtlc: pda.phtlcKey,
  //   //     phtlcTokenAccount: pda.phtlcTokenAccount,
  //   //     // userSigning: alice.publicKey,
  //   //     userSigning: wallet.publicKey,
  //   //     sender: alice.publicKey,
  //   //     tokenContract: tokenMint,
  //   //     senderTokenAccount: aliceWallet,
  //   //   })
  //   //   .signers([wallet.payer])
  //   //   .rpc();
  //   // console.log(`can uncommit`);

  //   const tx2 = await program.methods.lockCommit(COMMITID, LOCKID, HASHLOCK, pda.phtlcBump).
  //     accountsPartial({
  //       phtlc: pda.phtlcKey,
  //       htlc: pda.htlcKey,
  //       phtlcTokenAccount: pda.phtlcTokenAccount,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       // userSigning: alice.publicKey,
  //       userSigning: alice.publicKey,
  //       tokenContract: tokenMint,
  //     })
  //     .signers([alice])
  //     .rpc();//.catch(e => console.error(e));
  //   // const [, phtlcBalancePost] = await readAccount(pda.phtlcTokenAccount, provider);
  //   // console.log(`${pda.phtlcTokenAccount} --- phtlcWALLET`);
  //   // console.log(`${phtlcBalancePost} phtlc Balance after lockCommit`);
  //   // assert.equal(phtlcBalancePost, "1000000000");
  //   const [, htlcBalancePost] = await readAccount(pda.htlcTokenAccount, provider);
  //   console.log(`${pda.htlcTokenAccount} --- htlcWALLET`);
  //   console.log(`${htlcBalancePost} htlc Balance after lockCommit`);
  //   assert.equal(htlcBalancePost, "1000000000");

  //   console.log(`Bob token`);
  //   // Create a token account for Bob.
  //   const bobTokenAccount = await spl.getAssociatedTokenAddress(
  //     tokenMint,
  //     bob.publicKey
  //   )
  //   const details = await program.methods.getLockDetails(LOCKID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).rpc();
  //   console.log(`${details} details`);
  //   const tx3 = await program.methods.redeem(LOCKID, SECRET, pda.htlcBump).
  //     accountsPartial({
  //       htlc: pda.htlcKey,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       sender: alice.publicKey,
  //       userSigning: alice.publicKey,
  //       srcReceiver: bob.publicKey,
  //       tokenContract: tokenMint,
  //       srcReceiverTokenAccount: bobTokenAccount,

  //     })
  //     .signers([alice])
  //     .rpc();

  //   // await wait(2000);
  //   // const tx4 = await program.methods.unlock(LOCKID, pda.htlcBump).
  //   //   accountsPartial({
  //   //     htlc: pda.htlcKey,
  //   //     htlcTokenAccount: pda.htlcTokenAccount,
  //   //     // userSigning: alice.publicKey,
  //   //     userSigning: wallet.publicKey,
  //   //     sender: alice.publicKey,
  //   //     tokenContract: tokenMint,
  //   //     senderTokenAccount: aliceWallet,
  //   //   })
  //   //   .signers([wallet.payer])
  //   //   .rpc();

  //   // const tx3 = await program.methods
  //   //  .lock(LOCKID, HASHLOCK, TIMELOCK, DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, bob.publicKey, COMMITID, alice.publicKey, new anchor.BN(AMOUNT), pda.htlcBump)
  //   //   .accountsPartial({
  //   //     htlc: pda.htlcKey,
  //   //     htlcTokenAccount: pda.htlcTokenAccount,
  //   //     sender: alice.publicKey,
  //   //     tokenContract: tokenMint,
  //   //     senderTokenAccount: aliceWallet
  //   //   })
  //   //   .signers([alice])
  //   //   .rpc();

  //   // const [, aliceBalancePost] = await readAccount(aliceWallet, provider);
  //   // assert.equal(aliceBalancePost, "337000000");
  //   // const [, escrowBalancePost] = await readAccount(pda.htlcTokenAccount, provider);
  //   // assert.equal(escrowBalancePost, "1000000000");

  //   // const details = await program.methods.getLockDetails(LOCKID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).rpc();
  //   // Withdraw the funds back



  //   // await wait(3000);
  //   // const CURTIME = new Date().getTime() / 1000;
  //   // console.log(`[${CURTIME * 1000}] CURRENT TIME`);
  //   // const tx2 = await program.methods.uncommit(COMMITID, pda.phtlcBump).
  //   //   accountsPartial({
  //   //     phtlc: pda.phtlcKey,
  //   //     phtlcTokenAccount: pda.phtlcTokenAccount,
  //   //     // userSigning: alice.publicKey,
  //   //     userSigning: wallet.publicKey,
  //   //     sender: alice.publicKey,
  //   //     tokenContract: tokenMint,
  //   //     senderTokenAccount: aliceWallet,
  //   //   })
  //   //   .signers([wallet.payer])
  //   //   .rpc();


  //   // Assert that 100 tokens were sent back.
  //   // const postdetails = await program.methods.getLockDetails(LOCKID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).rpc();

  //   // const [, aliceBalanceunlock] = await readAccount(aliceWallet, provider);
  //   // assert.equal(aliceBalanceunlock, "1337000000");

  //   // Assert that escrow was correctly closed.
  //   try {
  //     await readAccount(pda.phtlcTokenAccount, provider);
  //     return assert.fail("Account should be closed");
  //   } catch (e) {
  //     assert.equal(e.message, "Cannot read properties of null (reading 'data')");
  //   }

  // });



  it("Bob can redeem", async () => {
    const [, aliceBalancePre] = await readAccount(aliceWallet, provider);
    assert.equal(aliceBalancePre, "1337000000");

    const amount = new anchor.BN(20000000);
    const TIME = new Date().getTime();
    const TIMELOC = (TIME + 2500) / 1000;
    const TIMELOCK = new anchor.BN(TIMELOC);
    console.log(`[${TIMELOC * 1000}] the Timelock`);
    const tx1 = await program.methods
      .lock(LOCKID, HASHLOCK, TIMELOCK, DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, bob.publicKey, COMMITID, alice.publicKey, new anchor.BN(AMOUNT), pda.htlcBump)
      .accountsPartial({
        htlc: pda.htlcKey,
        htlcTokenAccount: pda.htlcTokenAccount,
        sender: alice.publicKey,
        tokenContract: tokenMint,
        senderTokenAccount: aliceWallet
      })
      .signers([alice])
      .rpc();
    console.log(`Initialized a new Safe Pay instance. Alice will pay bob 100 tokens`);

    // Assert that 100 tokens were moved from Alice's account to the escrow.
    const [, aliceBalancePost] = await readAccount(aliceWallet, provider);
    assert.equal(aliceBalancePost, "337000000");
    const [, escrowBalancePost] = await readAccount(pda.htlcTokenAccount, provider);
    console.log(`${pda.htlcTokenAccount} PDA htlcWALLET`);
    console.log(`${escrowBalancePost} escrow balance`);
    assert.equal(escrowBalancePost, "1000000000");

    console.log(`Bob token`);
    // Create a token account for Bob.

    const bobTokenAccount = await spl.getAssociatedTokenAddress(
      tokenMint,
      bob.publicKey
    )
    const details = await program.methods.getLockDetails(LOCKID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).rpc();
    console.log(`${details} details`);
    const tx2 = await program.methods.redeem(LOCKID, SECRET, pda.htlcBump).
      accountsPartial({
        htlc: pda.htlcKey,
        htlcTokenAccount: pda.htlcTokenAccount,
        sender: alice.publicKey,
        userSigning: alice.publicKey,
        srcReceiver: bob.publicKey,
        tokenContract: tokenMint,
        srcReceiverTokenAccount: bobTokenAccount,

      })
      .signers([alice])
      .rpc();
    const postDetails = await program.methods.getLockDetails(LOCKID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).rpc();
    console.log(`${postDetails} postdetails`);
    // Assert that 100 tokens were sent back.
    const [, bobBalance] = await readAccount(bobTokenAccount, provider);
    assert.equal(bobBalance, "1000000000");

    // Assert that escrow was correctly closed.
    try {
      await readAccount(pda.htlcTokenAccount, provider);
      return assert.fail("Account should be closed");
    } catch (e) {
      assert.equal(e.message, "Cannot read properties of null (reading 'data')");
    }
  });





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
  //     .lock(LOCKID, HASHLOCK, TIMELOCK, DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, bob.publicKey, COMMITID, alice.publicKey, new anchor.BN(AMOUNT), pda.htlcBump)
  //     .accountsPartial({
  //       htlc: pda.htlcKey,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       sender: alice.publicKey,
  //       tokenContract: tokenMint,
  //       senderTokenAccount: aliceWallet
  //     })
  //     .signers([alice])
  //     .rpc();
  //   console.log(`Initialized a new Safe Pay instance. Alice will pay bob 100 tokens`);

  //   // Assert that 100 tokens were moved from Alice's account to the escrow.
  //   const [, aliceBalancePost] = await readAccount(aliceWallet, provider);
  //   assert.equal(aliceBalancePost, "337000000");
  //   const [, escrowBalancePost] = await readAccount(pda.htlcTokenAccount, provider);
  //   assert.equal(escrowBalancePost, "1000000000");

  //   const details = await program.methods.getLockDetails(LOCKID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).rpc();
  //   // Withdraw the funds back
  //   await wait(2000);
  //   const CURTIME = new Date().getTime() / 1000;
  //   console.log(`[${CURTIME * 1000}] CURRENT TIME`);
  //   const tx2 = await program.methods.unlock(LOCKID, pda.htlcBump).
  //     accountsPartial({
  //       htlc: pda.htlcKey,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       // userSigning: alice.publicKey,
  //       userSigning: wallet.publicKey,
  //       sender: alice.publicKey,
  //       tokenContract: tokenMint,
  //       senderTokenAccount: aliceWallet,
  //     })
  //     .signers([wallet.payer])
  //     .rpc();
  //   // Assert that 100 tokens were sent back.
  //   const postdetails = await program.methods.getLockDetails(LOCKID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).rpc();

  //   const [, aliceBalanceunlock] = await readAccount(aliceWallet, provider);
  //   assert.equal(aliceBalanceunlock, "1337000000");

  //   // Assert that escrow was correctly closed.
  //   try {
  //     await readAccount(pda.htlcTokenAccount, provider);
  //     return assert.fail("Account should be closed");
  //   } catch (e) {
  //     assert.equal(e.message, "Cannot read properties of null (reading 'data')");
  //   }

  // });

});
