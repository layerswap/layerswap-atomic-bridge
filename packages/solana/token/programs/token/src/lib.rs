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
declare_id!("3TTb3BF3H273DS8hCJT9w8wuhtchN7fi7tX2sZDZ3p3Q");
/// @title Pre Hashed Timelock Contracts (PHTLCs) on Solana SPL tokens.
///
/// This contract provides a way to lock and keep PHTLCs for SPL tokens.
///
/// Protocol:
///
///  1) commit(src_receiver, timelock, tokenContract, amount) - a
///      sender calls this to create a new HTLC on a given token (tokenContract)
///      for the given amount. A [u8; 32] Id is returned.
///  2) lock(src_receiver, hashlock, timelock, tokenContract, amount) - a
///      sender calls this to create a new HTLC on a given token (tokenContract)
///      for the given amount. A [u8; 32] Id is returned.
///  3) add_lock(Id, hashlock) - the sender calls this function
///      to add hashlock to the HTLC.
///  4) redeem(Id, secret) - once the src_receiver knows the secret of
///      the hashlock hash they can claim the tokens with this function
///  5) refund(Id) - after timelock has expired and if the src_receiver did not
///      redeem the tokens the sender / creator of the HTLC can get their tokens
///      back with this function.

/// @dev A small utility function that allows us to transfer funds out of the htlc / htlc.
///
/// * `sender` - htlc creator's account
/// * `Id` - The index of the htlc
/// * `htlc` - the htlc public key (PDA)
/// * `htlc_bump` - the htlc public key (PDA) bump
/// * `htlc_token_account` - The htlc Token account
/// * `token_program` - the token program address
/// * `destination_wallet` - The public key of the destination address (where to send funds)
/// * `amount` - the amount of token that is sent from `htlc_token_account` to `destination_wallet`
fn transfer_htlc_out<'info>(
    sender: AccountInfo<'info>,
    Id: [u8; 32],
    htlc: AccountInfo<'info>,
    htlc_bump: u8,
    htlc_token_account: &mut Account<'info, TokenAccount>,
    token_program: AccountInfo<'info>,
    destination_wallet: AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    let bump_vector = htlc_bump.to_le_bytes();
    let inner = vec![Id.as_ref(), bump_vector.as_ref()];
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

    /// @dev Called by the Sender to get the commitId from the given parameters.
    pub fn get_commit_id(
        ctx: Context<GetCommitId>,
        amount: u64,
        timelock: u64,
    ) -> Result<[u8; 32]> {
        let sender = &ctx.accounts.sender.to_account_info().key;
        let receiver = &ctx.accounts.receiver.to_account_info().key;
        let clock = Clock::get().unwrap();
        let time: u64 = clock.unix_timestamp.try_into().unwrap();

        let mut hasher = Sha256::new();
        hasher.update(ctx.program_id);
        hasher.update(sender);
        hasher.update(receiver);
        hasher.update(&amount.to_be_bytes());
        hasher.update(&time.to_be_bytes());
        hasher.update(&timelock.to_be_bytes());

        let commitId = hasher.finalize();
        // let commitId = hex::encode(commitId);
        // msg!("commit id: {}", commitId);
        Ok(commitId.into())
    }
    /// @dev Sender / Payer sets up a new pre-hash time lock contract depositing the
    /// funds and providing the reciever/src_receiver and terms.
    /// @param src_receiver reciever of the funds.
    /// @param timelock UNIX epoch seconds time that the lock expires at.
    ///                  Refunds can be made after this time.
    /// @return Id of the new HTLC. This is needed for subsequent calls.
    pub fn commit(
        ctx: Context<Commit>,
        Id: [u8; 32],
        hopChains: Vec<String>,
        hopAssets: Vec<String>,
        hopAddress: Vec<String>,
        dst_chain: String,
        dst_asset: String,
        dst_address: String,
        src_asset: String,
        src_receiver: Pubkey,
        timelock: u64,
        amount: u64,
        commit_bump: u8,
    ) -> Result<[u8; 32]> {
        let clock = Clock::get().unwrap();
        require!(
            timelock > clock.unix_timestamp.try_into().unwrap(),
            HTLCError::NotFutureTimeLock
        );
        require!(amount != 0, HTLCError::FundsNotSent);
        let htlc = &mut ctx.accounts.htlc;
        let bump_vector = commit_bump.to_le_bytes();
        let inner = vec![Id.as_ref(), bump_vector.as_ref()];
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

        htlc.dst_address = dst_address;
        htlc.dst_chain = dst_chain;
        htlc.dst_asset = dst_asset;
        htlc.src_asset = src_asset;
        htlc.sender = *ctx.accounts.sender.to_account_info().key;
        htlc.src_receiver = src_receiver;
        htlc.hashlock = [0u8; 32];
        htlc.secret = [0u8; 32];
        htlc.amount = amount;
        htlc.timelock = timelock;
        htlc.token_contract = *ctx.accounts.token_contract.to_account_info().key;
        htlc.token_wallet = *ctx.accounts.htlc_token_account.to_account_info().key;
        htlc.redeemed = false;
        htlc.refunded = false;

        // msg!("hop chains: {:?}", hopChains);
        // msg!("hop assets: {:?}", hopAssets);
        // msg!("hop addresses: {:?}", hopAddresses);
        Ok(Id)
    }

    /// @dev Sender / Payer sets up a new hash time lock contract depositing the
    /// funds and providing the reciever and terms.
    /// @param src_receiver receiver of the funds.
    /// @param hashlock A sha-256 hash hashlock.
    /// @param timelock UNIX epoch seconds time that the lock expires at.
    ///                  Refunds can be made after this time.
    /// @return Id of the new HTLC. This is needed for subsequent calls.
    pub fn lock(
        ctx: Context<Lock>,
        Id: [u8; 32],
        hashlock: [u8; 32],
        timelock: u64,
        dst_chain: String,
        dst_address: String,
        dst_asset: String,
        src_asset: String,
        src_receiver: Pubkey,
        amount: u64,
        lock_bump: u8,
    ) -> Result<[u8; 32]> {
        let clock = Clock::get().unwrap();
        require!(
            timelock > clock.unix_timestamp.try_into().unwrap(),
            HTLCError::NotFutureTimeLock
        );
        require!(amount != 0, HTLCError::FundsNotSent);
        let htlc = &mut ctx.accounts.htlc;

        let bump_vector = lock_bump.to_le_bytes();
        let inner = vec![Id.as_ref(), bump_vector.as_ref()];
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

        htlc.dst_address = dst_address;
        htlc.dst_chain = dst_chain;
        htlc.dst_asset = dst_asset;
        htlc.src_asset = src_asset;
        htlc.sender = *ctx.accounts.sender.to_account_info().key;
        htlc.src_receiver = src_receiver;
        htlc.hashlock = hashlock;
        htlc.secret = [0u8; 32];
        htlc.amount = amount;
        htlc.timelock = timelock;
        htlc.token_contract = *ctx.accounts.token_contract.to_account_info().key;
        htlc.token_wallet = *ctx.accounts.htlc_token_account.to_account_info().key;
        htlc.redeemed = false;
        htlc.refunded = false;

        Ok(Id)
    }

    /// @dev Called by the sender to add hashlock to the HTLC
    ///
    /// @param Id of the HTLC.
    /// @param hashlock to be added.
    pub fn add_lock(
        ctx: Context<AddLock>,
        Id: [u8; 32],
        hashlock: [u8; 32],
        timelock: u64,
    ) -> Result<[u8; 32]> {
        let clock = Clock::get().unwrap();
        require!(
            timelock > clock.unix_timestamp.try_into().unwrap(),
            HTLCError::NotFutureTimeLock
        );

        let htlc = &mut ctx.accounts.htlc;

        htlc.hashlock = hashlock;
        htlc.timelock = timelock;

        Ok(Id)
    }

    /// @dev Called by the src_receiver once they know the secret of the hashlock.
    /// This will transfer the locked funds to the HTLC's src_receiver's address.
    ///
    /// @param Id of the HTLC.
    /// @param secret sha256(secret) should equal the contract hashlock.
    pub fn redeem(
        ctx: Context<Redeem>,
        Id: [u8; 32],
        secret: [u8; 32],
        htlc_bump: u8,
    ) -> Result<bool> {
        let htlc = &mut ctx.accounts.htlc;
        let mut hasher = Sha256::new();
        hasher.update(secret.clone());
        let hash = hasher.finalize();
        require!([0u8; 32] != htlc.hashlock, HTLCError::HashlockNotSet);
        require!(hash == htlc.hashlock.into(), HTLCError::HashlockNoMatch);

        htlc.redeemed = true;
        htlc.secret = secret;

        transfer_htlc_out(
            ctx.accounts.sender.to_account_info(),
            Id,
            htlc.to_account_info(),
            htlc_bump,
            &mut ctx.accounts.htlc_token_account,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.src_receiver_token_account.to_account_info(),
            ctx.accounts.htlc.amount,
        )?;

        Ok(true)
    }

    /// @dev Called by the sender if there was no redeem AND the time lock has
    /// expired. This will refund the contract amount.
    ///
    /// @param Id of the HTLC to refund from.
    pub fn refund(ctx: Context<Refund>, Id: [u8; 32], htlc_bump: u8) -> Result<bool> {
        let htlc = &mut ctx.accounts.htlc;

        htlc.refunded = true;

        transfer_htlc_out(
            ctx.accounts.sender.to_account_info(),
            Id,
            htlc.to_account_info(),
            htlc_bump,
            &mut ctx.accounts.htlc_token_account,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.sender_token_account.to_account_info(),
            ctx.accounts.htlc.amount,
        )?;

        Ok(true)
    }

    /// @dev Get HTLC details.
    /// @param Id of the HTLC.
    pub fn getDetails(ctx: Context<GetDetails>, Id: [u8; 32]) -> Result<HTLC> {
        let htlc = &ctx.accounts.htlc;

        msg!("dst_address: {:?}", htlc.dst_address.clone());
        msg!("dst_chain: {:?}", htlc.dst_chain.clone());
        msg!("dst_asset: {:?}", htlc.dst_asset.clone());
        msg!("src_asset: {:?}", htlc.src_asset);
        msg!("sender: {:?}", htlc.sender);
        msg!("src_receiver: {:?}", htlc.src_receiver);
        msg!("hashlock: {:?}", hex::encode(htlc.hashlock));
        msg!("secret: {:?}", hex::encode(htlc.secret.clone()));
        msg!("amount: {:?}", htlc.amount);
        msg!("timelock: {:?}", htlc.timelock);
        msg!("token_contract: {:?}", htlc.token_contract);
        msg!("token_wallet: {:?}", htlc.token_wallet);
        msg!("redeemed: {:?}", htlc.redeemed);
        msg!("refunded: {:?}", htlc.refunded);

        Ok(HTLC {
            dst_address: htlc.dst_address.clone(),
            dst_chain: htlc.dst_chain.clone(),
            dst_asset: htlc.dst_asset.clone(),
            src_asset: htlc.src_asset.clone(),
            sender: htlc.sender,
            src_receiver: htlc.src_receiver,
            hashlock: htlc.hashlock,
            secret: htlc.secret.clone(),
            amount: htlc.amount,
            timelock: htlc.timelock,
            token_contract: htlc.token_contract,
            token_wallet: htlc.token_wallet,
            redeemed: htlc.redeemed,
            refunded: htlc.refunded,
        })
    }
}

