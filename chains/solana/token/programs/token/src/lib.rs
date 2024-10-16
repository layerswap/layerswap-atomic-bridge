/*                                                 __     _____
| |    __ _ _   _  ___ _ __ _____      ____ _ _ __ \ \   / ( _ )
| |   / _` | | | |/ _ \ '__/ __\ \ /\ / / _` | '_ \ \ \ / // _ \
| |__| (_| | |_| |  __/ |  \__ \\ V  V / (_| | |_) | \ V /| (_) |
|_____\__,_|\__, |\___|_|  |___/ \_/\_/ \__,_| .__/   \_/  \___/
            |___/                            |_|

*/

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{CloseAccount, Mint, Token, TokenAccount, Transfer},
};
use sha2::{Digest, Sha256};
use std::mem::size_of;
declare_id!("9GKpxBRPqXo8zQPp9QZYbQjqcnNHn6sRjb6tEsPhxTnh");

const OWNER: &str = "H732946dBhRx5pBbJnFJK7Gy4K6mSA5Svdt1eueExrTp";

/// @title Pre Hashed Timelock Contracts (PHTLCs) on Solana SPL tokens.
///
/// This contract provides a way to lock and keep PHTLCs for SPL tokens.
///
/// Protocol:
///
///  1) commit(srcReceiver, timelock, tokenContract, amount) - a
///      sender calls this to create a new PHTLC on a given token (tokenContract)
///      for the given amount. A String commitId is returned.
///  2) lock(srcReceiver, hashlock, timelock, tokenContract, amount) - a
///      sender calls this to create a new HTLC on a given token (tokenContract)
///      for the given amount. A String lockId is returned.
///  3) lockCommit(commitId, hashlock) - the messenger calls this function
///      to convert the PHTLC to HTLC with the given hashlock.
///  4) redeem(lockId, secret) - once the srcReceiver knows the secret of
///      the hashlock hash they can claim the tokens with this function
///  5) unlock(lockId) - after timelock has expired and if the srcReceiver did not
///      redeem the tokens the sender / creator of the HTLC can get their tokens
///      back with this function.
///  6) uncommit(commitId) - after timelock has expired and if the messenger did not
///      lockCommit the PHTLC, then the sender can get their tokens
///      back with this function.

/// @dev A small utility function that allows us to transfer funds out of the htlc / phtlc.
///
/// * `sender` - htlc/phtlc creator's account
/// * `lockId` - The index of the htlc
/// * `htlc` - the htlc/phtlc public key (PDA)
/// * `htlc_bump` - the htlc/phtlc public key (PDA) bump
/// * `htlc_token_account` - The htlc/phtlc Token account
/// * `token_program` - the token program address
/// * `destination_wallet` - The public key of the destination address (where to send funds)
/// * `amount` - the amount of token that is sent from `htlc_token_account` to `destination_wallet`
fn transfer_htlc_out<'info>(
    sender: AccountInfo<'info>,
    lockId: [u8; 32],
    htlc: AccountInfo<'info>,
    htlc_bump: u8,
    htlc_token_account: &mut Account<'info, TokenAccount>,
    token_program: AccountInfo<'info>,
    destination_wallet: AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    let bump_vector = htlc_bump.to_le_bytes();
    let inner = vec![lockId.as_ref(), bump_vector.as_ref()];
    let outer = vec![inner.as_slice()];

    // Perform the actual transfer
    let transfer_instruction = Transfer {
        from: htlc_token_account.to_account_info(),
        to: destination_wallet,
        authority: htlc.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        transfer_instruction,
        outer.as_slice(),
    );
    anchor_spl::token::transfer(cpi_ctx, amount)?;

    // Use the `reload()` function on an account to reload it's state. Since we performed the
    // transfer, we are expecting the `amount` field to have changed.
    let should_close = {
        htlc_token_account.reload()?;
        htlc_token_account.amount == 0
    };

    // If token account has no more tokens, it should be wiped out since it has no other use case.
    if should_close {
        let ca = CloseAccount {
            account: htlc_token_account.to_account_info(),
            destination: sender.to_account_info(),
            authority: htlc.to_account_info(),
        };
        let cpi_ctx =
            CpiContext::new_with_signer(token_program.to_account_info(), ca, outer.as_slice());
        anchor_spl::token::close_account(cpi_ctx)?;
    }

    Ok(())
}

#[program]
pub mod anchor_htlc {

    use super::*;
    use anchor_spl::token::Transfer;

