use anchor_lang::prelude::*;
use anchor_lang::system_program;
use std::mem::size_of;
use sha2::{Sha256, Digest};
declare_id!("FHNm9iB3sE6rJ2kFyj4URGS3FGpYim6vjGtd1kdc5Mws");

/// @title Pre Hashed Timelock Contracts (PHTLCs) on Solana.
///
/// This contract provides a way to create and keep PHTLCs for Solana.
///
/// Protocol:
///
///  1) commit(src_receiver, timelock, amount) - a
///      sender calls this to create a new PHTLC
///      for a given amount. A String commitId is returned.
///  2) lock(src_receiver, hashlock, timelock, amount) - a
///      sender calls this to create a new HTLC 
///      for a given amount. A String lockId is returned.
///  3) lockCommit(commitId, hashlock) - the messenger calls this function
///      to convert the PHTLC to HTLC with the given hashlock.
///  4) redeem(lockId, secret) - once the src_receiver knows the secret of
///      the hashlock hash they can claim the sol with this function
///  5) unlock(lockId) - after timelock has expired and if the src_receiver did not
///      redeem the sol the sender / creator of the HTLC can get their sol
///      back with this function.
///  6) uncommit(commitId) - after timelock has expired and if the messenger did not
///      lockCommit the PHTLC, then the sender can get their sol
///      back with this function.
#[program]
pub mod native_htlc {

    use super::*;

    /// @dev Called by the Sender to get the commitId from the given parameters.
    pub fn calculate_commit_id(
       ctx: Context<Calculate_commit_id>,  
       dst_chain: String,
       dst_asset: String,
       dst_address: String,
       src_asset: String,
       srcReceiver: Pubkey,
       timelock: u64,
       messenger: Pubkey,
       amount: u64
       ) -> Result<String>{

       let src_chain = "SOLANA DEVNET";
       let contract_address = ctx.program_id;
       msg!("contract address: {}", contract_address);
       let signer = *ctx.accounts.signer.to_account_info().key;
       msg!("signer: {}", signer);
       
       let mut hasher = Sha256::new();
       hasher.update(src_chain.clone());
       hasher.update(contract_address);
       hasher.update(signer);
       hasher.update(&amount.to_be_bytes());
       hasher.update(dst_chain.clone());
       hasher.update(dst_address.clone());
       hasher.update(dst_asset.clone());
       hasher.update(src_asset.clone());
       hasher.update(srcReceiver);
       hasher.update(&timelock.to_be_bytes());
       hasher.update(messenger);
       
       let hash = hasher.finalize();
       let commitId = hex::encode(hash);
       msg!("commit id: {}", commitId);
       Ok(commitId)
    }

