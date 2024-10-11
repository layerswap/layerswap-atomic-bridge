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
}

describe("HTLC", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.AnchorHtlc as anchor.Program<AnchorHtlc>;
  const wallet = provider.wallet as anchor.Wallet;

  // const ID = new anchor.BN(24);
  const ZEROS = new Uint8Array(32);
  const ID = randomBytes(32);
  const SECRET = randomBytes(32);
  const secretHex = SECRET.toString('hex');
  const HASHLOCK = createHash("sha256").update(SECRET).digest();

  // const ID = HASHLOCK.slice(0, 32);
  console.log(`${secretHex} SECRET`);
  const IDArray: number[] = Array.from(ID);
  const SECRETArray: number[] = Array.from(SECRET);
  const HASHLOCKArray: number[] = Array.from(HASHLOCK);
  //const TIMELOCK = new anchor.BN(Date.now() - 3);
  const AMOUNT = 1 * anchor.web3.LAMPORTS_PER_SOL;
  const DSTCHAIN = "STARKNET_SEPOLIA";
  const DSTADDRESS = "0x021b6a2ff227f1c71cc6536e7b9e8ecd0d5599b3a934279011e2f2b923d3a782";
  const SRCASSET = "ETH";
  const DSTASSET = "ETH";
  const HOPCHAINS = [DSTCHAIN];
  const HOPASSETS = [DSTASSET];
  const HOPADDRESSES = [DSTADDRESS];

  let tokenMint: anchor.web3.PublicKey;
  let walletTokenAccount: anchor.web3.PublicKey;
  let bob: anchor.web3.Keypair;
  let pda: PDAParameters;

  const getPdaParams = async (
    user: PublicKey,
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

  const mintTokensForUser = async (
    user: anchor.web3.PublicKey,
    mint: anchor.web3.PublicKey
  ): Promise<anchor.web3.PublicKey> => {
    let userAssociatedTokenAccount: anchor.web3.PublicKey | undefined = undefined;

    // Create a token account for the wallet and mint some tokens
    userAssociatedTokenAccount = await spl.getAssociatedTokenAddress(mint, user);
    const txFundTokenAccount = new anchor.web3.Transaction();
    txFundTokenAccount.add(
      spl.createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        userAssociatedTokenAccount,
        user,
        mint
      )
    );
    txFundTokenAccount.add(spl.createMintToInstruction(mint, userAssociatedTokenAccount, provider.wallet.publicKey, 1337000000));
    const txFundTokenSig = await provider.sendAndConfirm(txFundTokenAccount);
    console.log(`[${userAssociatedTokenAccount.toBase58()}] New associated account for mint ${mint.toBase58()}: ${txFundTokenSig}`);

    return userAssociatedTokenAccount;
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
    let _rest;
    tokenMint = await createMint();
    walletTokenAccount = await mintTokensForUser(wallet.publicKey, tokenMint);
    [bob, ..._rest] = await createUserAndAssociatedWallet();
    pda = await getPdaParams(wallet.publicKey, ID);
  });
  // it("Create Prehtlc", async () => {

  //   const [, WalletBalancePre] = await readAccount(walletTokenAccount, provider);
  //   assert.equal(WalletBalancePre, "1337000000");

  //   // const txIn = await program.methods
  //   //   .initialize()
  //   //   .accountsPartial({
  //   //     owner: wallet.publicKey,
  //   //   })
  //   //   .signers([wallet.payer])
  //   //   .rpc();//.catch(e => console.error(e));

  //   const TIME = (new Date().getTime() + 15000) / 1000;
  //   const TIMELOCK = new anchor.BN(TIME);
  //   console.log(`[${TIMELOCK * 1000}] the Timelock`);

  //   const commitTx = await program.methods
  //     .commit(IDArray, HOPCHAINS, HOPASSETS, HOPADDRESSES, DSTCHAIN, DSTASSET, DSTADDRESS, SRCASSET, bob.publicKey, TIMELOCK, new anchor.BN(AMOUNT), pda.htlcBump)
  //     .accountsPartial({
  //       sender: wallet.publicKey,
  //       htlc: pda.htlc,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       tokenContract: tokenMint,
  //       senderTokenAccount: walletTokenAccount
  //     })
  //     .signers([wallet.payer])
  //     .rpc();

  //   console.log(`Initialized a new htlc. We will pay bob 100 tokens`);

  //   // Assert that 100 tokens were moved from our account to the HTLC Account.
  //   const [, WalletBalancePost] = await readAccount(walletTokenAccount, provider);
  //   assert.equal(WalletBalancePost, "337000000");
  //   const [, htlcBalance] = await readAccount(pda.htlcTokenAccount, provider);
  //   assert.equal(htlcBalance, "1000000000");

  //   const lockCommitTx = await program.methods.addLock(IDArray, HASHLOCKArray, TIMELOCK).
  //     accountsPartial({
  //       sender: wallet.publicKey,
  //       htlc: pda.htlc,
  //     }).signers([wallet.payer])
  //     .rpc();

  //   const [, htlcBalancePost] = await readAccount(pda.htlcTokenAccount, provider);
  //   assert.equal(htlcBalancePost, "1000000000");

  //   console.log(`Bob token`);
  //   // Create a token account for Bob.
  //   const bobTokenAccount = await spl.getAssociatedTokenAddress(
  //     tokenMint,
  //     bob.publicKey
  //   )
  //   const details = await program.methods.getDetails(IDArray).accountsPartial({ htlc: pda.htlc }).rpc();
  //   console.log(`[${details}] the details`);
  //   const redeemTx = await program.methods.redeem(IDArray, SECRETArray, pda.htlcBump).
  //     accountsPartial({
  //       userSigning: wallet.publicKey,
  //       htlc: pda.htlc,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       sender: wallet.publicKey,
  //       srcReceiver: bob.publicKey,
  //       tokenContract: tokenMint,
  //       srcReceiverTokenAccount: bobTokenAccount,
  //     })
  //     .signers([wallet.payer])
  //     .rpc();

  //   //Assert that 100 tokens were sent to bob.
  //   const [, bobBalance] = await readAccount(bobTokenAccount, provider);
  //   assert.equal(bobBalance, "1000000000");

  //   // await wait(20000);
  //   // const refundTx = await program.methods.refund(IDArray, pda.htlcBump).
  //   //   accountsPartial({
  //   //     userSigning: wallet.publicKey,
  //   //     htlc: pda.htlc,
  //   //     htlcTokenAccount: pda.htlcTokenAccount,
  //   //     sender: wallet.publicKey,
  //   //     tokenContract: tokenMint,
  //   //     senderTokenAccount: walletTokenAccount,
  //   //   })
  //   //   .signers([wallet.payer])
  //   //   .rpc();

  //   // const [, WalletBalanceRefund] = await readAccount(walletTokenAccount, provider);
  //   // assert.equal(WalletBalanceRefund, "1337000000");

  //   // Assert that htlc token account was correctly closed.
  //   try {
  //     await readAccount(pda.htlcTokenAccount, provider);
  //     return assert.fail("Account should be closed");
  //   } catch (e) {
  //     assert.equal(e.message, "Cannot read properties of null (reading 'data')");
  //   }

  // });



  // it("Create new HTLC and then redeem tokens", async () => {
  //   const [, WalletBalancePre] = await readAccount(walletTokenAccount, provider);
  //   assert.equal(WalletBalancePre, "1337000000");

  //   const amount = new anchor.BN(20000000);
  //   const TIME = (new Date().getTime() + 200000) / 1000;
  //   const TIMELOCK = new anchor.BN(TIME);
  //   // const listenerTokenLocked = program.addEventListener('tokenLocked', (event, slot) => {
  //   //   console.log(`slot ${slot}`);
  //   //   console.log(`tokenLocked hashlock ${event.hashlock}`);
  //   //   console.log(`tokenLocked dstChain ${event.dstChain}`);
  //   //   console.log(`tokenLocked dstAddress ${event.dstAddress}`);
  //   //   console.log(`tokenLocked dstAsset ${event.dstAsset}`);
  //   //   console.log(`tokenLocked sender ${event.sender}`);
  //   //   console.log(`tokenLocked srcReceiver ${event.srcReceiver}`);
  //   //   console.log(`tokenLocked srcAsset ${event.srcAsset}`);
  //   //   console.log(`tokenLocked amount ${event.amount}`);
  //   //   console.log(`tokenLocked timelock ${event.timelock}`);
  //   //   console.log(`tokenLocked ID ${event.ID}`);
  //   //   console.log(`tokenLocked tokenContract ${event.tokenContract}`);
  //   // });

  //   // await new Promise((resolve) => setTimeout(resolve, 5000));
  //   // program.removeEventListener(listenerTokenLocked);



  //   const lockTx = await program.methods
  //     .lock(IDArray, HASHLOCKArray, TIMELOCK, DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, bob.publicKey, new anchor.BN(AMOUNT), pda.htlcBump)
  //     .accountsPartial({
  //       sender: wallet.publicKey,
  //       htlc: pda.htlc,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       tokenContract: tokenMint,
  //       senderTokenAccount: walletTokenAccount
  //     })
  //     .signers([wallet.payer])
  //     .rpc();


  //   // Assert that 100 tokens were moved from our account to the HTLC Token Account.
  //   const [, WalletBalancePost] = await readAccount(walletTokenAccount, provider);
  //   assert.equal(WalletBalancePost, "337000000");
  //   const [, htlcTokenBalance] = await readAccount(pda.htlcTokenAccount, provider);
  //   assert.equal(htlcTokenBalance, "1000000000");

  //   console.log(`Bob token`);
  //   // Create a token account for Bob.
  //   const bobTokenAccount = await spl.getAssociatedTokenAddress(
  //     tokenMint,
  //     bob.publicKey
  //   )
  //   const redeemTx = await program.methods.redeem(IDArray, SECRETArray, pda.htlcBump).
  //     accountsPartial({
  //       userSigning: wallet.publicKey,
  //       htlc: pda.htlc,
  //       htlcTokenAccount: pda.htlcTokenAccount,
  //       sender: wallet.publicKey,
  //       srcReceiver: bob.publicKey,
  //       tokenContract: tokenMint,
  //       srcReceiverTokenAccount: bobTokenAccount,
  //     })
  //     .signers([wallet.payer])
  //     .rpc();

  //   // Assert that 100 tokens were sent to bob.
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





  it("Refund tokens after the timelock is expired", async () => {
    const [, WalletBalancePre] = await readAccount(walletTokenAccount, provider);
    assert.equal(WalletBalancePre, "1337000000");

    const TIME = (new Date().getTime() + 15000) / 1000;
    const TIMELOCK = new anchor.BN(TIME);
    console.log(`[${TIME * 1000}] the Timelock`);

    const lockTx = await program.methods
      .lock(IDArray, HASHLOCKArray, TIMELOCK, DSTCHAIN, DSTADDRESS, DSTASSET, SRCASSET, bob.publicKey, new anchor.BN(AMOUNT), pda.htlcBump)
      .accountsPartial({
        sender: wallet.publicKey,
        htlc: pda.htlc,
        htlcTokenAccount: pda.htlcTokenAccount,
        tokenContract: tokenMint,
        senderTokenAccount: walletTokenAccount
      })
      .signers([wallet.payer])
      .rpc();

    // Assert that 100 tokens were moved from our account to the HTLC Account.
    const [, WalletBalancePost] = await readAccount(walletTokenAccount, provider);
    assert.equal(WalletBalancePost, "337000000");
    const [, htlcTokenBalance] = await readAccount(pda.htlcTokenAccount, provider);
    assert.equal(htlcTokenBalance, "1000000000");
    // Withdraw the funds back
    await wait(20000);
    const CURTIME = new Date().getTime();
    console.log(`[${CURTIME}] CURRENT TIME`);
    const refundTx = await program.methods.refund(IDArray, pda.htlcBump).
      accountsPartial({
        userSigning: wallet.publicKey,
        htlc: pda.htlc,
        htlcTokenAccount: pda.htlcTokenAccount,
        sender: wallet.publicKey,
        tokenContract: tokenMint,
        senderTokenAccount: walletTokenAccount,
      })
      .signers([wallet.payer])
      .rpc();
    // Assert that 100 tokens were sent back.

    const [, WalletBalanceRefund] = await readAccount(walletTokenAccount, provider);
    assert.equal(WalletBalanceRefund, "1337000000");

    // Assert that HTLC Token Account was correctly closed.
    try {
      await readAccount(pda.htlcTokenAccount, provider);
      return assert.fail("Account should be closed");
    } catch (e) {
      assert.equal(e.message, "Cannot read properties of null (reading 'data')");
    }

  });

});