    /// @dev Called by the owner(only once) to initialize the commit Counter.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.owner.key(),
            OWNER.parse::<Pubkey>().unwrap(),
            HTLCError::NotOwner
        );
        let clock = Clock::get().unwrap();
        let time = clock.unix_timestamp.try_into().unwrap();
        let commit_counter = &mut ctx.accounts.commitCounter;
        commit_counter.count = 0;
        commit_counter.time = time;
        Ok(())
    }

    /// @dev Called by the Sender to get the commitId from the given parameters.
    pub fn get_commit_id(ctx: Context<Get_commit_id>) -> Result<u64> {
        let commit_counter = &ctx.accounts.commitCounter;
        let count = commit_counter.count + 1;
        let time = commit_counter.time;

        Ok(time ^ count)
    }

    /// @dev Sender / Payer sets up a new pre-hash time lock contract depositing the
    /// funds and providing the reciever/srcReceiver and terms.
    /// @param srcReceiver reciever of the funds.
    /// @param timelock UNIX epoch seconds time that the lock expires at.
    ///                  Refunds can be made after this time.
    /// @return Id of the new PHTLC. This is needed for subsequent calls.
    pub fn commit(
        ctx: Context<Commit>,
        commitId: [u8; 32],
        hopChains: Vec<String>,
        hopAssets: Vec<String>,
        hopAddress: Vec<String>,
        dst_chain: String,
        dst_asset: String,
        dst_address: String,
        src_asset: String,
        srcReceiver: Pubkey,
        timelock: u64,
        messenger: Pubkey,
        amount: u64,
        phtlc_bump: u8,
    ) -> Result<()> {
        let clock = Clock::get().unwrap();
        require!(
            timelock > clock.unix_timestamp.try_into().unwrap(),
            HTLCError::NotFutureTimeLock
        );
        require!(amount != 0, HTLCError::FundsNotSent);
        let phtlc = &mut ctx.accounts.phtlc;
        let bump_vector = phtlc_bump.to_le_bytes();
        let inner = vec![commitId.as_ref(), bump_vector.as_ref()];
        let outer = vec![inner.as_slice()];
        let transfer_context = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sender_token_account.to_account_info(),
                to: ctx.accounts.phtlc_token_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
            outer.as_slice(),
        );
        anchor_spl::token::transfer(transfer_context, amount)?;

        phtlc.dst_chain = dst_chain.clone();
        phtlc.dst_address = dst_address.clone();
        phtlc.dst_asset = dst_asset.clone();
        phtlc.src_asset = src_asset.clone();
        phtlc.sender = *ctx.accounts.sender.to_account_info().key;
        phtlc.srcReceiver = srcReceiver;
        phtlc.lockId = [0u8; 32];
        phtlc.amount = amount;
        phtlc.timelock = timelock;
        phtlc.messenger = messenger;
        phtlc.token_contract = *ctx.accounts.token_contract.to_account_info().key;
        phtlc.token_wallet = *ctx.accounts.phtlc_token_account.to_account_info().key;
        phtlc.locked = false;
        phtlc.uncommitted = false;

        emit!(TokenCommitted {
            commitId: commitId,
            hopChains: hopChains.clone(),
            hopAssets: hopAssets.clone(),
            hopAddress: hopAddress.clone(),
            dst_chain: dst_chain.clone(),
            dst_address: dst_address.clone(),
            dst_asset: dst_asset.clone(),
            sender: *ctx.accounts.sender.to_account_info().key,
            srcReceiver: srcReceiver,
            src_asset: src_asset.clone(),
            amount: amount,
            timelock: timelock,
            messenger: messenger,
            token_contract: *ctx.accounts.token_contract.to_account_info().key,
        });
        msg!("commitId: {:?}", hex::encode(commitId));
        let commit_counter = &mut ctx.accounts.commitCounter;
        commit_counter.count += 1;
        let commits = &mut ctx.accounts.commits;
        commits.commitIds.push(commitId);
        Ok(())
    }

    /// @dev Sender / Payer sets up a new hash time lock contract depositing the
    /// funds and providing the reciever and terms.
    /// @param srcReceiver receiver of the funds.
    /// @param hashlock A sha-256 hash hashlock.
    /// @param timelock UNIX epoch seconds time that the lock expires at.
    ///                  Refunds can be made after this time.
    /// @return Id of the new HTLC. This is needed for subsequent calls.
    pub fn lock(
        ctx: Context<Lock>,
        lockId: [u8; 32],
        commitId: [u8; 32],
        timelock: u64,
        dst_chain: String,
        dst_address: String,
        dst_asset: String,
        src_asset: String,
        srcReceiver: Pubkey,
        messenger: Pubkey,
        amount: u64,
        htlc_bump: u8,
    ) -> Result<()> {
        let clock = Clock::get().unwrap();
        require!(
            timelock > clock.unix_timestamp.try_into().unwrap(),
            HTLCError::NotFutureTimeLock
        );
        require!(amount != 0, HTLCError::FundsNotSent);
        let htlc = &mut ctx.accounts.htlc;

        let bump_vector = htlc_bump.to_le_bytes();
        let inner = vec![lockId.as_ref(), bump_vector.as_ref()];
        let outer = vec![inner.as_slice()];
        let transfer_context = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sender_token_account.to_account_info(),
                to: ctx.accounts.htlc_token_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
            outer.as_slice(),
        );
        anchor_spl::token::transfer(transfer_context, amount)?;

        htlc.dst_address = dst_address.clone();
        htlc.dst_chain = dst_chain.clone();
        htlc.dst_asset = dst_asset.clone();
        htlc.src_asset = src_asset.clone();
        htlc.sender = *ctx.accounts.sender.to_account_info().key;
        htlc.srcReceiver = srcReceiver;
        htlc.hashlock = lockId;
        htlc.secret = Vec::new();
        htlc.amount = amount;
        htlc.timelock = timelock;
        htlc.token_contract = *ctx.accounts.token_contract.to_account_info().key;
        htlc.token_wallet = *ctx.accounts.htlc_token_account.to_account_info().key;
        htlc.redeemed = false;
        htlc.unlocked = false;

        emit!(TokenLocked {
            hashlock: lockId,
            dst_chain: dst_chain.clone(),
            dst_address: dst_address.clone(),
            dst_asset: dst_asset.clone(),
            sender: *ctx.accounts.sender.to_account_info().key,
            srcReceiver: srcReceiver,
            src_asset: src_asset.clone(),
            amount: amount,
            timelock: timelock,
            messenger: messenger,
            commitId: commitId.clone(),
            token_contract: *ctx.accounts.token_contract.to_account_info().key,
        });
        msg!("lockId: {:?}", hex::encode(lockId));
        let lockIdStruct = &mut ctx.accounts.lockIdStruct;
        lockIdStruct.lock_id = lockId;
        // let locks = &mut ctx.accounts.locks;
        // locks.lockIds.push(lockId);
        Ok(())
    }

    /// @dev Called by the messenger to convert the PHTLC to HTLC
    ///
    /// @param commitId of the PHTLC to lockCommit.
    /// @param hashlock of the HTLC to be created.
    pub fn lockCommit(
        ctx: Context<LockCommit>,
        commitId: [u8; 32],
        lockId: [u8; 32],
        timelock: u64,
        phtlc_bump: u8,
    ) -> Result<()> {
        let clock = Clock::get().unwrap();
        require!(
            timelock > clock.unix_timestamp.try_into().unwrap(),
            HTLCError::NotFutureTimeLock
        );

        let phtlc = &mut ctx.accounts.phtlc;

        phtlc.lockId = lockId;
        phtlc.locked = true;

        let amount = phtlc.amount;
        transfer_htlc_out(
            ctx.accounts.messenger.to_account_info(),
            commitId,
            phtlc.to_account_info(),
            phtlc_bump,
            &mut ctx.accounts.phtlc_token_account,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.htlc_token_account.to_account_info(),
            amount,
        )?;

        let htlc = &mut ctx.accounts.htlc;

        htlc.dst_chain = phtlc.dst_chain.clone();
        htlc.dst_address = phtlc.dst_address.clone();
        htlc.dst_asset = phtlc.dst_asset.clone();
        htlc.sender = phtlc.sender;
        htlc.srcReceiver = phtlc.srcReceiver;
        htlc.src_asset = phtlc.src_asset.clone();

        htlc.hashlock = lockId;
        htlc.secret = Vec::new();
        htlc.amount = amount;
        htlc.timelock = timelock;
        htlc.token_contract = *ctx.accounts.token_contract.to_account_info().key;
        htlc.token_wallet = *ctx.accounts.htlc_token_account.to_account_info().key;
        htlc.redeemed = false;
        htlc.unlocked = false;

        emit!(TokenLocked {
            hashlock: lockId,
            dst_chain: phtlc.dst_chain.clone(),
            dst_address: phtlc.dst_address.clone(),
            dst_asset: phtlc.dst_asset.clone(),
            sender: phtlc.sender,
            srcReceiver: phtlc.srcReceiver,
            src_asset: phtlc.src_asset.clone(),
            amount: amount,
            timelock: timelock,
            messenger: phtlc.messenger,
            commitId: commitId,
            token_contract: *ctx.accounts.token_contract.to_account_info().key,
        });
        msg!("commitId: {:?}", hex::encode(commitId));
        msg!("lockId: {:?}", hex::encode(lockId));
        // msg!("timelock: {:?}", timelock);

        Ok(())
    }

    /// @dev Called by the srcReceiver once they know the secret of the hashlock.
    /// This will transfer the locked funds to the HTLC's srcReceiver's address.
    ///
    /// @param lockId of the HTLC.
    /// @param secret sha256(secret) should equal the contract hashlock.
    pub fn redeem(
        ctx: Context<Redeem>,
        lockId: [u8; 32],
        secret: Vec<u8>,
        htlc_bump: u8,
    ) -> Result<bool> {
        let htlc = &mut ctx.accounts.htlc;
        let mut hasher = Sha256::new();
        hasher.update(secret.clone());
        let hash = hasher.finalize();
        require!(hash == htlc.hashlock.into(), HTLCError::HashlockNoMatch);

        htlc.secret = secret;
        htlc.redeemed = true;

        transfer_htlc_out(
            ctx.accounts.sender.to_account_info(),
            lockId,
            htlc.to_account_info(),
            htlc_bump,
            &mut ctx.accounts.htlc_token_account,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.srcReceiver_token_account.to_account_info(),
            ctx.accounts.htlc.amount,
        )?;

        emit!(TokenRedeemed {
            lockId: lockId,
            redeem_address: ctx.accounts.user_signing.key(),
        });
        Ok(true)
    }

    /// @dev Called by the sender if there was no redeem OR lockCommit AND the time lock has
    /// expired. This will unlock the contract amount.
    ///
    /// @param commitId of the PHTLC to unlock from.
    /// @return bool true on success
    pub fn uncommit(ctx: Context<UnCommit>, commitId: [u8; 32], phtlc_bump: u8) -> Result<bool> {
        let phtlc = &mut ctx.accounts.phtlc;

        phtlc.uncommitted = true;

        transfer_htlc_out(
            ctx.accounts.sender.to_account_info(),
            commitId,
            phtlc.to_account_info(),
            phtlc_bump,
            &mut ctx.accounts.phtlc_token_account,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.sender_token_account.to_account_info(),
            ctx.accounts.phtlc.amount,
        )?;

        emit!(TokenUncommited { commitId: commitId });
        Ok(true)
    }

    /// @dev Called by the sender if there was no redeem AND the time lock has
    /// expired. This will unlock the contract amount.
    ///
    /// @param commitId of the HTLC to unlock from.
    pub fn unlock(ctx: Context<UnLock>, lockId: [u8; 32], htlc_bump: u8) -> Result<bool> {
        let htlc = &mut ctx.accounts.htlc;

        htlc.unlocked = true;

        transfer_htlc_out(
            ctx.accounts.sender.to_account_info(),
            lockId,
            htlc.to_account_info(),
            htlc_bump,
            &mut ctx.accounts.htlc_token_account,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.sender_token_account.to_account_info(),
            ctx.accounts.htlc.amount,
        )?;

        emit!(TokenUnlocked { lockId: lockId });
        Ok(true)
    }

    /// @dev Get PHTLC details.
    /// @param lockId of the PHTLC.
    pub fn getCommitDetails(
        ctx: Context<GetCommitDetails>,
        commitId: [u8; 32],
        phtlc_bump: u8,
    ) -> Result<PHTLC> {
        let phtlc = &ctx.accounts.phtlc;
        msg!("dst_address: {:?}", phtlc.dst_address.clone());
        msg!("dst_chain: {:?}", phtlc.dst_chain.clone());
        msg!("dst_asset: {:?}", phtlc.dst_asset.clone());
        msg!("src_asset: {:?}", phtlc.src_asset);
        msg!("sender: {:?}", phtlc.sender);
        msg!("srcReceiver: {:?}", phtlc.srcReceiver);
        msg!("lockId: {:?}", hex::encode(phtlc.lockId));
        msg!("amount: {:?}", phtlc.amount);
        msg!("timelock: {:?}", phtlc.timelock);
        msg!("messenger: {:?}", phtlc.messenger);
        msg!("token_contract: {:?}", phtlc.token_contract);
        msg!("token_wallet: {:?}", phtlc.token_wallet);
        msg!("locked: {:?}", phtlc.locked);
        msg!("uncommited: {:?}", phtlc.uncommitted);

        Ok(PHTLC {
            dst_address: phtlc.dst_address.clone(),
            dst_chain: phtlc.dst_chain.clone(),
            dst_asset: phtlc.dst_asset.clone(),
            src_asset: phtlc.src_asset.clone(),
            sender: phtlc.sender,
            srcReceiver: phtlc.srcReceiver,
            lockId: phtlc.lockId,
            amount: phtlc.amount,
            timelock: phtlc.timelock,
            messenger: phtlc.messenger,
            token_contract: phtlc.token_contract,
            token_wallet: phtlc.token_wallet,
            locked: phtlc.locked,
            uncommitted: phtlc.uncommitted,
        })
    }

    /// @dev Get HTLC details.
    /// @param lockId of the HTLC.
    pub fn getLockDetails(
        ctx: Context<GetLockDetails>,
        lockId: [u8; 32],
        htlc_bump: u8,
    ) -> Result<HTLC> {
        let htlc = &ctx.accounts.htlc;

        msg!("dst_address: {:?}", htlc.dst_address.clone());
        msg!("dst_chain: {:?}", htlc.dst_chain.clone());
        msg!("dst_asset: {:?}", htlc.dst_asset.clone());
        msg!("src_asset: {:?}", htlc.src_asset);
        msg!("sender: {:?}", htlc.sender);
        msg!("srcReceiver: {:?}", htlc.srcReceiver);
        msg!("hashlock: {:?}", hex::encode(htlc.hashlock));
        msg!("secret: {:?}", hex::encode(htlc.secret.clone()));
        msg!("amount: {:?}", htlc.amount);
        msg!("timelock: {:?}", htlc.timelock);
        msg!("token_contract: {:?}", htlc.token_contract);
        msg!("token_wallet: {:?}", htlc.token_wallet);
        msg!("redeemed: {:?}", htlc.redeemed);
        msg!("unlocked: {:?}", htlc.unlocked);

        Ok(HTLC {
            dst_address: htlc.dst_address.clone(),
            dst_chain: htlc.dst_chain.clone(),
            dst_asset: htlc.dst_asset.clone(),
            src_asset: htlc.src_asset.clone(),
            sender: htlc.sender,
            srcReceiver: htlc.srcReceiver,
            hashlock: htlc.hashlock,
            secret: htlc.secret.clone(),
            amount: htlc.amount,
            timelock: htlc.timelock,
            token_contract: htlc.token_contract,
            token_wallet: htlc.token_wallet,
            redeemed: htlc.redeemed,
            unlocked: htlc.unlocked,
        })
    }

    pub fn getLockIdByCommitId(
        ctx: Context<GetLockIdByCommitId>,
        commitId: [u8; 32],
    ) -> Result<[u8; 32]> {
        let lockIdStruct = &ctx.accounts.lockIdStruct;
        msg!("lockIdStruct.lock_id {:?}", lockIdStruct.lock_id);
        Ok(lockIdStruct.lock_id)
    }
    pub fn getCommits(ctx: Context<GetCommits>, user: Pubkey) -> Result<Vec<[u8; 32]>> {
        let commits = &ctx.accounts.commits;
        Ok(commits.commitIds.clone())
    }
    // pub fn getLocks(ctx: Context<GetLocks>, user: Pubkey) -> Result<Vec<[u8; 32]>> {
    //     let locks = &ctx.accounts.locks;
    //     Ok(locks.lockIds.clone())
    // }

    pub fn initLockIdByCommitId(
        ctx: Context<InitLockIdByCommitId>,
        commitId: [u8; 32],
    ) -> Result<()> {
        Ok(())
    }
    pub fn initCommits(ctx: Context<InitCommits>) -> Result<()> {
        Ok(())
    }
    // pub fn initLocks(ctx: Context<InitLocks>) -> Result<()> {
    //     Ok(())
    // }
}

