use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{CloseAccount, Mint, Token, TokenAccount, Transfer}};
use std::mem::size_of;
use sha2::{Sha256, Digest};
declare_id!("8Es48Lsg4VEqG1wuUSXDx9QzDCado261CV4Qxx8NzHT1");

const OWNER: &str = "H732946dBhRx5pBbJnFJK7Gy4K6mSA5Svdt1eueExrTp";

/// @title Pre Hashed Timelock Contracts (PHTLCs) on Solana SPL tokens.
///
/// This contract provides a way to lock and keep PHTLCs for SPL tokens.
///
/// Protocol:
///
///  1) commit(srcReceiver, timelock, tokenContract, amount) - a
///      sender calls this to lock a new PHTLC on a given token (tokenContract)
///      for a given amount. A u64 phtlcId is returned.
///  2) lock(srcReceiver, hashlock, timelock, tokenContract, amount) - a
///      sender calls this to lock a new HTLC on a given token (tokenContract)
///      for a given amount. A String htlcId is returned.
///  3) lockCommit(phtlcId, hashlock) - the messenger calls this function
///      to lockCommit the PHTLC to HTLC with the given hashlock.
///  4) redeem(htlcId, secret) - once the srcReceiver knows the secret of
///      the hashlock hash they can claim the tokens with this function
///  5) unlock(htlcId) - after timelock has expired and if the srcReceiver did not
///      redeem the tokens the sender / creator of the HTLC can get their tokens
///      back with this function.
///  6) uncommit(phtlcId) - after timelock has expired and if the messenger did not
///      lockCommit the PHTLC, then the sender can get their tokens
///      back with this function.



/// A small utility function that allows us to transfer funds out of the htlc.
///
/// # Arguments
///
/// * `sender` - Alice's account
/// * `lockId` - The index of the htlc
/// * `htlc` - the htlc public key (PDA)
/// * `htlc_bump` - the application state public key (PDA) bump
/// * `htlc_wallet` - The htlc Token account
/// * `token_program` - the token program address
/// * `destination_wallet` - The public key of the destination address (where to send funds)
/// * `amount` - the amount of token that is sent from `htlc_wallet` to `destination_wallet`
fn transfer_htlc_out<'info>(
    sender: AccountInfo<'info>,
    lockId: String,
    htlc: AccountInfo<'info>,
    htlc_bump: u8,
    htlc_wallet: &mut Account<'info, TokenAccount>,
    token_program: AccountInfo<'info>,
    destination_wallet: AccountInfo<'info>,
    amount: u64
) -> Result<()> {
    let bump_vector = htlc_bump.to_le_bytes();
    let inner = vec![
        lockId.as_ref(),
        bump_vector.as_ref(),
    ];
    let outer = vec![inner.as_slice()];

    // Perform the actual transfer
    let transfer_instruction = Transfer{
        from: htlc_wallet.to_account_info(),
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
        htlc_wallet.reload()?;
        htlc_wallet.amount == 0
    };

    // If token account has no more tokens, it should be wiped out since it has no other use case.
    if should_close {
        let ca = CloseAccount{
            account: htlc_wallet.to_account_info(),
            destination: sender.to_account_info(),
            authority: htlc.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            token_program.to_account_info(),
            ca,
            outer.as_slice(),
        );
        anchor_spl::token::close_account(cpi_ctx)?;
    }

    Ok(())
}
/// A small utility function that allows us to transfer funds out of the phtlc.
///
/// # Arguments
///
/// * `sender` - Alice's account
/// * `commitId` - The index of the phtlc
/// * `phtlc` - the phtlc public key (PDA)
/// * `phtlc_bump` - the application state public key (PDA) bump
/// * `phtlc_wallet` - The phtlc Token account
/// * `token_program` - the token program address
/// * `destination_wallet` - The public key of the destination address (where to send funds)
/// * `amount` - the amount of token that is sent from `phtlc_wallet` to `destination_wallet`
fn transfer_phtlc_out<'info>(
    sender: AccountInfo<'info>,
    commitId: u64,
    phtlc: AccountInfo<'info>,
    phtlc_bump: u8,
    phtlc_wallet: &mut Account<'info, TokenAccount>,
    token_program: AccountInfo<'info>,
    destination_wallet: AccountInfo<'info>,
    amount: u64
) -> Result<()> {
    let bump_vector = phtlc_bump.to_le_bytes();
    let commit_id_bytes = commitId.to_le_bytes();
    let inner = vec![
        commit_id_bytes.as_ref(),
        bump_vector.as_ref(),
    ];
    let outer = vec![inner.as_slice()];

    // Perform the actual transfer
    let transfer_instruction = Transfer{
        from: phtlc_wallet.to_account_info(),
        to: destination_wallet,
        authority: phtlc.to_account_info(),
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
        phtlc_wallet.reload()?;
        phtlc_wallet.amount == 0
    };

    // If token account has no more tokens, it should be wiped out since it has no other use case.
    if should_close {
        let ca = CloseAccount{
            account: phtlc_wallet.to_account_info(),
            destination: sender.to_account_info(),
            authority: phtlc.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            token_program.to_account_info(),
            ca,
            outer.as_slice(),
        );
        anchor_spl::token::close_account(cpi_ctx)?;
    }

    Ok(())
}