    /// @dev Sender / Payer sets up a new pre-hash time lock contract depositing the
    /// funds and providing the src_receiver and terms.
    /// @param src_receiver src_receiver of the funds.
    /// @param timelock UNIX epoch seconds time that the lock expires at.
    ///                  Refunds can be made after this time.
    /// @return Id of the new PHTLC. This is needed for subsequent calls.
    pub fn commit(
        ctx: Context<Commit>,
        commitId: String,
        hopChains: Vec<String>,
        hopAssets: Vec<String>, 
        hopAddresses: Vec<String>,
        dst_chain: String,
        dst_asset: String,
        dst_address: String,
        src_asset: String,
        src_receiver: Pubkey,
        timelock: u64,
        messenger: Pubkey,
        amount: u64,
        phtlc_bump: u8,
    ) -> Result<()> {
        let clock = Clock::get().unwrap();
        require!(timelock > clock.unix_timestamp.try_into().unwrap(), HTLCError::NotFutureTimeLock);
        require!(amount != 0, HTLCError::FundsNotSent);
        let phtlc = &mut ctx.accounts.phtlc;

        phtlc.dst_address = dst_address.clone();
        phtlc.dst_chain = dst_chain.clone();
        phtlc.dst_asset = dst_asset.clone();
        phtlc.src_asset = src_asset.clone();
        phtlc.sender = *ctx.accounts.sender.to_account_info().key;
        phtlc.src_receiver = src_receiver;
        phtlc.amount = amount;
        phtlc.timelock = timelock;
        phtlc.messenger = messenger;
        phtlc.locked = false;
        phtlc.uncommitted = false;
       
        let bump_vector = phtlc_bump.to_le_bytes();
        let inner = vec![
            commitId.as_ref(),
            bump_vector.as_ref(),
        ];
        let outer = vec![inner.as_slice()];

        let transfer_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.sender.to_account_info(),
                to: phtlc.to_account_info(),
            },
            outer.as_slice(),
        );
        system_program::transfer(transfer_context, amount)?;
        
        emit!(TokenCommited{
            commitId: commitId,
            hopChains: hopChains,
            hopAssets: hopAssets,
            hopAddresses: hopAddresses,
            dst_chain: dst_chain,
            dst_address: dst_address,
            dst_asset: dst_asset,
            sender: *ctx.accounts.sender.to_account_info().key,
            src_receiver: src_receiver,
            src_asset: src_asset,
            timelock: timelock,
            messenger: messenger,
            amount: amount,
            
        });
        Ok(())
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
        lockId: String,
        commitId: String,
        hashlock: String,
        timelock: u64,
        amount: u64,
        dst_chain: String,
        dst_address: String,
        dst_asset: String,
        src_asset: String,
        src_receiver: Pubkey,
        messenger: Pubkey,
        htlc_bump: u8,
    ) -> Result<()> {
        let clock = Clock::get().unwrap();
        require!(timelock > clock.unix_timestamp.try_into().unwrap(), HTLCError::NotFutureTimeLock);
        require!(amount != 0, HTLCError::FundsNotSent);

        let htlc = &mut ctx.accounts.htlc;
        
        htlc.dst_address = dst_address.clone();
        htlc.dst_chain = dst_chain.clone();
        htlc.dst_asset = dst_asset.clone();
        htlc.src_asset = src_asset.clone();
        htlc.sender = *ctx.accounts.sender.to_account_info().key;
        htlc.src_receiver = src_receiver;
        htlc.hashlock = hashlock.clone();
        htlc.secret = String::new();
        htlc.amount = amount;
        htlc.timelock = timelock;
        htlc.redeemed = false;
        htlc.unlocked = false; 

        let bump_vector = htlc_bump.to_le_bytes();
        let inner = vec![
            lockId.as_ref(),
            bump_vector.as_ref(),
        ];
        let outer = vec![inner.as_slice()];
        let transfer_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.sender.to_account_info(),
                to: htlc.to_account_info(),
            },
            outer.as_slice(),
        );
        system_program::transfer(transfer_context, amount)?; 

        emit!(TokenLocked{
            hashlock: hashlock,
            dst_address: dst_address.clone(),
            dst_chain: dst_chain.clone(),
            dst_asset: dst_asset.clone(),
            sender: *ctx.accounts.sender.to_account_info().key,
            src_receiver: src_receiver,
            src_asset: src_asset.clone(),
            amount: amount,
            timelock: timelock,
            messenger: messenger,
            commitId: commitId,
        });
        // if messenger != Pubkey::default(){}

        let lockIdStruct =  &mut ctx.accounts.lockIdStruct;
        lockIdStruct.lock_id = lockId.clone();
        
        Ok(())
    }

    /// @dev Called by the messenger to lockCommit the PHTLC to HTLC
    ///
    /// @param commitId of the PHTLC to lockCommit.
    /// @param hashlock of the HTLC to be locked.
    pub fn lockCommit(
        ctx: Context<LockCommit>,
        commitId: String,
        lockId: String,
        hashlock: String,
        phtlc_bump: u8,
    ) -> Result<()> {
        let phtlc = &mut ctx.accounts.phtlc;

        phtlc.locked = true;

        let amount = phtlc.amount;
        let htlc = &mut ctx.accounts.htlc;

        phtlc.sub_lamports(amount)?;
        htlc.add_lamports(amount)?;

        htlc.dst_address = phtlc.dst_address.clone();
        htlc.dst_chain = phtlc.dst_chain.clone();
        htlc.dst_asset = phtlc.dst_asset.clone();
        htlc.src_asset = phtlc.src_asset.clone();
        htlc.sender = phtlc.sender;
        htlc.src_receiver =  phtlc.src_receiver;
        htlc.hashlock = hashlock.clone();
        htlc.secret = String::new();
        htlc.amount = amount;
        htlc.timelock = phtlc.timelock;
        htlc.redeemed = false;
        htlc.unlocked = false;

        emit!(TokenLocked{
            hashlock: hashlock,
            dst_address: phtlc.dst_address.clone(),
            dst_chain: phtlc.dst_chain.clone(),
            dst_asset: phtlc.dst_asset.clone(),
            sender: phtlc.sender,
            src_receiver: phtlc.src_receiver,
            src_asset: phtlc.src_asset.clone(),
            amount: amount,
            timelock: phtlc.timelock,
            messenger: phtlc.messenger,
            commitId: commitId,
        });

        Ok(())
    }

    /// @dev Called by the src_receiver once they know the secret of the hashlock.
    /// This will transfer the locked funds to the HTLC's src_receiver's address.
    ///
    /// @param lockId of the HTLC.
    /// @param secret sha256(secret) should equal the contract hashlock.
    pub fn redeem(ctx: Context<Redeem>, lockId: String, secret: String, htlc_bump: u8) -> Result<bool>{
        let htlc = &mut ctx.accounts.htlc;
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

        let amount = htlc.amount;

        htlc.sub_lamports(amount)?;
        ctx.accounts.src_receiver.add_lamports(amount)?;

        emit!(TokenClaimed{
            lockId: lockId.clone(),
            redeem_address: ctx.accounts.user_signing.key(),
        });
        Ok(true)
    }

    /// @dev Called by the sender if there was no redeem OR lockCommit AND the time lock has
    /// expired. This will refund the contract amount.
    ///
    /// @param commitId of the PHTLC to uncommit from.
    /// @return bool true on success
    pub fn uncommit(ctx: Context<Uncommit>, commitId: String, phtlc_bump: u8) -> Result<bool> {
        let phtlc = &mut ctx.accounts.phtlc;

        phtlc.uncommitted = true;

        let amount = phtlc.amount;

        phtlc.sub_lamports(amount)?;
        ctx.accounts.sender.add_lamports(amount)?;

        emit!(TokenUnCommitted{
            commitId: commitId});
        Ok(true)
    }

    /// @dev Called by the sender if there was no redeem AND the time lock has
    /// expired. This will refund the contract amount.
    ///
    /// @param lockId of the HTLC to unlock from.
    pub fn unlock(ctx: Context<Unlock>, lockId: String, htlc_bump: u8) -> Result<bool> {
        let htlc = &mut ctx.accounts.htlc;

        htlc.unlocked = true;

        let amount = htlc.amount;

        htlc.sub_lamports(amount)?;
        ctx.accounts.sender.add_lamports(amount)?;
    
        emit!(TokenUnlocked{
                lockId: lockId.clone()});
        Ok(true)
    }

    /// @dev Get PHTLC details.
    /// @param commitId of the PHTLC.
    pub fn getCommitDetails(ctx: Context<GetPDetails>, commitId: String, phtlc_bump: u8) -> Result<PHTLC> {
        let phtlc = &ctx.accounts.phtlc;
        Ok(PHTLC {
            dst_address: phtlc.dst_address.clone(),
            dst_chain: phtlc.dst_chain.clone(),
            dst_asset: phtlc.dst_asset.clone(),
            src_asset: phtlc.src_asset.clone(),
            sender: phtlc.sender,
            src_receiver: phtlc.src_receiver,
            amount: phtlc.amount,
            timelock: phtlc.timelock,
            messenger: phtlc.messenger,
            locked: phtlc.locked,
            uncommitted: phtlc.uncommitted,
        })
    }

    /// @dev Get HTLC details.
    /// @param lockId of the HTLC.
    // pub fn getLockDetails(ctx: Context<GetDetails>, lockId: String, htlc_bump: u8) -> Result<HTLC> {
    //     let htlc = &ctx.accounts.htlc;
    //     Ok(HTLC {
    //         dst_address: htlc.dst_address.clone(),
    //         dst_chain: htlc.dst_chain.clone(),
    //         dst_asset: htlc.dst_asset.clone(),
    //         src_asset: htlc.src_asset.clone(),
    //         sender: htlc.sender,
    //         src_receiver: htlc.src_receiver,
    //         hashlock: htlc.hashlock.clone(),
    //         secret:htlc.secret.clone(),
    //         amount: htlc.amount,
    //         timelock: htlc.timelock,
    //         redeemed: htlc.redeemed,
    //         unlocked: htlc.unlocked
    //     })
    // }
    pub fn getLockDetails(ctx: Context<GetDetails>, lockId: String, htlc_bump: u8) -> Result<String> {
        let htlc = &ctx.accounts.htlc;
        Ok(htlc.secret.clone())
    }

    pub fn getLockIdByCommitId(ctx: Context<GetLockIdByCommitId>, commitId: String) -> Result<String> {
        let lockIdStruct = &ctx.accounts.lockIdStruct;
        Ok(lockIdStruct.lock_id.clone())
    }

}