#[account]
#[derive(Default)]
pub struct LockIdStruct {
    pub lock_id: [u8; 32],
}

#[account]
#[derive(Default)]
pub struct Commits {
    pub commitIds: Vec<[u8; 32]>,
}

// #[account]
// #[derive(Default)]
// pub struct Locks {
//     pub lockIds: Vec<[u8; 32]>,
// }

#[account]
#[derive(Default)]
pub struct PHTLC {
    pub dst_address: String,
    pub dst_chain: String,
    pub dst_asset: String,
    pub src_asset: String,
    pub sender: Pubkey,
    pub srcReceiver: Pubkey,
    pub lockId: [u8; 32],
    pub amount: u64,
    pub timelock: u64,
    pub messenger: Pubkey,
    pub token_contract: Pubkey,
    pub token_wallet: Pubkey,
    pub locked: bool,
    pub uncommitted: bool,
}
#[account]
#[derive(Default)]
pub struct HTLC {
    pub dst_address: String,
    pub dst_chain: String,
    pub dst_asset: String,
    pub src_asset: String,
    pub sender: Pubkey,
    pub srcReceiver: Pubkey,
    pub hashlock: [u8; 32],
    pub secret: Vec<u8>, //[u8; 32],
    pub amount: u64,     //TODO: check if this should be u256, though the spl uses u64
    pub timelock: u64,   //TODO: check if this should be u256
    pub token_contract: Pubkey,
    pub token_wallet: Pubkey,
    pub redeemed: bool,
    pub unlocked: bool,
}