#[program]
pub mod anchor_htlc {

    use anchor_spl::token::Transfer;
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.user.key(),
            OWNER.parse::<Pubkey>().unwrap(),
            HTLCError::NotOwner
        );
        let counter = &mut ctx.accounts.counter;
        counter.count = 0;
        Ok(())
    }

    /// @dev Sender / Payer sets up a new pre-hash time lock contract depositing the
    /// funds and providing the reciever/srcReceiver and terms.
    /// @param _srcReceiver reciever/srcReceiver of the funds.
    /// @param timelock UNIX epoch seconds time that the lock expires at.
    ///                  Refunds can be made after this time.
    /// @return Id of the new PHTLC. This is needed for subsequent calls.
    pub fn commit(
        ctx: Context<Commit>,
        commitId: u64,
        hopChains: Vec<String>,
        hopAssets: Vec<String>, 
        hopAddress: Vec<String>,
        dst_chain: String,
        dst_asset: String,
        dst_address: String,
        src_asset: String,
        timelock: u64,
        messenger: Pubkey,
        amount: u64,
        phtlc_bump: u8,
    ) -> Result<()> {
        let clock = Clock::get().unwrap();
        require!(timelock > clock.unix_timestamp.try_into().unwrap(), HTLCError::NotFutureTimeLock);
        require!(amount != 0, HTLCError::FundsNotSent);
        let phtlc = &mut ctx.accounts.phtlc;
        let commit_id_bytes = commitId.to_le_bytes();
        let bump_vector = phtlc_bump.to_le_bytes();
        let inner = vec![
            commit_id_bytes.as_ref(),
            bump_vector.as_ref(),
        ];
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
        phtlc.srcReceiver =  *ctx.accounts.srcReceiver.to_account_info().key;
        phtlc.amount = amount;
        phtlc.timelock = timelock;
        phtlc.messenger = messenger;
        phtlc.token_contract = *ctx.accounts.token_contract.to_account_info().key;
        phtlc.token_wallet = *ctx.accounts.phtlc_token_account.to_account_info().key;
        phtlc.locked = false;
        phtlc.uncommitted = false;

        emit!(TokenCommitted{
            commitId: commitId,
            hopChains: hopChains,
            hopAssets: hopAssets,
            hopAddress: hopAddress,
            dst_chain: dst_chain,
            dst_address: dst_address,
            dst_asset: dst_asset,
            sender: *ctx.accounts.sender.to_account_info().key,
            srcReceiver: *ctx.accounts.srcReceiver.to_account_info().key,
            src_asset: src_asset,
            amount: amount,
            timelock: timelock,
            messenger: messenger,
            token_contract: *ctx.accounts.token_contract.to_account_info().key,
        });
        Ok(())
    }
    
    /// @dev Sender / Payer sets up a new hash time lock contract depositing the
    /// funds and providing the reciever and terms.
    /// @param _srcReceiver srcReceiver of the funds.
    /// @param _hashlock A sha-256 hash hashlock.
    /// @param timelock UNIX epoch seconds time that the lock expires at.
    ///                  Refunds can be made after this time.
    /// @return Id of the new HTLC. This is needed for subsequent calls.
    pub fn lock(
        ctx: Context<Lock>,
        lockId: String,
        hashlock: String,
        timelock: u64,
        src_asset: String,
        dst_chain: String,
        dst_address: String,
        dst_asset: String,
        commitId: u64,
        messenger: Pubkey,
        amount: u64,
        htlc_bump: u8,
    ) -> Result<()> {
        //TODO: The unix timestamp is i64 instead of u64
        let clock = Clock::get().unwrap();
        require!(timelock > clock.unix_timestamp.try_into().unwrap(), HTLCError::NotFutureTimeLock);
        require!(amount != 0, HTLCError::FundsNotSent);
        //TODO: check if this needs to be added
        //assert(!self.hasContract(contractId), Errors::ContractAlreadyExist);
        let htlc = &mut ctx.accounts.htlc;

        let bump_vector = htlc_bump.to_le_bytes();
        let inner = vec![
            lockId.as_ref(),
            bump_vector.as_ref(),
        ];
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
        msg!("after transfer");
        htlc.dst_address = dst_address.clone();
        htlc.dst_chain = dst_chain.clone();
        htlc.dst_asset = dst_asset.clone();
        htlc.src_asset = src_asset.clone();
        htlc.sender = *ctx.accounts.sender.to_account_info().key;
        //htlc.sender = ctx.accounts.sender.key().clone();
        htlc.srcReceiver =  *ctx.accounts.srcReceiver.to_account_info().key;
        htlc.hashlock = hashlock.clone();
        htlc.secret = String::new();//"0".to_string();
        htlc.amount = amount;
        htlc.timelock = timelock;
        htlc.token_contract = *ctx.accounts.token_contract.to_account_info().key;
        htlc.token_wallet = *ctx.accounts.htlc_token_account.to_account_info().key;
        htlc.redeemed = false;
        htlc.unlocked = false;

        emit!(TokenLocked{
            hashlock: hashlock,
            dst_chain: dst_chain,
            dst_address: dst_address,
            dst_asset: dst_asset,
            sender: *ctx.accounts.sender.to_account_info().key,
            srcReceiver: *ctx.accounts.srcReceiver.to_account_info().key,
            src_asset: src_asset,
            amount: amount,
            timelock: timelock,
            messenger: messenger,
            commitId: commitId,
            token_contract:  *ctx.accounts.token_contract.to_account_info().key,
        });
        if messenger != Pubkey::default(){

        }
        Ok(())
    }

    /// @dev Called by the messenger to lockCommit the PHTLC to HTLC
    ///
    /// @param phtlcId of the PHTLC to lockCommit.
    /// @param hashlock of the HTLC to be locked.
    pub fn lockCommit(
        ctx: Context<LockCommit>,
        commitId: u64,
        lockId: String,
        hashlock: String,
        phtlc_bump: u8,
    ) -> Result<()> {
        let phtlc = &mut ctx.accounts.phtlc;

        phtlc.locked = true;
        let amount = phtlc.amount;
        transfer_phtlc_out(
            ctx.accounts.user_signing.to_account_info(),
            commitId,
            phtlc.to_account_info(),
            phtlc_bump,
            &mut ctx.accounts.phtlc_token_account,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.htlc_token_account.to_account_info(),
            amount,//ctx.accounts.phtlc.amount
        )?;
        
        let htlc = &mut ctx.accounts.htlc;

        htlc.dst_chain = phtlc.dst_chain.clone();
        htlc.dst_address = phtlc.dst_address.clone();
        htlc.dst_asset = phtlc.dst_asset.clone();
        htlc.sender = phtlc.sender;
        htlc.srcReceiver =  phtlc.srcReceiver;
        htlc.src_asset = phtlc.src_asset.clone();
        htlc.hashlock = hashlock.clone();
        htlc.secret = String::new();
        htlc.amount = amount;
        htlc.timelock = phtlc.timelock;
        htlc.token_contract = *ctx.accounts.token_contract.to_account_info().key;
        htlc.token_wallet = *ctx.accounts.htlc_token_account.to_account_info().key;
        htlc.redeemed = false;
        htlc.unlocked = false;

        emit!(TokenLocked{
            hashlock: hashlock,
            dst_chain: phtlc.dst_chain.clone(),
            dst_address: phtlc.dst_address.clone(),
            dst_asset: phtlc.dst_asset.clone(),
            sender: phtlc.sender,
            srcReceiver: phtlc.srcReceiver,
            src_asset: phtlc.src_asset.clone(),
            amount: amount,
            timelock: phtlc.timelock,
            messenger: phtlc.messenger,
            commitId: commitId,
            token_contract:  *ctx.accounts.token_contract.to_account_info().key,
        });

        Ok(())
    }

    /// @dev Called by the srcReceiver once they know the secret of the hashlock.
    /// This will transfer the locked funds to the HTLC's srcReceiver's address.
    ///
    /// @param htlcId of the HTLC.
    /// @param secret sha256(secret) should equal the contract hashlock.
    pub fn redeem(ctx: Context<Redeem>, lockId: String, secret: String, htlc_bump: u8) -> Result<bool>{
        let htlc = &mut ctx.accounts.htlc;
        //let hex_hash = &anchor_lang::solana_program::hash::hash(secret.as_bytes()).to_bytes();
        let mut hasher = Sha256::new();
        hasher.update(secret.clone());
        let pre = hasher.finalize();
        let mut hasher = Sha256::new();
        hasher.update(pre);
        let hash_pre = hasher.finalize();
        let hex_hash = hex::encode(hash_pre);
        require!(hex_hash == htlc.hashlock, HTLCError::HashlockNoMatch);

        htlc.secret = secret;
        htlc.redeemed = true;


        transfer_htlc_out(
            ctx.accounts.sender.to_account_info(),
            lockId.clone(),
            // htlc.hashlock.clone(),
            htlc.to_account_info(),
            htlc_bump,
            &mut ctx.accounts.htlc_token_account,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.srcReceiver_token_account.to_account_info(),
            ctx.accounts.htlc.amount
        )?;

        emit!(TokenRedeemed{
            lockId: lockId.clone(),
            redeem_address: ctx.accounts.user_signing.key(),
        });
        Ok(true)
    }

    /// @dev Called by the sender if there was no redeem OR lockCommit AND the time lock has
    /// expired. This will unlock the contract amount.
    ///
    /// @param _phtlcId of the PHTLC to unlock from.
    /// @return bool true on success
    pub fn uncommit(ctx: Context<UnCommit>, commitId: u64, phtlc_bump: u8) -> Result<bool> {
        let phtlc = &mut ctx.accounts.phtlc;

        phtlc.uncommitted = true;

        transfer_phtlc_out(
            ctx.accounts.sender.to_account_info(),
            commitId,
            phtlc.to_account_info(),
            phtlc_bump,
            &mut ctx.accounts.phtlc_token_account,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.sender_token_account.to_account_info(),
            ctx.accounts.phtlc.amount
        )?;

        emit!(TokenUncommited{ commitId: commitId });
        Ok(true)
    }

    /// @dev Called by the sender if there was no redeem AND the time lock has
    /// expired. This will unlock the contract amount.
    ///
    /// @param _htlcId of the HTLC to unlock from.
    pub fn unlock(ctx: Context<UnLock>, lockId: String, htlc_bump: u8) -> Result<bool> {
        let htlc = &mut ctx.accounts.htlc;

        htlc.unlocked = true;

        transfer_htlc_out(
            ctx.accounts.sender.to_account_info(),
            lockId.clone(),
            // htlc.hashlock.clone(),
            htlc.to_account_info(),
            htlc_bump,
            &mut ctx.accounts.htlc_token_account,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.sender_token_account.to_account_info(),
            ctx.accounts.htlc.amount
        )?;

        emit!(TokenUnlocked{ lockId: lockId.clone() });
        Ok(true)
    }

    /// @dev Get PHTLC details.
    /// @param phtlcId of the PHTLC.
    pub fn get_pdetails(ctx: Context<GetPDetails>, commitId: u64, phtlc_bump: u8) -> Result<PHTLC> {
        let phtlc = &ctx.accounts.phtlc;
        Ok(PHTLC {
            dst_address: phtlc.dst_address.clone(),
            dst_chain: phtlc.dst_chain.clone(),
            dst_asset: phtlc.dst_asset.clone(),
            src_asset: phtlc.src_asset.clone(),
            sender: phtlc.sender,
            srcReceiver: phtlc.srcReceiver,
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
    /// @param htlcId of the HTLC.
    // pub fn get_details(ctx: Context<GetDetails>, lockId: String, htlc_bump: u8) -> Result<HTLC> {
    //     let htlc = &ctx.accounts.htlc;
    //     Ok(HTLC {
    //         hashlock: htlc.hashlock.clone(),
    //         secret:htlc.secret.clone(),
    //         amount: htlc.amount,
    //         timelock: htlc.timelock,
    //         sender: htlc.sender,
    //         srcReceiver: htlc.srcReceiver,
    //         token_contract: htlc.token_contract,
    //         token_wallet: htlc.token_wallet,
    //         redeemed: htlc.redeemed,
    //         unlocked: htlc.unlocked
    //     })
    // }
    pub fn get_details(ctx: Context<GetDetails>, lockId: String, htlc_bump: u8) -> Result<String> {
        let htlc = &ctx.accounts.htlc;
        Ok(htlc.secret.clone())
    }

}

#[account]
#[derive(Default)]
pub struct PHTLC{
    pub dst_address: String,
    pub dst_chain: String,
    pub dst_asset: String,
    pub src_asset: String,
    pub sender: Pubkey,
    pub srcReceiver: Pubkey,
    pub amount: u64,//TODO: check if this should be u256, though the spl uses u64
    pub timelock: u64,//TODO: check if this should be u256
    pub messenger: Pubkey,
    pub token_contract: Pubkey,
    pub token_wallet: Pubkey,
    pub locked: bool,
    pub uncommitted: bool,
}

#[account]
#[derive(InitSpace)]
pub struct Counter {
    pub count: u64,// 8 bytes
}
#[account]
#[derive(Default)]
pub struct HTLC{
    pub dst_address: String,
    pub dst_chain: String,
    pub dst_asset: String,
    pub src_asset: String,
    pub sender: Pubkey,
    pub srcReceiver: Pubkey,
    pub hashlock: String,
    pub secret: String,
    pub amount: u64,//TODO: check if this should be u256, though the spl uses u64
    pub timelock: u64,//TODO: check if this should be u256
    pub token_contract: Pubkey,
    pub token_wallet: Pubkey,
    pub redeemed: bool,
    pub unlocked: bool,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        seeds = [b"counter"],
        bump,
        payer = user,
        space = 8 + Counter::INIT_SPACE
    )]
    pub counter: Account<'info, Counter>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]   
#[instruction(commitId: u64, phtlc_bump: u8)]         
pub struct Commit<'info > {
    #[account(
        init,
        payer = sender,
        space = size_of::<PHTLC>() + 8,
        seeds = [
            commitId.to_le_bytes().as_ref()
        ],
        bump,
    )]
    pub phtlc: Box<Account<'info, PHTLC>>,
    #[account(
        init,
        payer = sender,
        seeds = [
            b"phtlc_account".as_ref(),
            commitId.to_le_bytes().as_ref()
        ],
        bump,
        token::mint=token_contract,
        token::authority=phtlc,
    )]
    pub phtlc_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub sender: Signer<'info>,
    ///CHECK: The reciever
    pub srcReceiver: UncheckedAccount<'info>,
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
#[instruction(lockId: String, htlc_bump: u8)]         
pub struct Lock<'info > {
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
            b"htlc_account".as_ref(),
            lockId.as_ref()
        ],
        bump,
        token::mint=token_contract,
        token::authority=htlc,
    )]
    pub htlc_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub sender: Signer<'info>,
    ///CHECK: The reciever
    pub srcReceiver: UncheckedAccount<'info>,
    pub token_contract: Account<'info, Mint>,

    #[account(
        mut,
        constraint=sender_token_account.owner == sender.key() @HTLCError::NotSender,
        constraint=sender_token_account.mint == token_contract.key() @ HTLCError::NoToken,
    )]
    pub sender_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)] 