#[account]
#[derive(Default)]
pub struct LockIdStruct {
    pub lock_id: String,
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
    pub hashlock: String,
    pub secret: String,
    pub amount: u64,
    pub timelock: u64,
    pub redeemed: bool,
    pub unlocked: bool,
}

#[account]
#[derive(Default)]
pub struct PHTLC {
    pub dst_address: String,
    pub dst_chain: String,
    pub dst_asset: String,
    pub src_asset: String,
    pub sender: Pubkey,
    pub src_receiver: Pubkey,
    pub amount: u64,
    pub timelock: u64,
    pub messenger: Pubkey,
    pub locked: bool,
    pub uncommitted: bool,
}

#[derive(Accounts)]         
pub struct Calculate_commit_id<'info > {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]   
#[instruction(commitId: String, phtlc_bump: u8)]         
pub struct Commit<'info > {
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

    #[account(mut)]
    pub sender: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]   
#[instruction(lockId: String, commitId: String, htlc_bump: u8)]         
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
        // space = size_of::<LockIdStruct>() + 8,
        space = 128,
        seeds = [
            b"commit_to_lock".as_ref(),
            commitId.as_ref()
        ],
        bump,// = htlc_bump,
    )]
    pub lockIdStruct: Box<Account<'info, LockIdStruct>>,

    #[account(mut)]
    pub sender: Signer<'info>,

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
        bump,
        has_one = src_receiver @HTLCError::NotReciever,
        constraint = !htlc.redeemed @ HTLCError::AlreadyRedeemed,
        constraint = !htlc.unlocked @ HTLCError::AlreadyUnlocked,
    )]
    pub htlc: Box<Account<'info, HTLC>>,
        
    #[account(mut)]
    user_signing: Signer<'info>,  
    ///CHECK: The reciever
    #[account(mut)]
    pub src_receiver: UncheckedAccount<'info>,                     

    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)] 