#[account]
#[derive(InitSpace)]
pub struct CommitCounter {
    pub count: u64,
    pub time: u64,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        seeds = [b"commitCounter"],
        bump,
        payer = owner,
        space = CommitCounter::INIT_SPACE + 8
    )]
    pub commitCounter: Box<Account<'info, CommitCounter>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Get_commit_id<'info> {
    #[account(
        seeds = [b"commitCounter"],
        bump,
    )]
    pub commitCounter: Account<'info, CommitCounter>,
}

#[derive(Accounts)]
#[instruction(commitId: [u8;32], phtlc_bump: u8)]
pub struct Commit<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        init,
        payer = sender,
        space = size_of::<PHTLC>() + 8,
        seeds = [
            commitId.as_ref()
        ],
        bump,
    )]
    pub phtlc: Box<Account<'info, PHTLC>>,
    #[account(
        init,
        payer = sender,
        seeds = [
            b"phtlc_token_account".as_ref(),
            commitId.as_ref()
        ],
        bump,
        token::mint=token_contract,
        token::authority=phtlc,
    )]
    pub phtlc_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [b"commitCounter"],
        bump,
    )]
    pub commitCounter: Box<Account<'info, CommitCounter>>,
    #[account(
        mut,
        seeds = [
            b"commits".as_ref(),
            sender.key().as_ref()
        ],
        bump,
    )]
    pub commits: Box<Account<'info, Commits>>,

    pub token_contract: Account<'info, Mint>,
    #[account(
        mut,
        constraint=sender_token_account.owner == sender.key() @HTLCError::NotSender,
        constraint=sender_token_account.mint == token_contract.key() @HTLCError::NoToken,
    )]
    pub sender_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(lockId: [u8; 32], commitId: [u8;32], htlc_bump: u8)]
