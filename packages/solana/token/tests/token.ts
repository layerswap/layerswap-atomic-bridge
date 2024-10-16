import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { randomBytes, createHash } from "crypto";
import * as spl from '@solana/spl-token';
import bs58 from 'bs58';
import { Keypair, PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
// import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { AnchorHtlc } from '../target/types/anchor_htlc';
import 'dotenv/config';
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";

interface PDAParameters {
  htlcTokenAccount: anchor.web3.PublicKey;
  htlc: anchor.web3.PublicKey;
  htlcBump: number;
}

describe("HTLC", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.AnchorHtlc as anchor.Program<AnchorHtlc>;
  const wallet = provider.wallet as anchor.Wallet;

  // const CommitIdHex = "0x57e7ff7bf1dfcb6d72e08f1b3f27ae825200af9cdaafe72d8919475ef1768c5d"
  // const SecretHex = "0xe97cda34b54b6814873e27d5e9d4c91f29f655c2aea93118138d828c4d67719b";
  // const ID = Buffer.from(CommitIdHex.replace("0x", ""), "hex");
  // const SECRET = Buffer.from(SecretHex.replace("0x", ""), "hex");
  const ID = randomBytes(32);
  const SECRET = randomBytes(32);
  const secretHex = SECRET.toString('hex');
  const HASHLOCK = createHash("sha256").update(SECRET).digest();

  console.log(`${secretHex} SECRET`);
  const IDArray: number[] = Array.from(ID);
  const SECRETArray: number[] = Array.from(SECRET);
  const HASHLOCKArray: number[] = Array.from(HASHLOCK);
  const AMOUNT = 1 * anchor.web3.LAMPORTS_PER_SOL;
  const DSTCHAIN = "STARKNET_SEPOLIA";
  const DSTADDRESS = "0x021b6a2ff227f1c71cc6536e7b9e8ecd0d5599b3a934279011e2f2b923d3a782";
  const SRCASSET = "ETH";
  const DSTASSET = "ETH";
  const HOPCHAINS = [DSTCHAIN];
  const HOPASSETS = [DSTASSET];
  const HOPADDRESSES = [DSTADDRESS];

  const sender = wallet;
  const receiver = new PublicKey(process.env.RECEIVER_ACCOUNT);
  const tokenMint = new PublicKey(process.env.USDC_ADDRESS);

  let pda: PDAParameters;
  let receiverTokenAccount: PublicKey;
  let senderTokenAccount: PublicKey;

  const getTokenAccount = async (mintAddress: PublicKey, ownerAddress: PublicKey): Promise<PublicKey> => {
    return await spl.getAssociatedTokenAddress(mintAddress, ownerAddress);
  };

  const getPdaParams = async (
    Id: Buffer,
  ): Promise<PDAParameters> => {
    // let pseed = ID.toBuffer('le', 8);
    let [htlc, htlcBump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Id],
      program.programId
    );
    let [htlcTokenAccount, htlcTokenbump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("htlc_token_account"), Id],
      program.programId
    );
    console.log(`[${htlc}] derived htlc`);
    console.log(`[${htlcTokenAccount}] derived htlc token account`);
    return {
      htlcTokenAccount,
      htlc,
      htlcBump,
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
    senderTokenAccount = await getTokenAccount(tokenMint, sender.publicKey);
    receiverTokenAccount = await getTokenAccount(tokenMint, receiver);
    pda = await getPdaParams(ID);
  });
  it("Create Prehtlc", async () => {

    const TIME = (new Date().getTime() + 15000) / 1000;
    const TIMELOCK = new anchor.BN(TIME);
    console.log(`[${TIMELOCK * 1000}] the Timelock`);

    const commitTx = await program.methods
      .commit(IDArray, HOPCHAINS, HOPASSETS, HOPADDRESSES, DSTCHAIN, DSTASSET, DSTADDRESS, SRCASSET, receiver.publicKey, TIMELOCK, new anchor.BN(AMOUNT), pda.htlcBump)
      .accountsPartial({
        sender: sender.publicKey,
        htlc: pda.htlc,
        htlcTokenAccount: pda.htlcTokenAccount,
        tokenContract: tokenMint,
        senderTokenAccount: senderTokenAccount
      })
      .signers([sender.payer])
      .rpc();

    console.log(`Initialized a new htlc`);
    const signAddLock = await program.methods.addLock(IDArray, HASHLOCKArray, TIMELOCK).
      accountsPartial({
        sender: sender.publicKey,
        payer: wallet.publicKey,
        htlc: pda.htlc,
      }).instruction();
    // .signers([sender.payer, wallet.payer])
    // .rpc();

    const signAddLockTx = new anchor.web3.Transaction().add(signAddLock);
    signAddLockTx.feePayer = wallet.publicKey;
    signAddLockTx.recentBlockhash = (
      await anchor.getProvider().connection.getLatestBlockhash()
    ).blockhash;
    await signAddLockTx.partialSign(sender.payer);
    const serialized_tx = signAddLockTx.serialize({
      requireAllSignatures: false,
    });
    console.log("serialized partial transaction", bs58.encode(serialized_tx));
    //  bs58.encode(tx.serializeMessage());
    // const rawTx = bs58.decode(serialized_tx);
    // const newtx = anchor.web3.Transaction.from(rawTx);

    await signAddLockTx.sign(wallet.payer);
    // const fullSignedTx = await wallet.signTransaction(tx);
    await anchor.web3.sendAndConfirmTransaction(anchor.getProvider().connection, signAddLockTx, [wallet.payer, wallet.payer]);

    const details = await program.methods.getDetails(IDArray).accountsPartial({ htlc: pda.htlc }).rpc();
    const redeemTx = await program.methods.redeem(IDArray, SECRETArray, pda.htlcBump).
      accountsPartial({
        userSigning: wallet.publicKey,
        htlc: pda.htlc,
        htlcTokenAccount: pda.htlcTokenAccount,
        sender: sender.publicKey,
        srcReceiver: receiver.publicKey,
        tokenContract: tokenMint,
        srcReceiverTokenAccount: receiverTokenAccount,
      })
      .signers([wallet.payer])
      .rpc();

    // await wait(20000);
    // const refundTx = await program.methods.refund(IDArray, pda.htlcBump).
    //   accountsPartial({
    //     userSigning: wallet.publicKey,
    //     htlc: pda.htlc,
    //     htlcTokenAccount: pda.htlcTokenAccount,
    //     sender: sender.publicKey,
    //     tokenContract: tokenMint,
    //     senderTokenAccount: senderTokenAccount,
    //   })
    //   .signers([wallet.payer])
    //   .rpc();

    // Assert that htlc token account was correctly closed.
    try {
      await readAccount(pda.htlcTokenAccount, provider);
      return assert.fail("Account should be closed");
    } catch (e) {
      assert.equal(e.message, "Cannot read properties of null (reading 'data')");
    }

  });



  // it("Create new HTLC and then redeem tokens", async () => {

  //   const amount = new anchor.BN(20000000);
  //   const TIME = (new Date().getTime() + 200000) / 1000;
  //   const TIMELOCK = new anchor.BN(TIME);

  //   const lockTx = await program.methods
  //     .lock(IDArray, HASHLOCKArray, TIMELOCK, DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, receiver.publicKey, new anchor.BN(AMOUNT), pda.htlcBump)
  //     .accountsPartial({
  //       sender: wallet.publicKey,
  //       htlc: pda.htlc,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       tokenContract: tokenMint,
  //       senderTokenAccount: senderTokenAccount
  //     })
  //     .signers([wallet.payer])
  //     .rpc();


  //   const redeemTx = await program.methods.redeem(IDArray, SECRETArray, pda.htlcBump).
  //     accountsPartial({
  //       userSigning: wallet.publicKey,
  //       htlc: pda.htlc,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       sender: wallet.publicKey,
  //       srcReceiver: receiver.publicKey,
  //       tokenContract: tokenMint,
  //       srcReceiverTokenAccount: receiverTokenAccount,
  //     })
  //     .signers([wallet.payer])
  //     .rpc();

  //   // Assert that HTLC Token Account was correctly closed.
  //   try {
  //     await readAccount(pda.htlcTokenAccount, provider);
  //     return assert.fail("Account should be closed");
  //   } catch (e) {
  //     assert.equal(e.message, "Cannot read properties of null (reading 'data')");
  //   }
  // });





  // it("Refund tokens after the timelock is expired", async () => {

  //   const TIME = (new Date().getTime() + 15000) / 1000;
  //   const TIMELOCK = new anchor.BN(TIME);
  //   console.log(`[${TIME * 1000}] the Timelock`);

  //   const lockTx = await program.methods
  //     .lock(IDArray, HASHLOCKArray, TIMELOCK, DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, receiver.publicKey, new anchor.BN(AMOUNT), pda.htlcBump)
  //     .accountsPartial({
  //       sender: wallet.publicKey,
  //       htlc: pda.htlc,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       tokenContract: tokenMint,
  //       senderTokenAccount: senderTokenAccount
  //     })
  //     .signers([wallet.payer])
  //     .rpc();

  //   await wait(20000);

  //   const refundTx = await program.methods.refund(IDArray, pda.htlcBump).
  //     accountsPartial({
  //       userSigning: wallet.publicKey,
  //       htlc: pda.htlc,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       sender: wallet.publicKey,
  //       tokenContract: tokenMint,
  //       senderTokenAccount: senderTokenAccount,
  //     })
  //     .signers([wallet.payer])
  //     .rpc();
  //   // Assert that 100 tokens were sent back.

  //   // Assert that HTLC Token Account was correctly closed.
  //   try {
  //     await readAccount(pda.htlcTokenAccount, provider);
  //     return assert.fail("Account should be closed");
  //   } catch (e) {
  //     assert.equal(e.message, "Cannot read properties of null (reading 'data')");
  //   }

  // });

});