#[instruction(commitId: String, phtlc_bump: u8)]  
pub struct Uncommit<'info > {
    #[account(mut,
    seeds = [
        commitId.as_ref()
    ],
    bump = phtlc_bump,
    has_one = sender @HTLCError::NotSender,
    constraint = !phtlc.uncommitted @ HTLCError::AlreadyUncommitted,
    constraint = !phtlc.locked @ HTLCError::AlreadyLocked,
    constraint = Clock::get().unwrap().unix_timestamp >= phtlc.timelock.try_into().unwrap() @ HTLCError::NotPastTimeLock,
    )]
    pub phtlc: Box<Account<'info,PHTLC>>,

    #[account(mut)]
    user_signing: Signer<'info>,
    ///CHECK: The sender
    #[account(mut)]
    sender: UncheckedAccount<'info>,                   

    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,

}

#[derive(Accounts)] 
#[instruction(lockId: String, htlc_bump: u8)]  
pub struct Unlock<'info > {
    #[account(mut,
    seeds = [
        lockId.as_ref()
    ],
    bump = htlc_bump,
    has_one = sender @HTLCError::NotSender,
    constraint = !htlc.unlocked @ HTLCError::AlreadyUnlocked,
    constraint = !htlc.redeemed @ HTLCError::AlreadyRedeemed,
    constraint = Clock::get().unwrap().unix_timestamp >= htlc.timelock.try_into().unwrap() @ HTLCError::NotPastTimeLock,
    )]
    pub htlc: Box<Account<'info,HTLC>>,

    #[account(mut)]
    user_signing: Signer<'info>,
    ///CHECK: The sender
    #[account(mut)]
    sender: UncheckedAccount<'info>,                   

    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,

}