pub struct Lock<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        init,
        payer = sender,
        space = size_of::<HTLC>() + 8,
        // space = 256,
        seeds = [
            lockId.as_ref()
        ],
        bump,// = htlc_bump,
    )]
    pub htlc: Box<Account<'info, HTLC>>,
    #[account(
        init,
        payer = sender,
        seeds = [
            b"htlc_token_account".as_ref(),
            lockId.as_ref()
        ],
        bump,
        token::mint=token_contract,
        token::authority=htlc,
    )]
    pub htlc_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [
            b"commit_to_lock".as_ref(),
            commitId.as_ref()
        ],
        bump,
    )]
    pub lockIdStruct: Box<Account<'info, LockIdStruct>>,

    // #[account(
    //     mut,
    //     seeds = [
    //         b"locks".as_ref(),
    //         sender.key().as_ref()
    //     ],
    //     bump,
    // )]
    // pub locks: Box<Account<'info, Locks>>,
    pub token_contract: Account<'info, Mint>,
    #[account(
        mut,
        constraint=sender_token_account.owner == sender.key() @HTLCError::NotSender,
        constraint=sender_token_account.mint == token_contract.key() @ HTLCError::NoToken,
    )]
    pub sender_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(lockId: [u8;32], htlc_bump: u8)]