#[account]
#[derive(Default)]
pub struct HTLC {
    pub dst_address: String,
    pub dst_chain: String,
    pub dst_asset: String,
    pub src_asset: String,
    pub sender: Pubkey,
    pub src_receiver: Pubkey,
    pub hashlock: [u8; 32],
    pub secret: [u8; 32],
    pub amount: u64,   //TODO: check if this should be u256, though the spl uses u64
    pub timelock: u64, //TODO: check if this should be u256
    pub token_contract: Pubkey,
    pub token_wallet: Pubkey,
    pub redeemed: bool,
    pub refunded: bool,
}
#[derive(Accounts)]
#[instruction(Id: [u8;32], commit_bump: u8)]
pub struct Commit<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        init,
        payer = sender,
        space = size_of::<HTLC>() + 28,
        seeds = [
            Id.as_ref()
        ],
        bump,
    )]
    pub htlc: Box<Account<'info, HTLC>>,
    #[account(
        init,
        payer = sender,
        seeds = [
            b"htlc_token_account".as_ref(),
            Id.as_ref()
        ],
        bump,
        token::mint=token_contract,
        token::authority=htlc,
    )]
    pub htlc_token_account: Box<Account<'info, TokenAccount>>,
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
#[instruction(Id: [u8; 32], lock_bump: u8)]
pub struct Lock<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        init,
        payer = sender,
        space = size_of::<HTLC>() + 28,
        // space = 256,
        seeds = [
            Id.as_ref()
        ],
        bump,
    )]
    pub htlc: Box<Account<'info, HTLC>>,
    #[account(
        init,
        payer = sender,
        seeds = [
            b"htlc_token_account".as_ref(),
            Id.as_ref()
        ],
        bump,
        token::mint=token_contract,
        token::authority=htlc,
    )]
    pub htlc_token_account: Box<Account<'info, TokenAccount>>,

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
#[instruction(Id: [u8;32], htlc_bump: u8)]
pub struct Redeem<'info> {
    #[account(mut)]
    user_signing: Signer<'info>,

    #[account(
        mut,
        seeds = [
            Id.as_ref()
        ],
        bump,
        has_one = sender @HTLCError::NotSender,
        has_one = src_receiver @HTLCError::NotReciever,
        has_one = token_contract @HTLCError::NoToken,
        constraint = !htlc.redeemed @ HTLCError::AlreadyRedeemed,
        constraint = !htlc.refunded @ HTLCError::AlreadyRefunded,
    )]
    pub htlc: Box<Account<'info, HTLC>>,
    #[account(
        mut,
        seeds = [
            b"htlc_token_account".as_ref(),
            Id.as_ref()
        ],
        bump,
    )]
    pub htlc_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = user_signing,
        associated_token::mint = token_contract,
        associated_token::authority = src_receiver,
    )]
    pub src_receiver_token_account: Account<'info, TokenAccount>,

    ///CHECK: The sender
    #[account(mut)]
    sender: UncheckedAccount<'info>,
    ///CHECK: The reciever
    pub src_receiver: UncheckedAccount<'info>,
    token_contract: Account<'info, Mint>,

    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    associated_token_program: Program<'info, AssociatedToken>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(Id: [u8;32], htlc_bump: u8)]
