import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { randomBytes, createHash } from "crypto";
import * as spl from '@solana/spl-token';
//import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { AnchorHtlc } from '../target/types/anchor_htlc';
import 'dotenv/config';

interface PDAParameters {
  htlcTokenAccount: anchor.web3.PublicKey;
  htlcKey: anchor.web3.PublicKey;
  htlcBump: number;
  phtlcTokenAccount: anchor.web3.PublicKey;
  phtlcKey: anchor.web3.PublicKey;
  phtlcBump: number;
  commitCounter: anchor.web3.PublicKey;
  lockIdStruct: anchor.web3.PublicKey;

}

describe("safe_pay", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.AnchorHtlc as anchor.Program<AnchorHtlc>;
  const wallet = provider.wallet as anchor.Wallet;
  // const tokenMint = new PublicKey("9ZP28ycX1bkQzwJ4H1ZJdsMtKtuXg6z3wEE41564yUfG");

  //const COMMITID = new anchor.BN(24);
  const COMMITIDIK = "randowqemBytes(32);"
  const SECRETIK = "asdqgsdfgsdfg";
  const COMMITID = Buffer.from(COMMITIDIK);
  const SECRET = Buffer.from(SECRETIK);
  const HASHLOCK = createHash("sha256").update(SECRET).digest();
  const LOCKID = HASHLOCK;
  const lockIdhex = LOCKID.toString('hex');
  // const LOCKID = HASHLOCK.slice(0, 32);
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


  // let tokenMint: anchor.web3.PublicKey;
  const tokenMint = new PublicKey(process.env.USDC_ADDRESS);
  const sender = wallet;
  const senderTokenAccount = new PublicKey("2LS7Z2FCoKNbUUhxGfvUhNYXzWeUjgCvSakVnoMHbzqx");
  //  async () => {
  //   senderTokenAccount = await spl.getAssociatedTokenAddress(tokenMint, sender.publicKey);
  // };

  console.log(`[${senderTokenAccount}] derived htlc`);
  const receiver = new PublicKey(process.env.RECEIVER_ACCOUNT);
  const receiverTokenAccount = new PublicKey(process.env.RECEIVER_TOKEN_ACCOUNT);

  let pda: PDAParameters;

  const getPdaParams = async (
    lockId: Buffer,
    commitId: Buffer,
  ): Promise<PDAParameters> => {
    // let pseed = commitId.toBuffer('le', 8);
    // let pseed = Buffer.from(commitId);
    let [htlc, htlcBump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [lockId],
      program.programId
    );
    let [htlcTokenAccount, bump2] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("htlc_token_account"), lockId],
      program.programId
    );
    console.log(`[${htlc}] derived htlc`);
    console.log(`[${htlcTokenAccount}] derived htlc token account`);

    let [phtlc, phtlcBump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [commitId],
      program.programId
    );
    let [phtlcTokenAccount, bump3] = await anchor.web3.PublicKey.findProgramAddressSync(
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
    return {
      htlcTokenAccount: htlcTokenAccount,
      htlcKey: htlc,
      htlcBump,
      phtlcTokenAccount: phtlcTokenAccount,
      phtlcKey: phtlc,
      phtlcBump,
      commitCounter,
      lockIdStruct,
    };
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
    pda = await getPdaParams(LOCKID, COMMITID);
  });
  // it("Create Prehtlc", async () => {
  //   const txIn = await program.methods
  //     .initialize()
  //     .accountsPartial({
  //       owner: wallet.publicKey,
  //       commitCounter: pda.commitCounter,
  //     })
  //     .signers([wallet.payer])
  //     .rpc();
  // });



  it("receiver can redeem", async () => {
    const amount = new anchor.BN(20000000);
    const TIME = new Date().getTime();
    const TIMELOC = (TIME + 250000) / 1000;
    const TIMELOCK = new anchor.BN(TIMELOC);
    console.log(`[${TIMELOC * 1000}] the Timelock`);
    // const tx1 = await program.methods
    //   .lock(LOCKID, TIMELOCK, DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, receiver, COMMITID, sender.publicKey, new anchor.BN(amount), pda.htlcBump)
    //   .accountsPartial({
    //     htlc: pda.htlcKey,
    //     htlcTokenAccount: pda.htlcTokenAccount,
    //     sender: sender.publicKey,
    //     tokenContract: tokenMint,
    //     senderTokenAccount: senderTokenAccount
    //   })
    //   .signers([sender.payer])
    //   .rpc();
    // console.log(`Initialized a new Safe Pay instance. sender will pay receiver 100 tokens`);

    const listenerTokenLocked = program.addEventListener('tokenLocked', (event, slot) => {
      console.log(`slot ${slot}`);
      console.log(`tokenLocked hashlock ${event.hashlock}`);
      console.log(`tokenLocked dstChain ${event.dstChain}`);
      console.log(`tokenLocked dstAddress ${event.dstAddress}`);
      console.log(`tokenLocked dstAsset ${event.dstAsset}`);
      console.log(`tokenLocked sender ${event.sender}`);
      console.log(`tokenLocked srcReceiver ${event.srcReceiver}`);
      console.log(`tokenLocked srcAsset ${event.srcAsset}`);
      console.log(`tokenLocked amount ${event.amount}`);
      console.log(`tokenLocked timelock ${event.timelock}`);
      console.log(`tokenLocked messenger ${event.messenger}`);
      console.log(`tokenLocked commitId ${event.commitId}`);
      console.log(`tokenLocked tokenContract ${event.tokenContract}`);
    });
    const LOCKIDArray: number[] = Array.from(LOCKID);
    const COMMITIDArray: number[] = Array.from(COMMITID);
    let setAndLock = new anchor.web3.Transaction();
    const initTx = await program.methods.initLockIdByCommitId(COMMITID).
      accountsPartial({
        sender: sender.publicKey,
        lockIdStruct: pda.lockIdStruct,
      }).transaction();
    const lockTx = await program.methods
      .lock(LOCKIDArray, COMMITIDArray, TIMELOCK, DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, receiver, sender.publicKey, new anchor.BN(AMOUNT), pda.htlcBump)
      .accountsPartial({
        sender: sender.publicKey,
        htlc: pda.htlcKey,
        htlcTokenAccount: pda.htlcTokenAccount,
        lockIdStruct: pda.lockIdStruct,
        tokenContract: tokenMint,
        senderTokenAccount: senderWallet
      })
      .transaction();
    console.log(`Created a new HTLC. sender will pay receiver 100 tokens`);

    setAndLock.add(initTx);
    setAndLock.add(lockTx);

    await anchor.web3.sendAndConfirmTransaction(anchor.getProvider().connection, setAndLock, [sender]);

    await new Promise((resolve) => setTimeout(resolve, 5000));

    program.removeEventListener(listenerTokenLocked);

    const lock_id = await program.methods.getLockIdByCommitId(COMMITID).accountsPartial({ lockIdStruct: pda.lockIdStruct }).rpc();

    const tx2 = await program.methods.redeem(LOCKID, SECRET, pda.htlcBump).
      accountsPartial({
        userSigning: sender.publicKey,
        htlc: pda.htlcKey,
        htlcTokenAccount: pda.htlcTokenAccount,
        sender: sender.publicKey,
        srcReceiver: receiver,
        tokenContract: tokenMint,
        srcReceiverTokenAccount: receiverTokenAccount,
      })
      .signers([sender.payer])
      .rpc();

    // Assert that 100 tokens were sent back.
    const [, receiverBalance] = await readAccount(receiverTokenAccount, provider);
    assert.equal(receiverBalance, "1000000000");

    // Assert that escrow was correctly closed.
    try {
      await readAccount(pda.htlcTokenAccount, provider);
      return assert.fail("Account should be closed");
    } catch (e) {
      assert.equal(e.message, "Cannot read properties of null (reading 'data')");
    }
  });





  // it("can pull back funds once they are deposited", async () => {
  //   const [, senderBalancePre] = await readAccount(senderWallet, provider);
  //   assert.equal(senderBalancePre, "1337000000");

  //   const amount = new anchor.BN(20000000);

  //   // Initialize mint account and fund the account
  //   const TIME = new Date().getTime();
  //   const TIMELOC = (TIME + 2500) / 1000;
  //   const TIMELOCK = new anchor.BN(TIMELOC);
  //   console.log(`[${TIMELOC * 1000}] the Timelock`);
  //   const initTx = await program.methods.initLockIdByCommitId(COMMITID).
  //     accountsPartial({
  //       sender: sender.publicKey,
  //       lockIdStruct: pda.lockIdStruct,
  //     }).transaction();
  //   const lockTx = await program.methods
  //     .lock(LOCKIDArray, COMMITIDArray, TIMELOCK, DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, receiver, sender.publicKey, new anchor.BN(AMOUNT), pda.htlcBump)
  //     .accountsPartial({
  //       sender: sender.publicKey,
  //       htlc: pda.htlcKey,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       lockIdStruct: pda.lockIdStruct,
  //       tokenContract: tokenMint,
  //       senderTokenAccount: senderWallet
  //     })
  //     .transaction();
  //   console.log(`Created a new HTLC. sender will pay receiver 100 tokens`);

  //   setAndLock.add(initTx);
  //   setAndLock.add(lockTx);

  //   await anchor.web3.sendAndConfirmTransaction(anchor.getProvider().connection, setAndLock, [sender]);
  //   // Assert that 100 tokens were moved from sender's account to the escrow.
  //   const [, senderBalancePost] = await readAccount(senderWallet, provider);
  //   assert.equal(senderBalancePost, "337000000");
  //   const [, escrowBalancePost] = await readAccount(pda.htlcTokenAccount, provider);
  //   assert.equal(escrowBalancePost, "1000000000");

  //   const details = await program.methods.getLockDetails(LOCKID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).rpc();
  //   // Withdraw the funds back
  //   await wait(2000);
  //   const CURTIME = new Date().getTime() / 1000;
  //   console.log(`[${CURTIME * 1000}] CURRENT TIME`);
  //   const tx2 = await program.methods.unlock(LOCKID, pda.htlcBump).
  //     accountsPartial({
  //       userSigning: wallet.publicKey,
  //       htlc: pda.htlcKey,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       // userSigning: sender.publicKey,
  //       sender: sender.publicKey,
  //       tokenContract: tokenMint,
  //       senderTokenAccount: senderWallet,
  //     })
  //     .signers([wallet.payer])
  //     .rpc();
  //   // Assert that 100 tokens were sent back.
  //   const postdetails = await program.methods.getLockDetails(LOCKID, pda.htlcBump).accountsPartial({ htlc: pda.htlcKey }).rpc();

  //   const [, senderBalanceunlock] = await readAccount(senderWallet, provider);
  //   assert.equal(senderBalanceunlock, "1337000000");

  //   // Assert that escrow was correctly closed.
  //   try {
  //     await readAccount(pda.htlcTokenAccount, provider);
  //     return assert.fail("Account should be closed");
  //   } catch (e) {
  //     assert.equal(e.message, "Cannot read properties of null (reading 'data')");
  //   }

  // });

});