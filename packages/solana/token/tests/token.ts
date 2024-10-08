import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { randomBytes, createHash } from "crypto";
import * as spl from '@solana/spl-token';
//import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { AnchorHtlc } from '../target/types/anchor_htlc';

interface PDAParameters {
  htlcTokenAccount: anchor.web3.PublicKey;
  htlc: anchor.web3.PublicKey;
  htlcBump: number;
  phtlcTokenAccount: anchor.web3.PublicKey;
  phtlc: anchor.web3.PublicKey;
  phtlcBump: number;
  commitCounter: anchor.web3.PublicKey;
  lockIdStruct: anchor.web3.PublicKey;
  commits: anchor.web3.PublicKey;
  locks: anchor.web3.PublicKey;
}


describe("HTLC", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.AnchorHtlc as anchor.Program<AnchorHtlc>;
  const wallet = provider.wallet as anchor.Wallet;

  // const COMMITID = new anchor.BN(24);
  const COMMITID = randomBytes(32);
  const SECRET = randomBytes(32);
  const secretHex = SECRET.toString('hex');
  const HASHLOCK = createHash("sha256").update(SECRET).digest();
  const LOCKID = HASHLOCK;
  const lockIdhex = LOCKID.toString('hex');

  // const LOCKID = HASHLOCK.slice(0, 32);
  console.log(`${secretHex} SECRET`);
  console.log(`${lockIdhex} ID`);
  //const TIMELOCK = new anchor.BN(Date.now() - 3);
  const AMOUNT = 1 * anchor.web3.LAMPORTS_PER_SOL;
  const DSTCHAIN = "ETHEREUM";
  const SRCASSET = "USDC";
  const DSTASSET = "USDC";
  const HOPCHAINS = [DSTCHAIN];
  const HOPASSETS = [DSTASSET];
  const DSTADDRESS = "0x11";
  const HOPADDRESSES = [DSTADDRESS];

  let tokenMint: anchor.web3.PublicKey;
  let alice: anchor.web3.Keypair;
  let aliceWallet: anchor.web3.PublicKey;
  let walletTokenAccount: anchor.web3.PublicKey;
  let bob: anchor.web3.Keypair;

  let pda: PDAParameters;

  const getPdaParams = async (
    user: PublicKey,
    lockId: Buffer,
    commitId: Buffer,
  ): Promise<PDAParameters> => {
    // let pseed = commitId.toBuffer('le', 8);
    // let pseed = Buffer.from(commitId);
    let [htlc, htlcBump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [lockId],
      program.programId
    );
    let [htlcTokenAccount, htlcTokenbump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("htlc_token_account"), lockId],
      program.programId
    );
    console.log(`[${htlc}] derived htlc`);
    console.log(`[${htlcTokenAccount}] derived htlc token account`);

    let [phtlc, phtlcBump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [commitId],
      program.programId
    );
    let [phtlcTokenAccount, phtlcTokenbump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("phtlc_token_account"), commitId],
      program.programId
    );
    console.log(`[${phtlc}] derived phtlc`);
    console.log(`[${phtlcTokenAccount}] derived phtlc token account`);

    let [commitCounter, _] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("commitCounter")],
      program.programId
    );
    let [lockIdStruct, _b] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("commit_to_lock"), commitId],
      program.programId
    );
    let [commits, commits_bump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("commits"), user.toBuffer()],
      program.programId
    );
    let [locks, locks_bump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("locks"), user.toBuffer()],
      program.programId
    );
    return {
      htlcTokenAccount,
      htlc,
      htlcBump,
      phtlcTokenAccount,
      phtlc,
      phtlcBump,
      commitCounter,
      lockIdStruct,
      commits,
      locks
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

    // Fund user with SOL
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

  const createWalletTokens = async (
    mint?: anchor.web3.PublicKey
  ): Promise<[anchor.web3.PublicKey | undefined]> => {
    const user = provider.wallet as anchor.Wallet;
    let userAssociatedTokenAccount: anchor.web3.PublicKey | undefined = undefined;

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
    return [userAssociatedTokenAccount];
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
    [walletTokenAccount] = await createWalletTokens(tokenMint);

    let _rest;
    [bob, ..._rest] = await createUserAndAssociatedWallet();

    pda = await getPdaParams(wallet.publicKey, LOCKID, COMMITID);
  });
  it("Create Prehtlc", async () => {
    const [, aliceBalancePre] = await readAccount(aliceWallet, provider);
    assert.equal(aliceBalancePre, "1337000000");

    // const txIn = await program.methods
    //   .initialize()
    //   .accountsPartial({
    //     owner: wallet.publicKey,
    //     commitCounter: pda.commitCounter,
    //   })
    //   .signers([wallet.payer])
    //   .rpc();//.catch(e => console.error(e));

    // Initialize mint account and fund the account
    const LOCKIDArray: number[] = Array.from(LOCKID);
    const COMMITIDArray: number[] = Array.from(COMMITID);
    const TIME = new Date().getTime();
    const TIMELOC = (TIME + 45000) / 1000;
    const TIMELOCK = new anchor.BN(TIMELOC);
    console.log(`[${TIMELOC * 1000}] the Timelock`);

    const initCommitTx = await program.methods.initCommits().
      accountsPartial({
        sender: wallet.publicKey,
        commits: pda.commits,
      }).transaction();

    const commitTx = await program.methods
      .commit(COMMITIDArray, HOPCHAINS, HOPASSETS, HOPADDRESSES, DSTCHAIN, DSTASSET, DSTADDRESS, SRCASSET, bob.publicKey, TIMELOCK, wallet.publicKey, new anchor.BN(AMOUNT), pda.phtlcBump)
      .accountsPartial({
        sender: wallet.publicKey,
        phtlc: pda.phtlc,
        phtlcTokenAccount: pda.phtlcTokenAccount,
        commitCounter: pda.commitCounter,
        commits: pda.commits,
        tokenContract: tokenMint,
        senderTokenAccount: walletTokenAccount
      })
      .transaction();

    let initAndCommit = new anchor.web3.Transaction();
    initAndCommit.add(initCommitTx);
    initAndCommit.add(commitTx);

    await anchor.web3.sendAndConfirmTransaction(anchor.getProvider().connection, initAndCommit, [wallet.payer]);
    const commits = await program.methods.getCommits(wallet.publicKey).accountsPartial({ commits: pda.commits }).view();
    console.log(`${commits} the commits`);


    console.log(`Initialized a new PHTLC. Alice will pay bob 100 tokens`);

    // // Assert that 100 tokens were moved from Alice's account to the escrow.
    // const [, aliceBalancePost] = await readAccount(aliceWallet, provider);
    // assert.equal(aliceBalancePost, "337000000");
    // const [, phtlcBalance] = await readAccount(pda.phtlcTokenAccount, provider);
    // console.log(`${pda.phtlcTokenAccount} PDA htlcWALLET`);
    // console.log(`${phtlcBalance} phtlc Balance after the commitment`);
    // assert.equal(phtlcBalance, "1000000000");


    // await wait(5000);
    // const CURTIME = new Date().getTime() / 1000;
    // console.log(`[${CURTIME * 1000}] CURRENT TIME`);
    // const tx2 = await program.methods.uncommit(COMMITID, pda.phtlcBump).
    //   accountsPartial({
    //     userSigning: wallet.publicKey,
    //     phtlc: pda.phtlc,
    //     phtlcTokenAccount: pda.phtlcTokenAccount,
    //     // userSigning: alice.publicKey,
    //     sender: alice.publicKey,
    //     tokenContract: tokenMint,
    //     senderTokenAccount: aliceWallet,
    //   })
    //   .signers([wallet.payer])
    //   .rpc();
    // console.log(`can uncommit`);

    // const pre_locks = await program.methods.getLocks(alice.publicKey).accountsPartial({ locks: pda.locks }).view();
    // console.log(`${pre_locks} the locks before`);


    const lockCommitTx = await program.methods.lockCommit(COMMITIDArray, LOCKIDArray, TIMELOCK, pda.phtlcBump).
      accountsPartial({
        messenger: wallet.publicKey,
        phtlc: pda.phtlc,
        htlc: pda.htlc,
        phtlcTokenAccount: pda.phtlcTokenAccount,
        htlcTokenAccount: pda.htlcTokenAccount,
        tokenContract: tokenMint,
      }).signers([wallet.payer])
      .rpc();


    const [, htlcBalancePost] = await readAccount(pda.htlcTokenAccount, provider);
    console.log(`${pda.htlcTokenAccount} --- htlcWALLET`);
    console.log(`${htlcBalancePost} htlc Balance after lockCommit`);
    assert.equal(htlcBalancePost, "1000000000");

    console.log(`Bob token`);
    // Create a token account for Bob.
    const bobTokenAccount = await spl.getAssociatedTokenAddress(
      tokenMint,
      bob.publicKey
    )
    const details = await program.methods.getLockDetails(LOCKIDArray, pda.htlcBump).accountsPartial({ htlc: pda.htlc }).rpc();
    const tx3 = await program.methods.redeem(LOCKIDArray, SECRET, pda.htlcBump).
      accountsPartial({
        userSigning: wallet.publicKey,
        htlc: pda.htlc,
        htlcTokenAccount: pda.htlcTokenAccount,
        sender: wallet.publicKey,
        srcReceiver: bob.publicKey,
        tokenContract: tokenMint,
        srcReceiverTokenAccount: bobTokenAccount,

      })
      .signers([wallet.payer])
      .rpc();

    // await wait(2000);
    // const tx4 = await program.methods.unlock(LOCKID, pda.htlcBump).
    //   accountsPartial({
    //     userSigning: wallet.publicKey,
    //     htlc: pda.htlc,
    //     htlcTokenAccount: pda.htlcTokenAccount,
    //     // userSigning: alice.publicKey,
    //     sender: alice.publicKey,
    //     tokenContract: tokenMint,
    //     senderTokenAccount: aliceWallet,
    //   })
    //   .signers([wallet.payer])
    //   .rpc();

    // const tx3 = await program.methods
    //  .lock(LOCKID, TIMELOCK, DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, bob.publicKey, COMMITID, alice.publicKey, new anchor.BN(AMOUNT), pda.htlcBump)
    //   .accountsPartial({
    //     sender: alice.publicKey,
    //     htlc: pda.htlc,
    //     htlcTokenAccount: pda.htlcTokenAccount,
    //     tokenContract: tokenMint,
    //     senderTokenAccount: aliceWallet
    //   })
    //   .signers([alice])
    //   .rpc();

    // const [, aliceBalancePost] = await readAccount(aliceWallet, provider);
    // assert.equal(aliceBalancePost, "337000000");
    // const [, escrowBalancePost] = await readAccount(pda.htlcTokenAccount, provider);
    // assert.equal(escrowBalancePost, "1000000000");

    // const details = await program.methods.getLockDetails(LOCKID, pda.htlcBump).accountsPartial({ htlc: pda.htlc }).rpc();
    // Withdraw the funds back


    // await wait(3000);
    // const CURTIME = new Date().getTime() / 1000;
    // console.log(`[${CURTIME * 1000}] CURRENT TIME`);
    // const tx2 = await program.methods.uncommit(COMMITID, pda.phtlcBump).
    //   accountsPartial({
    //     userSigning: wallet.publicKey,
    //     phtlc: pda.phtlc,
    //     phtlcTokenAccount: pda.phtlcTokenAccount,
    //     // userSigning: alice.publicKey,
    //     sender: alice.publicKey,
    //     tokenContract: tokenMint,
    //     senderTokenAccount: aliceWallet,
    //   })
    //   .signers([wallet.payer])
    //   .rpc();


    // Assert that 100 tokens were sent back.
    // const postdetails = await program.methods.getLockDetails(LOCKID, pda.htlcBump).accountsPartial({ htlc: pda.htlc }).rpc();

    // const [, aliceBalanceunlock] = await readAccount(aliceWallet, provider);
    // assert.equal(aliceBalanceunlock, "1337000000");

    // Assert that escrow was correctly closed.
    try {
      await readAccount(pda.phtlcTokenAccount, provider);
      return assert.fail("Account should be closed");
    } catch (e) {
      assert.equal(e.message, "Cannot read properties of null (reading 'data')");
    }

  });



  // it("Create new HTLC and then redeem tokens", async () => {
  //   const [, aliceBalancePre] = await readAccount(aliceWallet, provider);
  //   assert.equal(aliceBalancePre, "1337000000");

  //   const amount = new anchor.BN(20000000);
  //   const TIME = new Date().getTime();
  //   const TIMELOC = (TIME + 250000) / 1000;
  //   const TIMELOCK = new anchor.BN(TIMELOC);
  //   console.log(`[${TIMELOC * 1000}] the Timelock`);
  //   const listenerTokenLocked = program.addEventListener('tokenLocked', (event, slot) => {
  //     console.log(`slot ${slot}`);
  //     console.log(`tokenLocked hashlock ${event.hashlock}`);
  //     console.log(`tokenLocked dstChain ${event.dstChain}`);
  //     console.log(`tokenLocked dstAddress ${event.dstAddress}`);
  //     console.log(`tokenLocked dstAsset ${event.dstAsset}`);
  //     console.log(`tokenLocked sender ${event.sender}`);
  //     console.log(`tokenLocked srcReceiver ${event.srcReceiver}`);
  //     console.log(`tokenLocked srcAsset ${event.srcAsset}`);
  //     console.log(`tokenLocked amount ${event.amount}`);
  //     console.log(`tokenLocked timelock ${event.timelock}`);
  //     console.log(`tokenLocked messenger ${event.messenger}`);
  //     console.log(`tokenLocked commitId ${event.commitId}`);
  //     console.log(`tokenLocked tokenContract ${event.tokenContract}`);
  //   });
  //   const LOCKIDArray: number[] = Array.from(LOCKID);
  //   const COMMITIDArray: number[] = Array.from(COMMITID);

  //   const initTx = await program.methods.initLockIdByCommitId(COMMITIDArray).
  //     accountsPartial({
  //       sender: alice.publicKey,
  //       lockIdStruct: pda.lockIdStruct,
  //     }).transaction();
  //   const lockTx = await program.methods
  //     .lock(LOCKIDArray, COMMITIDArray, TIMELOCK, DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, bob.publicKey, alice.publicKey, new anchor.BN(AMOUNT), pda.htlcBump)
  //     .accountsPartial({
  //       sender: alice.publicKey,
  //       htlc: pda.htlc,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       lockIdStruct: pda.lockIdStruct,
  //       tokenContract: tokenMint,
  //       senderTokenAccount: aliceWallet
  //     })
  //     .transaction();
  //   console.log(`Created a new HTLC. Alice will pay bob 100 tokens`);

  //   let initAndLock = new anchor.web3.Transaction();
  //   initAndLock.add(initTx);
  //   initAndLock.add(lockTx);

  //   await anchor.web3.sendAndConfirmTransaction(anchor.getProvider().connection, initAndLock, [alice]);

  //   // const lockTx = await program.methods
  //   //   .lock(LOCKIDArray, COMMITIDArray, TIMELOCK, DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, bob.publicKey, alice.publicKey, new anchor.BN(AMOUNT), pda.htlcBump)
  //   //   .accountsPartial({
  //   //     sender: alice.publicKey,
  //   //     htlc: pda.htlc,
  //   //     htlcTokenAccount: pda.htlcTokenAccount,
  //   //     lockIdStruct: pda.lockIdStruct,
  //   //     tokenContract: tokenMint,
  //   //     senderTokenAccount: aliceWallet
  //   //   })
  //   //   .signers([alice])
  //   //   .rpc();
  //   // console.log(`Created a new HTLC. Alice will pay bob 100 tokens`);


  //   await new Promise((resolve) => setTimeout(resolve, 5000));

  //   program.removeEventListener(listenerTokenLocked);

  //   const lock_id = await program.methods.getLockIdByCommitId(COMMITIDArray).accountsPartial({ lockIdStruct: pda.lockIdStruct }).view();
  //   console.log(`[${lock_id}] the lock_id from commit Id`);

  //   // Assert that 100 tokens were moved from Alice's account to the HTLC Token Account.
  //   const [, aliceBalancePost] = await readAccount(aliceWallet, provider);
  //   assert.equal(aliceBalancePost, "337000000");
  //   const [, escrowBalancePost] = await readAccount(pda.htlcTokenAccount, provider);
  //   console.log(`${pda.htlcTokenAccount} PDA htlcWALLET`);
  //   console.log(`${escrowBalancePost} escrow balance`);
  //   assert.equal(escrowBalancePost, "1000000000");

  //   console.log(`Bob token`);
  //   // Create a token account for Bob.

  //   const bobTokenAccount = await spl.getAssociatedTokenAddress(
  //     tokenMint,
  //     bob.publicKey
  //   )
  //   const details = await program.methods.getLockDetails(LOCKIDArray, pda.htlcBump).accountsPartial({ htlc: pda.htlc }).rpc();
  //   const tx2 = await program.methods.redeem(LOCKIDArray, SECRET, pda.htlcBump).
  //     accountsPartial({
  //       userSigning: alice.publicKey,
  //       htlc: pda.htlc,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       sender: alice.publicKey,
  //       srcReceiver: bob.publicKey,
  //       tokenContract: tokenMint,
  //       srcReceiverTokenAccount: bobTokenAccount,

  //     })
  //     .signers([alice])
  //     .rpc();//.catch(e => console.error(e));
  //   const postDetails = await program.methods.getLockDetails(LOCKIDArray, pda.htlcBump).accountsPartial({ htlc: pda.htlc }).view();
  //   // Assert that 100 tokens were sent back.
  //   const [, bobBalance] = await readAccount(bobTokenAccount, provider);
  //   assert.equal(bobBalance, "1000000000");

  //   // Assert that HTLC Token Account was correctly closed.
  //   try {
  //     await readAccount(pda.htlcTokenAccount, provider);
  //     return assert.fail("Account should be closed");
  //   } catch (e) {
  //     assert.equal(e.message, "Cannot read properties of null (reading 'data')");
  //   }
  // });





  // it("Refund tokens after the timelock is expired", async () => {
  //   const [, aliceBalancePre] = await readAccount(aliceWallet, provider);
  //   assert.equal(aliceBalancePre, "1337000000");

  //   // Initialize mint account and fund the account
  //   const TIME = new Date().getTime();
  //   const TIMELOC = (TIME + 2500) / 1000;
  //   const TIMELOCK = new anchor.BN(TIMELOC);
  //   console.log(`[${TIMELOC * 1000}] the Timelock`);
  //   const LOCKIDArray: number[] = Array.from(LOCKID);
  //   const COMMITIDArray: number[] = Array.from(COMMITID);
  //   let initAndLock  = new anchor.web3.Transaction();
  //   const initTx = await program.methods.initLockIdByCommitId(COMMITID).
  //     accountsPartial({
  //       sender: alice.publicKey,
  //       lockIdStruct: pda.lockIdStruct,
  //     }).transaction();
  //   const lockTx = await program.methods
  //     .lock(LOCKIDArray, COMMITIDArray, TIMELOCK, DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, bob.publicKey, alice.publicKey, new anchor.BN(AMOUNT), pda.htlcBump)
  //     .accountsPartial({
  //       sender: alice.publicKey,
  //       htlc: pda.htlc,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       lockIdStruct: pda.lockIdStruct,
  //       tokenContract: tokenMint,
  //       senderTokenAccount: aliceWallet
  //     })
  //     .transaction();
  //   console.log(`Created a new HTLC. Alice will pay bob 100 tokens`);

  //   initAndLock .add(initTx);
  //   initAndLock .add(lockTx);

  //   await anchor.web3.sendAndConfirmTransaction(anchor.getProvider().connection, initAndLock , [alice]);

  //   // Assert that 100 tokens were moved from Alice's account to the HTLC Token Account.
  //   const [, aliceBalancePost] = await readAccount(aliceWallet, provider);
  //   assert.equal(aliceBalancePost, "337000000");
  //   const [, escrowBalancePost] = await readAccount(pda.htlcTokenAccount, provider);
  //   assert.equal(escrowBalancePost, "1000000000");

  //   const details = await program.methods.getLockDetails(LOCKID, pda.htlcBump).accountsPartial({ htlc: pda.htlc }).rpc();
  //   // Withdraw the funds back
  //   await wait(2000);
  //   const CURTIME = new Date().getTime() / 1000;
  //   console.log(`[${CURTIME * 1000}] CURRENT TIME`);
  //   const tx2 = await program.methods.unlock(LOCKID, pda.htlcBump).
  //     accountsPartial({
  //       userSigning: wallet.publicKey,
  //       htlc: pda.htlc,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       // userSigning: alice.publicKey,
  //       sender: alice.publicKey,
  //       tokenContract: tokenMint,
  //       senderTokenAccount: aliceWallet,
  //     })
  //     .signers([wallet.payer])
  //     .rpc();
  //   // Assert that 100 tokens were sent back.
  //   const postdetails = await program.methods.getLockDetails(LOCKID, pda.htlcBump).accountsPartial({ htlc: pda.htlc }).rpc();

  //   const [, aliceBalanceunlock] = await readAccount(aliceWallet, provider);
  //   assert.equal(aliceBalanceunlock, "1337000000");

  //   // Assert that HTLC Token Account was correctly closed.
  //   try {
  //     await readAccount(pda.htlcTokenAccount, provider);
  //     return assert.fail("Account should be closed");
  //   } catch (e) {
  //     assert.equal(e.message, "Cannot read properties of null (reading 'data')");
  //   }

  // });

});