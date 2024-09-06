import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { randomBytes, createHash } from "crypto";
import { NativeHtlc } from '../target/types/native_htlc';

interface PDAParameters {
  htlc: anchor.web3.PublicKey;
  htlcBump: number;
  commitCounter: anchor.web3.PublicKey;
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

  let bob: anchor.web3.Keypair;

  let pda: PDAParameters;

  const getPdaParams = async (
    user: PublicKey,
    id: Buffer,
  ): Promise<PDAParameters> => {
    let [htlc, htlcBump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [id],
      program.programId
    );
    console.log(`[${htlc}] derived htlc`);

    let [commitCounter, _] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("commitCounter")],
      program.programId
    );
    return {
      htlc,
      htlcBump,
      commitCounter,
    };
  };

  const createUser = async (): Promise<anchor.web3.Keypair> => {
    const user = new anchor.web3.Keypair();
    // Fund user with some SOL
    let txFund = new anchor.web3.Transaction();
    txFund.add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: user.publicKey,
        lamports: 0.005 * anchor.web3.LAMPORTS_PER_SOL,
      })
    );
    const sigTxFund = await provider.sendAndConfirm(txFund);
    console.log(`[${user.publicKey.toBase58()}] Funded new account with 0.005 SOL: ${sigTxFund}`);
    return user;
  };

  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  before(async () => {
    bob = await createUser();
    pda = await getPdaParams(wallet.publicKey, ID);
  });
  // it("create prehtlc", async () => {

  //   // const txIn = await program.methods
  //   //   .initialize()
  //   //   .accountsPartial({
  //   //     owner: wallet.publicKey,
  //   //     commitCounter: pda.commitCounter,
  //   //   })
  //   //   .signers([wallet.payer])
  //   //   .rpc();

  //   const CTIME = new Date().getTime;
  //   console.log(`[${CTIME}] CURRENT TIME`);
  //   const TIME = new Date().getTime() + 15000;
  //   const TIMELOCK = new anchor.BN(TIME / 1000);
  //   console.log(`[${TIME}] the Timelock`);

  //   const commitTx = await program.methods
  //     .commit(IDArray, HOPCHAINS, HOPASSETS, HOPADDRESSES, DSTCHAIN, DSTASSET, DSTADDRESS, SRCASSET, bob.publicKey, TIMELOCK, wallet.publicKey, new anchor.BN(AMOUNT), pda.htlcBump)
  //     .accountsPartial({
  //       sender: wallet.publicKey,
  //       htlc: pda.htlc,
  //       commitCounter: pda.commitCounter,
  //     })
  //     .signers([wallet.payer])
  //     .rpc();
  //   console.log(`Initialized a new HTLC. Alice will pay bob 0.01 sol`);

  //   const addLockTx = await program.methods.addLock(IDArray, HASHLOCKArray, TIMELOCK).
  //     accountsPartial({
  //       messenger: wallet.publicKey,
  //       htlc: pda.htlc,
  //     })
  //     .signers([wallet.payer])
  //     .rpc();//.catch(e => console.error(e));
  //   console.log(`can addLock`);

  //   const tx4 = await program.methods.redeem(IDArray, SECRETArray).
  //     accountsPartial({
  //       userSigning: wallet.publicKey,
  //       htlc: pda.htlc,
  //       srcReceiver: bob.publicKey,
  //     })
  //     .signers([wallet.payer])
  //     .rpc();


  //   // await wait(20000);
  //   // const refundTx = await program.methods.refund(IDArray).
  //   //   accountsPartial({
  //   //     userSigning: wallet.publicKey,
  //   //     htlc: pda.htlc,
  //   //     sender: wallet.publicKey,
  //   //   })
  //   //   .signers([wallet.payer])
  //   //   .rpc();
  // });







  it("Bob can redeem with the correct secret", async () => {

    const TIME = new Date().getTime() + 15000;
    const TIMELOCK = new anchor.BN(TIME / 1000);
    console.log("lamport balance of htlc at the beginning",
      await anchor.getProvider().connection.getBalance(pda.htlc));
    console.log("lamport balance of wallet at the beginning",
      await anchor.getProvider().connection.getBalance(wallet.publicKey));
    const tx1 = await program.methods
      .lock(IDArray, HASHLOCKArray, TIMELOCK, new anchor.BN(AMOUNT), DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, bob.publicKey, wallet.publicKey, pda.htlcBump)
      .accountsPartial({
        sender: wallet.publicKey,
        htlc: pda.htlc,
      })
      .signers([wallet.payer])
      .rpc();//.catch(e => console.error(e));

    const details = await program.methods.getDetails(IDArray).accountsPartial({ htlc: pda.htlc }).view();
    console.log(`${details} details`);

    console.log("lamport balance of hltc after lock",
      await anchor.getProvider().connection.getBalance(pda.htlc));
    console.log("lamport balance of bob after lock",
      await anchor.getProvider().connection.getBalance(bob.publicKey));
    const redeemTx = await program.methods.redeem(IDArray, SECRETArray).
      accountsPartial({
        userSigning: wallet.publicKey,
        htlc: pda.htlc,
        srcReceiver: bob.publicKey
      })
      .signers([wallet.payer])
      .rpc();
    console.log("lamport balance of wallet after redeem",
      await anchor.getProvider().connection.getBalance(wallet.publicKey));
    console.log(`can redeem`);
    console.log("lamport balance of hltc after redeem",
      await anchor.getProvider().connection.getBalance(pda.htlc));
    console.log("lamport balance of bob after redeem",
      await anchor.getProvider().connection.getBalance(bob.publicKey));
  });








  // it("can refund after the timelock expired", async () => {

  //   const TIME = new Date().getTime() + 15000;
  //   const TIMELOCK = new anchor.BN(TIME / 1000);
  //   console.log(`[${TIMELOCK * 1000}] the Timelock`);
  //   console.log("lamport balance of htlc at the beginning",
  //     await anchor.getProvider().connection.getBalance(pda.htlc));
  //   console.log("lamport balance of wallet at the begining",
  //     await anchor.getProvider().connection.getBalance(wallet.publicKey));

  //   const lockTx = await program.methods
  //     .lock(IDArray, HASHLOCKArray, TIMELOCK, new anchor.BN(AMOUNT), DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, bob.publicKey, wallet.publicKey, pda.htlcBump)
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