pub struct Refund<'info> {
    #[account(mut)]
    user_signing: Signer<'info>,

    #[account(mut,
    seeds = [
        //b"htlc",
        Id.as_ref()
    ],
    bump = htlc_bump,
    has_one = sender @HTLCError::NotSender,
    has_one = token_contract @HTLCError::NoToken,
    constraint = !htlc.refunded @ HTLCError::AlreadyRefunded,
    constraint = !htlc.redeemed @ HTLCError::AlreadyRedeemed,
    constraint = Clock::get().unwrap().unix_timestamp >= htlc.timelock.try_into().unwrap() @ HTLCError::NotPastTimeLock,
    )]
    pub htlc: Box<Account<'info, HTLC>>,
    #[account(
        mut,
        seeds = [
            b"htlc_token_account".as_ref(),
            Id.as_ref()
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
#[instruction(Id: [u8;32])]
pub struct AddLock<'info> {
    #[account(mut)]
    sender: Signer<'info>,

    #[account(mut,
    seeds = [
        Id.as_ref()
    ],
    bump,
    constraint = !htlc.redeemed @ HTLCError::AlreadyRedeemed,
    constraint = !htlc.refunded @ HTLCError::AlreadyRefunded,
    constraint = htlc.sender == sender.key() @ HTLCError::UnauthorizedAccess,
    constraint = htlc.hashlock == [0u8;32] @ HTLCError::HashlockAlreadySet,
    )]
    pub htlc: Box<Account<'info, HTLC>>,

    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(Id: [u8;32])]
