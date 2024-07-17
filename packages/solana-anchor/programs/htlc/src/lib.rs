use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{CloseAccount, Mint, Token, TokenAccount, Transfer}};
use std::mem::size_of;
use sha2::{Sha256, Digest};
declare_id!("FFaJcAebNyNU6MoCQPVpN1VGwB5uxwc2TYbr6JfsC9cv");

// 
/// A small utility function that allows us to transfer funds out of the htlc.
///
/// # Arguments
///
/// * `sender` - Alice's account
/// * `htlcId` - The index of the htlc
/// * `htlc` - the htlc public key (PDA)
/// * `htlc_bump` - the application state public key (PDA) bump
/// * `htlc_wallet` - The htlc Token account
/// * `token_program` - the token program address
/// * `destination_wallet` - The public key of the destination address (where to send funds)
/// * `amount` - the amount of token that is sent from `htlc_wallet` to `destination_wallet`
///
fn transfer_htlc_out<'info>(
    sender: AccountInfo<'info>,
    htlcId: String,
    htlc: AccountInfo<'info>,
    htlc_bump: u8,
    htlc_wallet: &mut Account<'info, TokenAccount>,
    token_program: AccountInfo<'info>,
    destination_wallet: AccountInfo<'info>,
    amount: u64
) -> Result<()> {
    let bump_vector = htlc_bump.to_le_bytes();
    let inner = vec![
        htlcId.as_ref(),
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

#[program]
pub mod anchor_htlc {

    use anchor_spl::token::Transfer;
    use super::*;

    pub fn create(
        ctx: Context<Create>,
        htlcId: String,
        hashlock: String,
        _timelock: u64,
        _amount: u64,
        _chainId: u64,
        _targetCurrencyReceiverAddress: String,
        htlc_bump: u8,
    ) -> Result<()> {
        let htlc = &mut ctx.accounts.htlc;
        let clock = Clock::get().unwrap();//TODO: maybe this should be Clock::get()?
        //TODO: The unix timestamp is i64 instead of u64
        require!(_timelock > clock.unix_timestamp.try_into().unwrap(), HTLCError::NotFutureTimeLock);
        require!(_amount != 0, HTLCError::FundsNotSent);
        msg!("before transfer");
        //TODO: check if this needs to be added
        //assert(!self.hasContract(contractId), Errors::ContractAlreadyExist);
        let bump_vector = htlc_bump.to_le_bytes();
        let inner = vec![
            htlcId.as_ref(),
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
        anchor_spl::token::transfer(transfer_context, _amount)?;
        msg!("after transfer");
        htlc.hashlock = hashlock.clone();
        htlc.secret = String::new();//"0".to_string();
        htlc.amount = _amount;
        htlc.timelock = _timelock;
        htlc.sender = *ctx.accounts.sender.to_account_info().key;
        //htlc.sender = ctx.accounts.sender.key().clone();
        htlc.receiver =  *ctx.accounts.receiver.to_account_info().key;
        htlc.tokenContract = *ctx.accounts.tokenContract.to_account_info().key;
        htlc.token_wallet = *ctx.accounts.htlc_token_account.to_account_info().key;
        htlc.redeemed = false;
        htlc.refunded = false;

        emit!(TokenTransferInitiated{
            hashlock: hashlock,
            amount: _amount,
            chainId: _chainId,
            timelock: _timelock,
            sender: *ctx.accounts.sender.to_account_info().key,
            receiver: *ctx.accounts.receiver.to_account_info().key,
            tokenContract:  *ctx.accounts.tokenContract.to_account_info().key,
            targetCurrencyReceiverAddress: _targetCurrencyReceiverAddress,
        });
        Ok(())
    }
    pub fn redeem(ctx: Context<Redeem>, htlcId: String, _secret: String, htlc_bump: u8) -> Result<bool>{
        let htlc = &mut ctx.accounts.htlc;
        //let hex_hash = &anchor_lang::solana_program::hash::hash(_secret.as_bytes()).to_bytes();
        let mut hasher = Sha256::new();
        hasher.update(_secret.clone());
        let pre = hasher.finalize();
        let mut hasher = Sha256::new();
        hasher.update(pre);
        let hash_pre = hasher.finalize();
        let hex_hash = hex::encode(hash_pre);
        require!(hex_hash == htlc.hashlock, HTLCError::HashlockNoMatch);

        htlc.secret = _secret;
        htlc.redeemed = true;


        transfer_htlc_out(
            ctx.accounts.sender.to_account_info(),
            //htlc.sender.to_account_info(),
            htlcId.clone(),
            // htlc.hashlock.clone(),
            ctx.accounts.htlc.to_account_info(),
            htlc_bump,
            &mut ctx.accounts.htlc_token_account,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.receiver_token_account.to_account_info(),
            ctx.accounts.htlc.amount
        )?;

        emit!(TokenTransferClaimed{
            // htlcId: hashlock.clone(),
            htlcId: htlcId.clone(),
        });
        Ok(true)
    }
    pub fn refund(ctx: Context<Refund>, htlcId: String, htlc_bump: u8) -> Result<bool> {
        let htlc = &mut ctx.accounts.htlc;

        htlc.refunded = true;

        transfer_htlc_out(
            ctx.accounts.sender.to_account_info(),
            htlcId.clone(),
            // htlc.hashlock.clone(),
            ctx.accounts.htlc.to_account_info(),
            htlc_bump,
            &mut ctx.accounts.htlc_token_account,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.sender_token_account.to_account_info(),
            ctx.accounts.htlc.amount
        )?;

        // emit!(TokenTransferRefunded{
        //         htlcId: htlc.hashlock.clone()});
        Ok(true)
    }
    pub fn get_details(ctx: Context<GetDetails>, htlcId: String, htlc_bump: u8) -> Result<HTLC> {
        let htlc = &ctx.accounts.htlc;
        msg!(" hashlock: {:?}",  htlc.hashlock.clone());
        msg!(" tokenContract: {:?}",   htlc.tokenContract);
        Ok(HTLC {
            hashlock: htlc.hashlock.clone(),
            secret:htlc.secret.clone(),
            amount: htlc.amount,
            timelock: htlc.timelock,
            sender: htlc.sender,
            receiver: htlc.receiver,
            tokenContract: htlc.tokenContract,
            token_wallet: htlc.token_wallet,
            redeemed: htlc.redeemed,
            refunded: htlc.refunded
        })
    }
    // pub fn get_details(ctx: Context<GetDetails>, htlcId: String, htlc_bump: u8) -> Result<String> {
    //     let htlc = &ctx.accounts.htlc;
    //     Ok(htlc.secret.clone())
    // }

}

#[account]
#[derive(Default)]
pub struct HTLC{
    pub hashlock: String,
    pub secret: String,
    pub amount: u64,//TODO: check if this should be u256, though the spl uses u64
    pub timelock: u64,//TODO: check if this should be u256
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub tokenContract: Pubkey,
    pub token_wallet: Pubkey,
    pub redeemed: bool,
    pub refunded: bool,
}
#[derive(Accounts)]   
#[instruction(htlcId: String, htlc_bump: u8)]         
pub struct Create<'info > {
    #[account(
        init,
        payer = sender,
        //space = size_of::<HTLC>() + 8,
        space = 256,
        seeds = [
            htlcId.as_ref()
        ],
        bump,// = htlc_bump,
    )]
    pub htlc: Account<'info, HTLC>,
    #[account(
        init,
        payer = sender,
        seeds = [
            b"htlc_account".as_ref(),
            htlcId.as_ref()
        ],
        bump,
        token::mint=tokenContract,
        token::authority=htlc,
    )]
    pub htlc_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub sender: Signer<'info>,
    ///CHECK: The reciever
    pub receiver: UncheckedAccount<'info>,
    pub tokenContract: Account<'info, Mint>,

    #[account(
        mut,
        constraint=sender_token_account.owner == sender.key(),
        constraint=sender_token_account.mint == tokenContract.key()
    )]
    pub sender_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)] 