#[derive(Accounts)] 
#[instruction(commitId: String, lockId: String, phtlc_bump: u8)]  
pub struct LockCommit<'info > {
    #[account(mut,
    seeds = [
        commitId.as_ref()
    ],
    bump,
    constraint = !phtlc.uncommitted @ HTLCError::AlreadyUncommitted,
    constraint = !phtlc.locked @ HTLCError::AlreadyLocked,
    constraint = phtlc.sender == user_signing.key() || phtlc.messenger == user_signing.key() @ HTLCError::UnauthorizedAccess,
    )]
    pub phtlc: Box< Account<'info,PHTLC>>,
    #[account(
    init,
    payer = user_signing,
    space = size_of::<HTLC>() + 8,
    seeds = [
        lockId.as_ref()
    ],
    bump,
    )]
    pub htlc: Box<Account<'info, HTLC>>,

    #[account(mut)]
    user_signing: Signer<'info>,    

    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,

}

#[derive(Accounts)]
#[instruction(commitId: String, phtlc_bump: u8)] 
pub struct GetPDetails<'info> {
    #[account(
        seeds = [
            commitId.as_ref()
        ],
        bump,
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


#[derive(Accounts)]
#[instruction(commitId: String)] 
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

#[event]
pub struct TokenCommited{
    pub commitId: String,
    pub hopChains: Vec<String>,
    pub hopAssets: Vec<String>,
    pub hopAddresses: Vec<String>,
    pub dst_chain: String,
    pub dst_address: String,
    pub dst_asset: String,
    pub sender: Pubkey,
    pub src_receiver: Pubkey,
    pub src_asset: String,
    pub timelock: u64,
    pub messenger: Pubkey,
    pub amount: u64,
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
    #[index]
    src_receiver: Pubkey,
    src_asset: String,
    amount: u64,
    timelock: u64,
    messenger: Pubkey,
    commitId: String,
}
#[event]
pub struct TokenClaimed{
    #[index]
    lockId: String,
    redeem_address: Pubkey,
}
#[event]
pub struct TokenUnlocked{
    #[index]
    lockId: String,
}
#[event]
pub struct TokenUnCommitted{
    #[index]
    commitId: String,
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
    #[msg("Already Locked")]
    AlreadyLocked,
    #[msg("Funds Can Not Be Zero.")]
    FundsNotSent,
    #[msg("Unauthorized Access")]
    UnauthorizedAccess,
    #[msg("Not The Sender")]
    NotSender,
    #[msg("Not The Reciever")]
    NotReciever,
}
