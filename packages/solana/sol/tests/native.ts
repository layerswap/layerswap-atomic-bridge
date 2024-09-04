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
  idStruct: anchor.web3.PublicKey;
  commits: anchor.web3.PublicKey;
}

describe("safe_pay", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.NativeHtlc as anchor.Program<NativeHtlc>;

  const wallet = provider.wallet as anchor.Wallet;
  const COMMITID = randomBytes(32);
  const SECRET = randomBytes(32);
  const secretHex = SECRET.toString('hex');
  const HASHLOCK = createHash("sha256").update(SECRET).digest();
  const ID = HASHLOCK;
  const Idhex = ID.toString('hex');
  // const ID = HASHLOCK.slice(0, 32);
  console.log(`${secretHex} SECRET`);
  console.log(`${Idhex} ID`);
  const AMOUNT = 0.01 * anchor.web3.LAMPORTS_PER_SOL;
  const DSTCHAIN = "ETHEREUM";
  const DSTASSET = "ETH";
  const SRCASSET = "SOL";
  const DSTADDRESS = "0";
  const HOPCHAINS = [DSTCHAIN];
  const HOPASSETS = [DSTASSET];
  const HOPADDRESSES = [DSTADDRESS];

  // let alice: anchor.web3.Keypair;
  let bob: anchor.web3.Keypair;

  let pda: PDAParameters;

  const getPdaParams = async (
    user: PublicKey,
    id: Buffer,
    src_id: Buffer,
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
    let [idStruct, _b] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("srcId_to_Id"), src_id],
      program.programId
    );
    let [commits, commits_bump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("commits"), user.toBuffer()],
      program.programId
    );
    return {
      htlc,
      htlcBump,
      commitCounter,
      idStruct,
      commits,
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
  });
  it("create prehtlc", async () => {

    pda = await getPdaParams(wallet.publicKey, COMMITID, COMMITID);

    // const txIn = await program.methods
    //   .initialize()
    //   .accountsPartial({
    //     owner: wallet.publicKey,
    //     commitCounter: pda.commitCounter,
    //   })
    //   .signers([wallet.payer])
    //   .rpc();

    const CTIME = new Date().getTime() / 1000;
    console.log(`[${CTIME * 1000}] CURRENT TIME`);
    const TIME = new Date().getTime() + 35000;
    const TIMELOCK = new anchor.BN(TIME / 1000);
    console.log(`[${TIME}] the Timelock`);
    const IDArray: number[] = Array.from(ID);
    const COMMITIDArray: number[] = Array.from(COMMITID);

    const tx1 = await program.methods
      .commit(COMMITIDArray, HOPCHAINS, HOPASSETS, HOPADDRESSES, DSTCHAIN, DSTASSET, DSTADDRESS, SRCASSET, bob.publicKey, TIMELOCK, wallet.publicKey, new anchor.BN(AMOUNT), pda.htlcBump)
      .accountsPartial({
        sender: wallet.publicKey,
        htlc: pda.htlc,
        commitCounter: pda.commitCounter,
        commits: pda.commits,
      })
      .signers([wallet.payer])
      .rpc();
    console.log(`Initialized a new HTLC. Alice will pay bob 0.01 sol`);

    const tx3 = await program.methods.lockCommit(COMMITIDArray, IDArray, TIMELOCK).
      accountsPartial({
        messenger: wallet.publicKey,
        htlc: pda.htlc,
      })
      .signers([wallet.payer])
      .rpc();//.catch(e => console.error(e));
    console.log(`can lockCommit`);

    // const details = await program.methods.getDetails(COMMITIDArray).accountsPartial({ htlc: pda.htlc }).view();
    // console.log(`${details} details`);
    // const tx4 = await program.methods.redeem(COMMITIDArray, SECRET).
    //   accountsPartial({
    //     userSigning: wallet.publicKey,
    //     htlc: pda.htlc,
    //     srcReceiver: bob.publicKey,
    //   })
    //   .signers([wallet.payer])
    //   .rpc();


    await wait(40000);
    const tx5 = await program.methods.unlock(COMMITIDArray).
      accountsPartial({
        userSigning: wallet.publicKey,
        htlc: pda.htlc,
        sender: wallet.publicKey,
      })
      .signers([wallet.payer])
      .rpc();
  });







  // it("Bob can redeem", async () => {
  //   pda = await getPdaParams(wallet.publicKey, ID, COMMITID);

  //   const TIME = new Date().getTime();
  //   const TIMELOC = (TIME + 35000) / 1000;
  //   const TIMELOCK = new anchor.BN(TIMELOC);
  //   console.log(`[${TIMELOC * 1000}] the Timelock`);
  //   console.log("lamport balance of htlc at the beginning",
  //     await anchor.getProvider().connection.getBalance(pda.htlc));
  //   console.log("lamport balance of alice before creation",
  //     await anchor.getProvider().connection.getBalance(wallet.publicKey));
  //   const IDArray: number[] = Array.from(ID);
  //   const SRCIDArray: number[] = Array.from(COMMITID);
  //   const tx1 = await program.methods
  //     .lock(IDArray, SRCIDArray, TIMELOCK, new anchor.BN(AMOUNT), DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, bob.publicKey, wallet.publicKey, pda.htlcBump)
  //     .accountsPartial({
  //       sender: wallet.publicKey,
  //       htlc: pda.htlc,
  //       idStruct: pda.idStruct,
  //     })
  //     .signers([wallet.payer])
  //     .rpc();//.catch(e => console.error(e));
  //   console.log(`Initialized a new Safe Pay instance. Alice will pay bob 20 tokens`);

  //   const details = await program.methods.getDetails(IDArray).accountsPartial({ htlc: pda.htlc }).view();
  //   console.log(`${details} details`);

  //   console.log("lamport balance of hltc after creation",
  //     await anchor.getProvider().connection.getBalance(pda.htlc));
  //   console.log("lamport balance of bob before redeem",
  //     await anchor.getProvider().connection.getBalance(bob.publicKey));
  //   const tx2 = await program.methods.redeem(IDArray, SECRET).
  //     accountsPartial({
  //       userSigning: wallet.publicKey,
  //       htlc: pda.htlc,
  //       srcReceiver: bob.publicKey
  //     })
  //     .signers([wallet.payer])
  //     .rpc();
  //   console.log("lamport balance of alice after creation",
  //     await anchor.getProvider().connection.getBalance(wallet.publicKey));
  //   console.log(`can redeem`);
  //   console.log("lamport balance of hltc after redeem",
  //     await anchor.getProvider().connection.getBalance(pda.htlc));
  //   console.log("lamport balance of bob after redeem",
  //     await anchor.getProvider().connection.getBalance(bob.publicKey));

  //   const lockId = await program.methods.getIdBySrcId(SRCIDArray).accountsPartial({ idStruct: pda.idStruct }).view();
  //   console.log(`${lockId} the lockId from the commitId`);
  // });








  // it("can pull back funds once they are deposited", async () => {
  //   pda = await getPdaParams(wallet.publicKey, ID, COMMITID);

  //   const TIME = new Date().getTime();
  //   const TIMELOC = (TIME + 35000) / 1000;
  //   const TIMELOCK = new anchor.BN(TIMELOC);
  //   console.log(`[${TIMELOC * 1000}] the Timelock`);
  //   console.log("lamport balance of htlc at the beginning",
  //     await anchor.getProvider().connection.getBalance(pda.htlc));
  //   console.log("lamport balance of alice before creation",
  //     await anchor.getProvider().connection.getBalance(wallet.publicKey));
  //   const IDArray: number[] = Array.from(ID);
  //   const SRCIDArray: number[] = Array.from(COMMITID);
  //   const tx1 = await program.methods
  //     .lock(IDArray, SRCIDArray, TIMELOCK, new anchor.BN(AMOUNT), DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, bob.publicKey, wallet.publicKey, pda.htlcBump)
  //     .accountsPartial({
  //       sender: wallet.publicKey,
  //       htlc: pda.htlc,
  //       idStruct: pda.idStruct,
  //     })
  //     .signers([wallet.payer])
  //     .rpc();//.catch(e => console.error(e));
  //   console.log(`Initialized a new Safe Pay instance. Alice will pay bob 20 tokens`);
  //   // Withdraw the funds back

  //   await wait(40000);
  //   const CURTIME = new Date().getTime() / 1000;
  //   console.log(`[${CURTIME * 1000}] CURRENT TIME`);
  //   const tx2 = await program.methods.unlock(IDArray).
  //     accountsPartial({
  //       userSigning: wallet.publicKey,
  //       htlc: pda.htlc,
  //       sender: wallet.publicKey,
  //     })
  //     .signers([wallet.payer])
  //     .rpc();

  // });

});