#[instruction(htlcId: String, htlc_bump: u8)]         
pub struct Redeem<'info > {
    #[account(
        mut,
        seeds = [
            htlcId.as_ref()
        ],
        bump,// = htlc_bump,
        has_one = sender,
        has_one = receiver,
        has_one = tokenContract,
        constraint = !htlc.redeemed @ HTLCError::AlreadyRedeemed,
        constraint = !htlc.refunded @ HTLCError::AlreadyRefunded,
        //constraint = htlc.receiver == *receiver_token_account.owner @ HTLCError::UnauthorizedAccess
    )]
    pub htlc: Account<'info, HTLC>,
    #[account(
        mut,
        seeds = [
            b"htlc_account".as_ref(),
            htlcId.as_ref()
        ],
        bump,
    )]
    pub htlc_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user_signing,
        associated_token::mint = tokenContract,
        associated_token::authority = receiver,
    )]
    pub receiver_token_account: Account<'info, TokenAccount>,

    ///CHECK: The sender
    #[account(mut)]
    sender: UncheckedAccount<'info>,                   
    #[account(mut)]
    user_signing: Signer<'info>,  
    ///CHECK: The reciever
    pub receiver: UncheckedAccount<'info>,                     
    tokenContract: Account<'info, Mint>,   

    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    associated_token_program: Program<'info, AssociatedToken>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)] 