#[instruction(lockId: String, htlc_bump: u8)]         
pub struct Redeem<'info > {
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
        //constraint = htlc.srcReceiver == *srcReceiver_token_account.owner @ HTLCError::UnauthorizedAccess
    )]
    pub htlc: Box<Account<'info, HTLC>>,
    #[account(
        mut,
        seeds = [
            b"htlc_account".as_ref(),
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
    #[account(mut)]
    user_signing: Signer<'info>,  
    ///CHECK: The reciever
    pub srcReceiver: UncheckedAccount<'info>,                     
    token_contract: Account<'info, Mint>,   

    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    associated_token_program: Program<'info, AssociatedToken>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)] 
#[instruction(commitId: u64, phtlc_bump: u8)]  
pub struct UnCommit<'info > {
    #[account(mut,
    seeds = [
        commitId.to_le_bytes().as_ref()
    ],
    bump = phtlc_bump,
    has_one = sender @HTLCError::NotSender,
    has_one = token_contract @HTLCError::NoToken,
    constraint = !phtlc.uncommitted @ HTLCError::AlreadyUncommitted,
    constraint = !phtlc.locked @ HTLCError::AlreadyLocked,
    constraint = Clock::get().unwrap().unix_timestamp >= phtlc.timelock.try_into().unwrap() @ HTLCError::NotPastTimeLock,
    //constraint = htlc.sender == *sender_token_account.owner @ HTLCError::UnauthorizedAccess
    )]
    pub phtlc: Box<Account<'info,PHTLC>>,
    #[account(
        mut,
        seeds = [
            b"phtlc_account".as_ref(),
            commitId.to_le_bytes().as_ref()
        ],
        bump,
    )]
    pub phtlc_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    user_signing: Signer<'info>,
    ///CHECK: The sender
    #[account(mut)]//TODO: check if this should be mutable
    sender: UncheckedAccount<'info>,                   
    token_contract: Account<'info, Mint>,  
    #[account(
        mut,
        constraint=phtlc.sender.key() == sender_token_account.owner,
        constraint=sender_token_account.mint == token_contract.key())]
    pub sender_token_account: Account<'info, TokenAccount>,

    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,

}