pub struct Redeem<'info> {
    #[account(mut)]
    user_signing: Signer<'info>,

    #[account(
        mut,
        seeds = [
            lockId.as_ref()
        ],
        bump,// = htlc_bump,
        has_one = sender @HTLCError::NotSender,
        has_one = srcReceiver @HTLCError::NotReciever,
        has_one = token_contract @HTLCError::NoToken,
        constraint = !htlc.redeemed @ HTLCError::AlreadyRedeemed,
        constraint = !htlc.unlocked @ HTLCError::AlreadyUnlocked,
    )]
    pub htlc: Box<Account<'info, HTLC>>,
    #[account(
        mut,
        seeds = [
            b"htlc_token_account".as_ref(),
            lockId.as_ref()
        ],
        bump,
    )]
    pub htlc_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = user_signing,
        associated_token::mint = token_contract,
        associated_token::authority = srcReceiver,
    )]
    pub srcReceiver_token_account: Account<'info, TokenAccount>,

    ///CHECK: The sender
    #[account(mut)]
    sender: UncheckedAccount<'info>,
    ///CHECK: The reciever
    pub srcReceiver: UncheckedAccount<'info>,
    token_contract: Account<'info, Mint>,

    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    associated_token_program: Program<'info, AssociatedToken>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(commitId: [u8;32], phtlc_bump: u8)]