#[instruction(htlcId: String, htlc_bump: u8)]  
pub struct Refund<'info > {
    #[account(mut,
    seeds = [
        //b"htlc",
        htlcId.as_ref()
    ],
    bump,
    has_one = sender,
    has_one = tokenContract,
    constraint = !htlc.refunded @ HTLCError::AlreadyRefunded,
    constraint = !htlc.redeemed @ HTLCError::AlreadyRedeemed,
    //constraint = Clock::get().unwrap().unix_timestamp >= htlc.timelock.try_into().unwrap() @ HTLCError::NotPastTimeLock,
    //constraint = htlc.sender == *sender_token_account.owner @ HTLCError::UnauthorizedAccess
    )]
    pub htlc: Account<'info,HTLC>,
    #[account(
        mut,
        seeds = [
            b"htlc_account".as_ref(),
            htlcId.as_ref()
        ],
        bump,
    )]
    pub htlc_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    user_signing: Signer<'info>,
    ///CHECK: The sender
    #[account(mut)]//TODO: check if this should be mutable
    sender: UncheckedAccount<'info>,                   
    tokenContract: Account<'info, Mint>,  

    #[account(
        mut,
        constraint=htlc.sender.key() == sender_token_account.owner,
        constraint=sender_token_account.mint == tokenContract.key())]
    pub sender_token_account: Account<'info, TokenAccount>,

    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,

}

#[derive(Accounts)]
#[instruction(htlcId: String, htlc_bump: u8)] 
pub struct GetDetails<'info> {
    #[account(
        seeds = [
            htlcId.as_ref()
        ],
        bump,// = htlc_bump,
    )]
    pub htlc: Account<'info, HTLC>,
}

#[event]
pub struct TokenTransferInitiated{
    #[index]
    hashlock: String,//Check the type
    amount: u64,//TODO: check if this should be u256
    chainId: u64,//TODO: check if this should be u256
    timelock: u64,//TODO: check if this should be u256
    #[index]
    sender: Pubkey,
    receiver: Pubkey,
    tokenContract: Pubkey,//TODO: check what type is token
    targetCurrencyReceiverAddress: String,
}

#[event]
pub struct TokenTransferClaimed{
    #[index]
    htlcId:String,//Check the type
}
#[event]
pub struct TokenTransferRefunded{
    #[index]
    htlcId:String,//Check the type
}
#[error_code]
pub enum HTLCError {
    #[msg("Not Future TimeLock.")]
    NotFutureTimeLock,
    #[msg("Not Past TimeLock.")]
    NotPastTimeLock,
    #[msg("HTLC Already Exists.")]
    HTLCAlreadyExists,
    #[msg("HTLC Does not Exist.")]
    HTLCNotExist,
    #[msg("Does Not Match the Hashlock.")]
    HashlockNoMatch,
    #[msg("Funds Are Alredy Redeemed.")]
    AlreadyRedeemed,
    #[msg("Funds Are Alredy Refunded.")]
    AlreadyRefunded,
    #[msg("Funds Can Not Be Zero.")]
    FundsNotSent,
    #[msg("Incorrect Data.")]
    IncorrectData,
    #[msg("Incorrect Number Of Secrets.")]
    IncorrectSecretsNumber,
    #[msg("Insufficient Balance.")]
    InsufficientBalance,
    #[msg("No Enough Allowence.")]
    NoAllowance,
    #[msg("Not The Rigth Reciever")]
    UnauthorizedAccess,
}
