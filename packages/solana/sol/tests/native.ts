import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { randomBytes, createHash } from "crypto";
import bs58 from 'bs58';
import { NativeHtlc } from '../target/types/native_htlc';
interface HTLCParameters {
  htlc: anchor.web3.PublicKey;
  htlcBump: number;
}

describe("HTLC", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.NativeHtlc as anchor.Program<NativeHtlc>;
  const wallet = provider.wallet as anchor.Wallet;
  const ID = randomBytes(32);
  const SECRET = randomBytes(32);
  const HASHLOCK = createHash("sha256").update(SECRET).digest();
  const IDArray: number[] = Array.from(ID);
  const SECRETArray: number[] = Array.from(SECRET);
  const HASHLOCKArray: number[] = Array.from(HASHLOCK);
  const AMOUNT = 0.01 * anchor.web3.LAMPORTS_PER_SOL;
  const DSTCHAIN = "ETHEREUM_SEPOLIA";
  const DSTASSET = "ETH";
  const SRCASSET = "SOL";
  const DSTADDRESS = "0x021b6a2ff227f1c71cc6536e7b9e8ecd0d5599b3a934279011e2f2b923d3a782";
  const HOPCHAINS = [DSTCHAIN];
  const HOPASSETS = [DSTASSET];
  const HOPADDRESSES = [DSTADDRESS];

  const ZEROS = new Uint8Array(32);
  const secretHex = SECRET.toString('hex');
  const Idhex = ID.toString('hex');
  console.log(`${SECRETArray} SECRET`);
  console.log(`${Idhex} ID`);

  let alice: anchor.web3.Keypair;
  let user: anchor.Wallet;
  let bob: anchor.web3.Keypair;
  let pda: HTLCParameters;

  const getHTLC = async (
    id: Buffer,
  ): Promise<HTLCParameters> => {
    let [htlc, htlcBump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [id],
      program.programId
    );
    console.log(`[${htlc}] derived htlc`);
    return {
      htlc,
      htlcBump,
    };
  };

  const createUser = async (): Promise<anchor.web3.Keypair> => {
    const user = new anchor.web3.Keypair();
    const userWallet = new anchor.Wallet(user);
    // Fund user with some SOL
    let txFund = new anchor.web3.Transaction();
    txFund.add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: userWallet.publicKey,
        lamports: 0.05 * anchor.web3.LAMPORTS_PER_SOL,
      })
    );
    const sigTxFund = await provider.sendAndConfirm(txFund);
    console.log(`[${user.publicKey.toBase58()}] Funded new account with 0.05 SOL: ${sigTxFund}`);
    return user;
  };

  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  before(async () => {
    user = wallet;
    alice = await createUser();
    bob = await createUser();
    pda = await getHTLC(ID);
    signature = await ed.sign(MSG, alice.secretKey.slice(0, 32));
  });
  it("create prehtlc", async () => {

    const TIME = new Date().getTime() + 12000;
    const TIMELOCK = new anchor.BN(TIME / 1000);
    console.log("lamport balance of wallet before commit",
      await anchor.getProvider().connection.getBalance(wallet.publicKey));
    const commitTx = await program.methods
      .commit(IDArray, HOPCHAINS, HOPASSETS, HOPADDRESSES, DSTCHAIN, DSTASSET, DSTADDRESS, SRCASSET, wallet.publicKey, TIMELOCK, new anchor.BN(AMOUNT), pda.htlcBump)
      .accountsPartial({
        sender: user.publicKey,
        htlc: pda.htlc,
      })
      .signers([user.payer])
      .rpc();

    console.log("lamport balance of wallet before addLock",
      await anchor.getProvider().connection.getBalance(wallet.publicKey));
    console.log("lamport balance of Alice-wallet before addLock",
      await anchor.getProvider().connection.getBalance(user.publicKey));

    const signAddLock = await program.methods.addLock(IDArray, HASHLOCKArray, TIMELOCK).
      accountsPartial({
        sender: user.publicKey,
        payer: wallet.publicKey,
        htlc: pda.htlc,
      }).instruction();
    const tx = new anchor.web3.Transaction().add(signAddLock);
    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = (
      await anchor.getProvider().connection.getLatestBlockhash()
    ).blockhash;
    await tx.partialSign(user.payer);
    const serialized_tx = tx.serialize({
      requireAllSignatures: false,
    });
    console.log("serialized partial transaction", serialized_tx);
    //  bs58.encode(tx.serializeMessage());

    // const rawTx = bs58.decode(serialized_tx);
    // const newtx = anchor.web3.Transaction.from(rawTx);
    await tx.sign(wallet.payer);
    // const fullSignedTx = await wallet.signTransaction(tx);

    await anchor.web3.sendAndConfirmTransaction(anchor.getProvider().connection, tx, [user.payer, wallet.payer]);
    // const txSignature = await anchor.getProvider().connection.sendRawTransaction(
    //   Buffer.from(tx.serialize())
    // );
    console.log("lamport balance of wallet after addLock",
      await anchor.getProvider().connection.getBalance(wallet.publicKey));
    console.log("lamport balance of Alice-wallet after addLock",
      await anchor.getProvider().connection.getBalance(user.publicKey));
    const tx4 = await program.methods.redeem(IDArray, SECRETArray).
      accountsPartial({
        userSigning: user.publicKey,
        htlc: pda.htlc,
        srcReceiver: wallet.publicKey,
      })
      .signers([user.payer])
      .rpc();
    console.log("lamport balance of Alice-wallet after  redeem",
      await anchor.getProvider().connection.getBalance(user.publicKey));

    // await wait(15000);
    // const refundTx = await program.methods.refund(IDArray).
    //   accountsPartial({
    //     userSigning: wallet.publicKey,
    //     htlc: pda.htlc,
    //     sender: wallet.publicKey,
    //   })
    //   .signers([wallet.payer])
    //   .rpc();
  });







  // it("Bob can redeem with the correct secret", async () => {

  //   const TIME = new Date().getTime() + 15000;
  //   const TIMELOCK = new anchor.BN(TIME / 1000);
  //   console.log("lamport balance of htlc at the beginning",
  //     await anchor.getProvider().connection.getBalance(pda.htlc));
  //   console.log("lamport balance of wallet at the beginning",
  //     await anchor.getProvider().connection.getBalance(wallet.publicKey));
  //   const tx1 = await program.methods
  //     .lock(IDArray, HASHLOCKArray, TIMELOCK, new anchor.BN(AMOUNT), DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, bob.publicKey, pda.htlcBump)
  //     .accountsPartial({
  //       sender: wallet.publicKey,
  //       htlc: pda.htlc,
  //     })
  //     .signers([wallet.payer])
  //     .rpc();//.catch(e => console.error(e));

  //   const details = await program.methods.getDetails(IDArray).accountsPartial({ htlc: pda.htlc }).view();
  //   console.log(`${details} details`);

  //   console.log("lamport balance of hltc after lock",
  //     await anchor.getProvider().connection.getBalance(pda.htlc));
  //   console.log("lamport balance of bob after lock",
  //     await anchor.getProvider().connection.getBalance(bob.publicKey));
  //   const redeemTx = await program.methods.redeem(IDArray, SECRETArray).
  //     accountsPartial({
  //       userSigning: wallet.publicKey,
  //       htlc: pda.htlc,
  //       srcReceiver: bob.publicKey
  //     })
  //     .signers([wallet.payer])
  //     .rpc();
  //   console.log("lamport balance of wallet after redeem",
  //     await anchor.getProvider().connection.getBalance(wallet.publicKey));
  //   console.log("lamport balance of hltc after redeem",
  //     await anchor.getProvider().connection.getBalance(pda.htlc));
  //   console.log("lamport balance of bob after redeem",
  //     await anchor.getProvider().connection.getBalance(bob.publicKey));
  // });








  // it("can refund after the timelock expired", async () => {

  //   const TIME = new Date().getTime() + 15000;
  //   const TIMELOCK = new anchor.BN(TIME / 1000);
  //   console.log(`[${TIMELOCK * 1000}] the Timelock`);
  //   console.log("lamport balance of htlc at the beginning",
  //     await anchor.getProvider().connection.getBalance(pda.htlc));
  //   console.log("lamport balance of wallet at the begining",
  //     await anchor.getProvider().connection.getBalance(wallet.publicKey));

  //   const lockTx = await program.methods
  //     .lock(IDArray, HASHLOCKArray, TIMELOCK, new anchor.BN(AMOUNT), DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, bob.publicKey, pda.htlcBump)
  //     .accountsPartial({
  //       sender: wallet.publicKey,
  //       htlc: pda.htlc,
  //     })
  //     .signers([wallet.payer])
  //     .rpc();//.catch(e => console.error(e));

  //   console.log("lamport balance of hltc after lock",
  //     await anchor.getProvider().connection.getBalance(pda.htlc));
  //   console.log("lamport balance of wallet before redeem",
  //     await anchor.getProvider().connection.getBalance(wallet.publicKey));

  //   // Withdraw the funds back
  //   await wait(20000);
  //   const CURTIME = new Date().getTime() / 1000;
  //   console.log(`[${CURTIME * 1000}] CURRENT TIME`);
  //   const refundTx = await program.methods.refund(IDArray).
  //     accountsPartial({
  //       userSigning: wallet.publicKey,
  //       htlc: pda.htlc,
  //       sender: wallet.publicKey,
  //     })
  //     .signers([wallet.payer])
  //     .rpc();

  //   console.log("lamport balance of hltc after refund",
  //     await anchor.getProvider().connection.getBalance(pda.htlc));
  //   console.log("lamport balance of wallet after refund",
  //     await anchor.getProvider().connection.getBalance(wallet.publicKey));
  // });

});