pub struct UnCommit<'info> {
    #[account(mut)]
    user_signing: Signer<'info>,

    #[account(mut,
    seeds = [
        commitId.as_ref()
    ],
    bump = phtlc_bump,
    has_one = sender @HTLCError::NotSender,
    has_one = token_contract @HTLCError::NoToken,
    constraint = !phtlc.uncommitted @ HTLCError::AlreadyUncommitted,
    constraint = !phtlc.locked @ HTLCError::AlreadyLocked,
    constraint = Clock::get().unwrap().unix_timestamp >= phtlc.timelock.try_into().unwrap() @ HTLCError::NotPastTimeLock,
    )]
    pub phtlc: Box<Account<'info, PHTLC>>,
    #[account(
        mut,
        seeds = [
            b"phtlc_token_account".as_ref(),
            commitId.as_ref()
        ],
        bump,
    )]
    pub phtlc_token_account: Box<Account<'info, TokenAccount>>,

    ///CHECK: The sender
    #[account(mut)]
    sender: UncheckedAccount<'info>,
    token_contract: Account<'info, Mint>,

    #[account(
        mut,
        constraint = phtlc.sender.key() == sender_token_account.owner,
        constraint = sender_token_account.mint == token_contract.key())]
    pub sender_token_account: Account<'info, TokenAccount>,

    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(lockId: [u8;32], htlc_bump: u8)]
pub struct UnLock<'info> {
    #[account(mut)]
    user_signing: Signer<'info>,

    #[account(mut,
    seeds = [
        //b"htlc",
        lockId.as_ref()
    ],
    bump = htlc_bump,
    has_one = sender @HTLCError::NotSender,
    has_one = token_contract @HTLCError::NoToken,
    constraint = !htlc.unlocked @ HTLCError::AlreadyUnlocked,
    constraint = !htlc.redeemed @ HTLCError::AlreadyRedeemed,
    constraint = Clock::get().unwrap().unix_timestamp >= htlc.timelock.try_into().unwrap() @ HTLCError::NotPastTimeLock,
    )]
    pub htlc: Box<Account<'info, HTLC>>,
    #[account(
        mut,
        seeds = [
            b"htlc_token_account".as_ref(),
            lockId.as_ref()
        ],
        bump,
    )]
    pub htlc_token_account: Box<Account<'info, TokenAccount>>,

    ///CHECK: The sender
    #[account(mut)]
    sender: UncheckedAccount<'info>,
    token_contract: Account<'info, Mint>,

    #[account(
        mut,
        constraint=htlc.sender.key() == sender_token_account.owner @HTLCError::NotSender,
        constraint=sender_token_account.mint == token_contract.key() @HTLCError::NoToken,)]
    pub sender_token_account: Account<'info, TokenAccount>,

    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(commitId: [u8;32], lockId: [u8;32], phtlc_bump: u8)]
pub struct LockCommit<'info> {
    #[account(mut)]
    messenger: Signer<'info>,

    #[account(mut,
    seeds = [
        commitId.as_ref()
    ],
    bump,
    has_one = token_contract @HTLCError::NoToken,
    constraint = !phtlc.uncommitted @ HTLCError::AlreadyUncommitted,
    constraint = !phtlc.locked @ HTLCError::AlreadyLocked,
    constraint = phtlc.sender == messenger.key() || phtlc.messenger == messenger.key() @ HTLCError::UnauthorizedAccess,
    )]
    pub phtlc: Box<Account<'info, PHTLC>>,
    #[account(
    init,
    payer = messenger,
    space = size_of::<HTLC>() + 8,
    //space = 256,
    seeds = [
        lockId.as_ref()
    ],
    bump,
    )]
    pub htlc: Box<Account<'info, HTLC>>,
    #[account(
        mut,
        seeds = [
            b"phtlc_token_account".as_ref(),
            commitId.as_ref()
        ],
        bump,
    )]
    pub phtlc_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
    init,
    payer = messenger,
    seeds = [
        b"htlc_token_account".as_ref(),
        lockId.as_ref()
    ],
    bump,
    token::mint=token_contract,
    token::authority=htlc,
    )]
    pub htlc_token_account: Box<Account<'info, TokenAccount>>,

    token_contract: Account<'info, Mint>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct GetCommitCounter<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        seeds = [b"commitCounter"],
        bump,
    )]
    pub commitCounter: Box<Account<'info, CommitCounter>>,
}

#[derive(Accounts)]
#[instruction(commitId: [u8;32], phtlc_bump: u8)]
pub struct GetCommitDetails<'info> {
    #[account(
        seeds = [
            commitId.as_ref()
        ],
        bump,// = htlc_bump,
    )]
    pub phtlc: Box<Account<'info, PHTLC>>,
}

#[derive(Accounts)]
#[instruction(lockId: [u8;32], htlc_bump: u8)]
pub struct GetLockDetails<'info> {
    #[account(
        seeds = [
            lockId.as_ref()
        ],
        bump,// = htlc_bump,
    )]
    pub htlc: Box<Account<'info, HTLC>>,
}