#[derive(Accounts)] 
#[instruction(lockId: String, htlc_bump: u8)]  
pub struct UnLock<'info > {
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
    //constraint = htlc.sender == *sender_token_account.owner @ HTLCError::UnauthorizedAccess
    )]
    pub htlc: Box<Account<'info,HTLC>>,
    #[account(
        mut,
        seeds = [
            b"htlc_account".as_ref(),
            lockId.as_ref()
        ],
        bump,
    )]
    pub htlc_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    user_signing: Signer<'info>,
    ///CHECK: The sender
    #[account(mut)]//TODO: check if this should be mutable
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
#[instruction(commitId: u64, lockId: String, phtlc_bump: u8)]  
pub struct LockCommit<'info > {
    #[account(mut,
    seeds = [
        commitId.to_le_bytes().as_ref()
    ],
    bump,
    has_one = token_contract @HTLCError::NoToken,
    constraint = !phtlc.uncommitted @ HTLCError::AlreadyUncommitted,
    constraint = !phtlc.locked @ HTLCError::AlreadyLocked,
    constraint = phtlc.sender == user_signing.key() || phtlc.messenger == user_signing.key() @ HTLCError::UnauthorizedAccess,
    )]
    pub phtlc: Box<Account<'info,PHTLC>>,
    #[account(
    init,
    payer = user_signing,
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
            b"phtlc_account".as_ref(),
            commitId.to_le_bytes().as_ref()
        ],
        bump,
    )]
    pub phtlc_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
    init,
    payer = user_signing,
    seeds = [
        b"htlc_account".as_ref(),
        lockId.as_ref()
    ],
    bump,
    token::mint=token_contract,
    token::authority=htlc,
    )]
    pub htlc_token_account: Box<Account<'info, TokenAccount>>,


    #[account(mut)]
    user_signing: Signer<'info>,
    ///CHECK: The sender        
    token_contract: Account<'info, Mint>,  
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,

}