pub struct GetDetails<'info> {
    #[account(
        seeds = [
            Id.as_ref()
        ],
        bump,
    )]
    pub htlc: Box<Account<'info, HTLC>>,
}
#[derive(Accounts)]

pub struct GetCommitId<'info> {
    ///CHECK: The sender
    pub sender: UncheckedAccount<'info>,
    ///CHECK: The reciever
    pub receiver: UncheckedAccount<'info>,
}
// #[event]
// pub struct TokenCommitted {
//     pub commitId: [u8; 32],
//     pub hopChains: Vec<String>,
//     pub hopAssets: Vec<String>,
//     pub hopAddress: Vec<String>,
//     pub dst_chain: String,
//     pub dst_address: String,
//     pub dst_asset: String,
//     pub sender: Pubkey,
//     pub src_receiver: Pubkey,
//     pub src_asset: String,
//     pub amount: u64,
//     pub timelock: u64,
//     pub token_contract: Pubkey,
// }

// #[event]
// pub struct TokenRedeemed {
//     #[index]
//     Id: [u8; 32],
//     redeem_address: Pubkey,
// }
#[error_code]
pub enum HTLCError {
    #[msg("Not Future TimeLock.")]
    NotFutureTimeLock,
    #[msg("Not Past TimeLock.")]
    NotPastTimeLock,
    #[msg("Hashlock Is Not Set.")]
    HashlockNotSet,
    #[msg("Does Not Match the Hashlock.")]
    HashlockNoMatch,
    #[msg("Hashlock Already Set.")]
    HashlockAlreadySet,
    #[msg("Funds Are Alredy Redeemed.")]
    AlreadyRedeemed,
    #[msg("Funds Are Alredy Refunded.")]
    AlreadyRefunded,
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