#[derive(Accounts)]
#[instruction(commitId: [u8;32])]
pub struct GetLockIdByCommitId<'info> {
    #[account(
        seeds = [
            b"commit_to_lock".as_ref(),
            commitId.as_ref()
        ],
        bump,
    )]
    pub lockIdStruct: Box<Account<'info, LockIdStruct>>,
}

#[derive(Accounts)]
#[instruction(user: Pubkey)]
pub struct GetCommits<'info> {
    #[account(
        seeds = [
            b"commits".as_ref(),
            user.key().as_ref()
        ],
        bump,
    )]
    pub commits: Box<Account<'info, Commits>>,
}

// #[derive(Accounts)]
// #[instruction(user: Pubkey)]
// pub struct GetLocks<'info> {
//     #[account(
//         seeds = [
//             b"locks".as_ref(),
//             user.key().as_ref()
//         ],
//         bump,
//     )]
//     pub locks: Box<Account<'info, Locks>>,
// }

#[derive(Accounts)]
#[instruction(commitId: [u8;32])]
pub struct InitLockIdByCommitId<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        init,
        payer = sender,
        space = size_of::<LockIdStruct>() + 8,
        seeds = [
            b"commit_to_lock".as_ref(),
            commitId.as_ref()
        ],
        bump,
    )]
    pub lockIdStruct: Box<Account<'info, LockIdStruct>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitCommits<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        init_if_needed,
        payer = sender,
        space = size_of::<Commits>() + 128,
        seeds = [
            b"commits".as_ref(),
            sender.key().as_ref()
        ],
        bump,
    )]
    pub commits: Box<Account<'info, Commits>>,

    pub system_program: Program<'info, System>,
}

// #[derive(Accounts)]
// pub struct InitLocks<'info> {
//     #[account(mut)]
//     pub sender: Signer<'info>,

//     #[account(
//         init_if_needed,
//         payer = sender,
//         space = size_of::<Locks>() + 128,
//         seeds = [
//             b"locks".as_ref(),
//             sender.key().as_ref()
//         ],
//         bump,
//     )]
//     pub locks: Box<Account<'info, Locks>>,

//     pub system_program: Program<'info, System>,
// }

#[event]
pub struct TokenCommitted {
    pub commitId: [u8; 32],
    pub hopChains: Vec<String>,
    pub hopAssets: Vec<String>,
    pub hopAddress: Vec<String>,
    pub dst_chain: String,
    pub dst_address: String,
    pub dst_asset: String,
    pub sender: Pubkey,
    pub srcReceiver: Pubkey,
    pub src_asset: String,
    pub amount: u64,
    pub timelock: u64,
    pub messenger: Pubkey,
    pub token_contract: Pubkey,
}

#[event]
pub struct TokenLocked {
    #[index]
    hashlock: [u8; 32],
    dst_chain: String,
    dst_address: String,
    dst_asset: String,
    #[index]
    sender: Pubkey,
    srcReceiver: Pubkey,
    src_asset: String,
    amount: u64,   //TODO: check if this should be u256
    timelock: u64, //TODO: check if this should be u256
    messenger: Pubkey,
    commitId: [u8; 32],
    token_contract: Pubkey,
}

#[event]
pub struct TokenRedeemed {
    #[index]
    lockId: [u8; 32],
    redeem_address: Pubkey,
}
#[event]
pub struct TokenUnlocked {
    #[index]
    lockId: [u8; 32],
}
#[event]
pub struct TokenUncommited {
    #[index]
    commitId: [u8; 32],
}
#[error_code]
pub enum HTLCError {
    #[msg("Not Future TimeLock.")]
    NotFutureTimeLock,
    #[msg("Not Past TimeLock.")]
    NotPastTimeLock,
    #[msg("Does Not Match the Hashlock.")]
    HashlockNoMatch,
    #[msg("Funds Are Alredy Redeemed.")]
    AlreadyRedeemed,
    #[msg("Funds Are Alredy Unlocked.")]
    AlreadyUnlocked,
    #[msg("Funds Are Alredy Uncommitted.")]
    AlreadyUncommitted,
    #[msg("Already Locked.")]
    AlreadyLocked,
    #[msg("Funds Can Not Be Zero.")]
    FundsNotSent,
    #[msg("Unauthorized Access.")]
    UnauthorizedAccess,
    #[msg("Not The Owner.")]
    NotOwner,
    #[msg("Not The Sender.")]
    NotSender,
    #[msg("Not The Reciever.")]
    NotReciever,
    #[msg("Wrong Token.")]
    NoToken,
}