#[derive(Accounts)]
#[instruction(commitId: u64, phtlc_bump: u8)] 
pub struct GetPDetails<'info> {
    #[account(
        seeds = [
            commitId.to_le_bytes().as_ref()
        ],
        bump,// = htlc_bump,
    )]
    pub phtlc: Box<Account<'info, PHTLC>>,
}

#[derive(Accounts)]
#[instruction(lockId: String, htlc_bump: u8)] 
pub struct GetDetails<'info> {
    #[account(
        seeds = [
            lockId.as_ref()
        ],
        bump,// = htlc_bump,
    )]
    pub htlc: Box<Account<'info, HTLC>>,
}

#[event]
pub struct TokenCommitted{
    pub commitId: u64,
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
pub struct TokenLocked{
    #[index]
    hashlock: String,
    dst_chain: String,
    dst_address: String,
    dst_asset: String,
    #[index]
    sender: Pubkey,
    srcReceiver: Pubkey,
    src_asset: String,
    amount: u64,//TODO: check if this should be u256
    timelock: u64,//TODO: check if this should be u256
    messenger: Pubkey,
    commitId: u64,
    token_contract: Pubkey,//TODO: check what type is token
}

#[event]
pub struct TokenRedeemed{
    #[index]
    lockId: String,//Check the type
    redeem_address: Pubkey,
}
#[event]
pub struct TokenUnlocked{
    #[index]
    lockId: String,//Check the type
}
#[event]
pub struct TokenUncommited{
    #[index]
    commitId: u64,
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
