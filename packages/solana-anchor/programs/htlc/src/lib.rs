use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{CloseAccount, Mint, Token, TokenAccount, Transfer}};
// use std::mem::size_of;
use sha2::{Sha256, Digest};
declare_id!("6ybRe38i56Qwf8sX3qLJBi292FriBz5nH9sHKodYTavb");

const OWNER: &str = "H732946dBhRx5pBbJnFJK7Gy4K6mSA5Svdt1eueExrTp";

/// @title Pre Hashed Timelock Contracts (PHTLCs) on Solana SPL tokens.
///
/// This contract provides a way to create and keep PHTLCs for SPL tokens.
///
/// Protocol:
///
///  1) createP(receiver, timelock, tokenContract, amount) - a
///      sender calls this to create a new PHTLC on a given token (tokenContract)
///      for a given amount. A u64 phtlcId is returned.
///  2) create(receiver, hashlock, timelock, tokenContract, amount) - a
///      sender calls this to create a new HTLC on a given token (tokenContract)
///      for a given amount. A String htlcId is returned.
///  3) convert(phtlcId, hashlock) - the messenger calls this function
///      to convert the PHTLC to HTLC with the given hashlock.
///  4) redeem(htlcId, secret) - once the receiver knows the secret of
///      the hashlock hash they can claim the tokens with this function
///  5) refund(htlcId) - after timelock has expired and if the receiver did not
///      redeem the tokens the sender / creator of the HTLC can get their tokens
///      back with this function.
///  6) refundp(phtlcId) - after timelock has expired and if the messenger did not
///      convert the PHTLC, then the sender can get their tokens
///      back with this function.



/// A small utility function that allows us to transfer funds out of the htlc.
///
/// # Arguments
///
/// * `sender` - Alice's account
/// * `htlc_id` - The index of the htlc
/// * `htlc` - the htlc public key (PDA)
/// * `htlc_bump` - the application state public key (PDA) bump
/// * `htlc_wallet` - The htlc Token account
/// * `token_program` - the token program address
/// * `destination_wallet` - The public key of the destination address (where to send funds)
/// * `amount` - the amount of token that is sent from `htlc_wallet` to `destination_wallet`
fn transfer_htlc_out<'info>(
    sender: AccountInfo<'info>,
    htlc_id: String,
    htlc: AccountInfo<'info>,
    htlc_bump: u8,
    htlc_wallet: &mut Account<'info, TokenAccount>,
    token_program: AccountInfo<'info>,
    destination_wallet: AccountInfo<'info>,
    amount: u64
) -> Result<()> {
    let bump_vector = htlc_bump.to_le_bytes();
    let inner = vec![
        htlc_id.as_ref(),
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
/// * `phtlc_id` - The index of the phtlc
/// * `phtlc` - the phtlc public key (PDA)
/// * `phtlc_bump` - the application state public key (PDA) bump
/// * `phtlc_wallet` - The phtlc Token account
/// * `token_program` - the token program address
/// * `destination_wallet` - The public key of the destination address (where to send funds)
/// * `amount` - the amount of token that is sent from `phtlc_wallet` to `destination_wallet`
fn transfer_phtlc_out<'info>(
    sender: AccountInfo<'info>,
    phtlc_id: u64,
    phtlc: AccountInfo<'info>,
    phtlc_bump: u8,
    phtlc_wallet: &mut Account<'info, TokenAccount>,
    token_program: AccountInfo<'info>,
    destination_wallet: AccountInfo<'info>,
    amount: u64
) -> Result<()> {
    let bump_vector = phtlc_bump.to_le_bytes();
    let phtlc_id_bytes = phtlc_id.to_le_bytes();
    let inner = vec![
        phtlc_id_bytes.as_ref(),
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
    /// funds and providing the reciever/receiver and terms.
    /// @param _receiver reciever/receiver of the funds.
    /// @param _timelock UNIX epoch seconds time that the lock expires at.
    ///                  Refunds can be made after this time.
    /// @return Id of the new PHTLC. This is needed for subsequent calls.
    pub fn createP(
        ctx: Context<CreateP>,
        phtlc_id: u64,
        chains: Vec<String>,
        assets: Vec<String>, 
        lp_path: Vec<String>,
        dst_chain: String,
        dst_asset: String,
        target_currency_receiver_address: String,
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
        let phtlc_id_bytes = phtlc_id.to_le_bytes();
        let bump_vector = phtlc_bump.to_le_bytes();
        let inner = vec![
            phtlc_id_bytes.as_ref(),
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

        phtlc.target_currency_receiver_address = target_currency_receiver_address.clone();
        phtlc.src_asset = src_asset.clone();
        phtlc.amount = amount;
        phtlc.timelock = timelock;
        phtlc.sender = *ctx.accounts.sender.to_account_info().key;
        phtlc.receiver =  *ctx.accounts.receiver.to_account_info().key;
        phtlc.token_contract = *ctx.accounts.token_contract.to_account_info().key;
        phtlc.token_wallet = *ctx.accounts.phtlc_token_account.to_account_info().key;
        phtlc.messenger = messenger;
        phtlc.refunded = false;
        phtlc.converted = false;

        emit!(TokenTransferPreInitiated{
            chains: chains,
            assets: assets,
            lp_path: lp_path,
            phtlc_id: phtlc_id,
            dst_chain: dst_chain,
            dst_asset: dst_asset,
            target_currency_receiver_address: target_currency_receiver_address,
            sender: *ctx.accounts.sender.to_account_info().key,
            src_asset: src_asset,
            receiver: *ctx.accounts.receiver.to_account_info().key,
            timelock: timelock,
            messenger: messenger,
            amount: amount,
            token_contract: *ctx.accounts.token_contract.to_account_info().key,
            
        });
        Ok(())
    }
    
    /// @dev Sender / Payer sets up a new hash time lock contract depositing the
    /// funds and providing the reciever and terms.
    /// @param _receiver receiver of the funds.
    /// @param _hashlock A sha-256 hash hashlock.
    /// @param _timelock UNIX epoch seconds time that the lock expires at.
    ///                  Refunds can be made after this time.
    /// @return Id of the new HTLC. This is needed for subsequent calls.
    pub fn create(
        ctx: Context<Create>,
        htlc_id: String,
        hashlock: String,
        _timelock: u64,
        _amount: u64,
        _chain: String,
        target_currency_receiver_address: String,
        _phtlc_id: u64,
        _messenger: Pubkey,
        htlc_bump: u8,
    ) -> Result<()> {
        //TODO: The unix timestamp is i64 instead of u64
        let clock = Clock::get().unwrap();
        require!(_timelock > clock.unix_timestamp.try_into().unwrap(), HTLCError::NotFutureTimeLock);
        require!(_amount != 0, HTLCError::FundsNotSent);
        //TODO: check if this needs to be added
        //assert(!self.hasContract(contractId), Errors::ContractAlreadyExist);
        let htlc = &mut ctx.accounts.htlc;

        let bump_vector = htlc_bump.to_le_bytes();
        let inner = vec![
            htlc_id.as_ref(),
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
        htlc.token_contract = *ctx.accounts.token_contract.to_account_info().key;
        htlc.token_wallet = *ctx.accounts.htlc_token_account.to_account_info().key;
        htlc.redeemed = false;
        htlc.refunded = false;

        emit!(TokenTransferInitiated{
            hashlock: hashlock,
            amount: _amount,
            chain: _chain,
            timelock: _timelock,
            sender: *ctx.accounts.sender.to_account_info().key,
            receiver: *ctx.accounts.receiver.to_account_info().key,
            token_contract:  *ctx.accounts.token_contract.to_account_info().key,
            target_currency_receiver_address: target_currency_receiver_address,
            phtlc_id: _phtlc_id,
        });
        if _messenger != Pubkey::default(){

        }
        Ok(())
    }

    /// @dev Called by the messenger to convert the PHTLC to HTLC
    ///
    /// @param phtlcId of the PHTLC to convert.
    /// @param hashlock of the HTLC to be converted.
    pub fn convert(
        ctx: Context<Convert>,
        phtlc_id: u64,
        htlc_id: String,
        hashlock: String,
        phtlc_bump: u8,
    ) -> Result<()> {
        let phtlc = &mut ctx.accounts.phtlc;

        phtlc.converted = true;
        let amount = phtlc.amount;
        transfer_phtlc_out(
            ctx.accounts.user_signing.to_account_info(),
            phtlc_id,
            phtlc.to_account_info(),
            phtlc_bump,
            &mut ctx.accounts.phtlc_token_account,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.htlc_token_account.to_account_info(),
            amount,//ctx.accounts.phtlc.amount
        )?;
        
        let htlc = &mut ctx.accounts.htlc;

        htlc.hashlock = hashlock.clone();
        htlc.secret = String::new();
        htlc.amount = amount;
        htlc.timelock = phtlc.timelock;
        htlc.sender = phtlc.sender;
        htlc.receiver =  phtlc.receiver;
        htlc.token_contract = *ctx.accounts.token_contract.to_account_info().key;
        htlc.token_wallet = *ctx.accounts.htlc_token_account.to_account_info().key;
        htlc.redeemed = false;
        htlc.refunded = false;

        emit!(TokenTransferInitiated{
            hashlock: hashlock,
            amount: amount,
            chain: "23".to_string(),//TODO
            timelock: phtlc.timelock,
            sender: phtlc.sender,
            receiver: phtlc.receiver ,
            token_contract:  *ctx.accounts.token_contract.to_account_info().key,
            target_currency_receiver_address: phtlc.target_currency_receiver_address.clone(),
            phtlc_id: phtlc_id,
        });

        Ok(())
    }

    /// @dev Called by the receiver once they know the secret of the hashlock.
    /// This will transfer the locked funds to the HTLC's receiver's address.
    ///
    /// @param htlcId of the HTLC.
    /// @param _secret sha256(_secret) should equal the contract hashlock.
    pub fn redeem(ctx: Context<Redeem>, htlc_id: String, _secret: String, htlc_bump: u8) -> Result<bool>{
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
            htlc_id.clone(),
            // htlc.hashlock.clone(),
            htlc.to_account_info(),
            htlc_bump,
            &mut ctx.accounts.htlc_token_account,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.receiver_token_account.to_account_info(),
            ctx.accounts.htlc.amount
        )?;

        emit!(TokenTransferClaimed{
            htlc_id: htlc_id.clone(),
            redeem_address: ctx.accounts.user_signing.key(),
        });
        Ok(true)
    }

    /// @dev Called by the sender if there was no redeem OR convert AND the time lock has
    /// expired. This will refund the contract amount.
    ///
    /// @param _phtlcId of the PHTLC to refund from.
    /// @return bool true on success
    pub fn refundP(ctx: Context<RefundP>, phtlc_id: u64, phtlc_bump: u8) -> Result<bool> {
        let phtlc = &mut ctx.accounts.phtlc;

        phtlc.refunded = true;

        transfer_phtlc_out(
            ctx.accounts.sender.to_account_info(),
            phtlc_id,
            phtlc.to_account_info(),
            phtlc_bump,
            &mut ctx.accounts.phtlc_token_account,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.sender_token_account.to_account_info(),
            ctx.accounts.phtlc.amount
        )?;

        emit!(TokenTransferRefunded{
            htlc_id: phtlc_id.to_string()});
        Ok(true)
    }

    /// @dev Called by the sender if there was no redeem AND the time lock has
    /// expired. This will refund the contract amount.
    ///
    /// @param _htlcId of the HTLC to refund from.
    pub fn refund(ctx: Context<Refund>, htlc_id: String, htlc_bump: u8) -> Result<bool> {
        let htlc = &mut ctx.accounts.htlc;

        htlc.refunded = true;

        transfer_htlc_out(
            ctx.accounts.sender.to_account_info(),
            htlc_id.clone(),
            // htlc.hashlock.clone(),
            htlc.to_account_info(),
            htlc_bump,
            &mut ctx.accounts.htlc_token_account,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.sender_token_account.to_account_info(),
            ctx.accounts.htlc.amount
        )?;

        emit!(TokenTransferRefunded{
                htlc_id: htlc_id.clone()});
        Ok(true)
    }

    /// @dev Get PHTLC details.
    /// @param phtlcId of the PHTLC.
    pub fn get_pdetails(ctx: Context<GetPDetails>, phtlc_id: u64, phtlc_bump: u8) -> Result<PHTLC> {
        let phtlc = &ctx.accounts.phtlc;
        Ok(PHTLC {
            target_currency_receiver_address: phtlc.target_currency_receiver_address.clone(),
            src_asset: phtlc.src_asset.clone(),
            sender: phtlc.sender,
            receiver: phtlc.receiver,
            token_contract: phtlc.token_contract,
            amount: phtlc.amount,
            timelock: phtlc.timelock,
            messenger: phtlc.messenger,
            token_wallet: phtlc.token_wallet,
            refunded: phtlc.refunded,
            converted: phtlc.converted,
        })
    }

    /// @dev Get HTLC details.
    /// @param htlcId of the HTLC.
    // pub fn get_details(ctx: Context<GetDetails>, htlc_id: String, htlc_bump: u8) -> Result<HTLC> {
    //     let htlc = &ctx.accounts.htlc;
    //     Ok(HTLC {
    //         hashlock: htlc.hashlock.clone(),
    //         secret:htlc.secret.clone(),
    //         amount: htlc.amount,
    //         timelock: htlc.timelock,
    //         sender: htlc.sender,
    //         receiver: htlc.receiver,
    //         token_contract: htlc.token_contract,
    //         token_wallet: htlc.token_wallet,
    //         redeemed: htlc.redeemed,
    //         refunded: htlc.refunded
    //     })
    // }
    pub fn get_details(ctx: Context<GetDetails>, htlc_id: String, htlc_bump: u8) -> Result<String> {
        let htlc = &ctx.accounts.htlc;
        Ok(htlc.secret.clone())
    }

}

#[account]
#[derive(Default)]
pub struct PHTLC{
    pub target_currency_receiver_address: String,
    pub src_asset: String,
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub token_contract: Pubkey,
    pub amount: u64,//TODO: check if this should be u256, though the spl uses u64
    pub timelock: u64,//TODO: check if this should be u256
    pub messenger: Pubkey,
    pub token_wallet: Pubkey,
    pub refunded: bool,
    pub converted: bool,
}

#[account]
#[derive(InitSpace)]
pub struct Counter {
    pub count: u64,// 8 bytes
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
    pub token_contract: Pubkey,
    pub token_wallet: Pubkey,
    pub redeemed: bool,
    pub refunded: bool,
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
#[instruction(phtlc_id: u64, phtlc_bump: u8)]         
pub struct CreateP<'info > {
    #[account(
        init,
        payer = sender,
        space = 256,
        seeds = [
            phtlc_id.to_le_bytes().as_ref()
        ],
        bump,
    )]
    pub phtlc: Account<'info, PHTLC>,
    #[account(
        init,
        payer = sender,
        seeds = [
            b"phtlc_account".as_ref(),
            phtlc_id.to_le_bytes().as_ref()
        ],
        bump,
        token::mint=token_contract,
        token::authority=phtlc,
    )]
    pub phtlc_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub sender: Signer<'info>,
    ///CHECK: The reciever
    pub receiver: UncheckedAccount<'info>,
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
#[instruction(htlc_id: String, htlc_bump: u8)]         
pub struct Create<'info > {
    #[account(
        init,
        payer = sender,
        //space = size_of::<HTLC>() + 8,
        space = 256,
        seeds = [
            htlc_id.as_ref()
        ],
        bump,// = htlc_bump,
    )]
    pub htlc: Account<'info, HTLC>,
    #[account(
        init,
        payer = sender,
        seeds = [
            b"htlc_account".as_ref(),
            htlc_id.as_ref()
        ],
        bump,
        token::mint=token_contract,
        token::authority=htlc,
    )]
    pub htlc_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub sender: Signer<'info>,
    ///CHECK: The reciever
    pub receiver: UncheckedAccount<'info>,
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
#[instruction(htlc_id: String, htlc_bump: u8)]         
pub struct Redeem<'info > {
    #[account(
        mut,
        seeds = [
            htlc_id.as_ref()
        ],
        bump,// = htlc_bump,
        has_one = sender @HTLCError::NotSender,
        has_one = receiver @HTLCError::NotReciever,
        has_one = token_contract @HTLCError::NoToken,
        constraint = !htlc.redeemed @ HTLCError::AlreadyRedeemed,
        constraint = !htlc.refunded @ HTLCError::AlreadyRefunded,
        //constraint = htlc.receiver == *receiver_token_account.owner @ HTLCError::UnauthorizedAccess
    )]
    pub htlc: Account<'info, HTLC>,
    #[account(
        mut,
        seeds = [
            b"htlc_account".as_ref(),
            htlc_id.as_ref()
        ],
        bump,
    )]
    pub htlc_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user_signing,
        associated_token::mint = token_contract,
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
    token_contract: Account<'info, Mint>,   

    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    associated_token_program: Program<'info, AssociatedToken>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)] 
#[instruction(phtlc_id: u64, phtlc_bump: u8)]  
pub struct RefundP<'info > {
    #[account(mut,
    seeds = [
        phtlc_id.to_le_bytes().as_ref()
    ],
    bump = phtlc_bump,
    has_one = sender @HTLCError::NotSender,
    has_one = token_contract @HTLCError::NoToken,
    constraint = !phtlc.refunded @ HTLCError::AlreadyRefunded,
    constraint = !phtlc.converted @ HTLCError::AlreadyConverted,
    constraint = Clock::get().unwrap().unix_timestamp >= phtlc.timelock.try_into().unwrap() @ HTLCError::NotPastTimeLock,
    //constraint = htlc.sender == *sender_token_account.owner @ HTLCError::UnauthorizedAccess
    )]
    pub phtlc: Account<'info,PHTLC>,
    #[account(
        mut,
        seeds = [
            b"phtlc_account".as_ref(),
            phtlc_id.to_le_bytes().as_ref()
        ],
        bump,
    )]
    pub phtlc_token_account: Account<'info, TokenAccount>,

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
#[instruction(htlc_id: String, htlc_bump: u8)]  
pub struct Refund<'info > {
    #[account(mut,
    seeds = [
        //b"htlc",
        htlc_id.as_ref()
    ],
    bump = htlc_bump,
    has_one = sender @HTLCError::NotSender,
    has_one = token_contract @HTLCError::NoToken,
    constraint = !htlc.refunded @ HTLCError::AlreadyRefunded,
    constraint = !htlc.redeemed @ HTLCError::AlreadyRedeemed,
    constraint = Clock::get().unwrap().unix_timestamp >= htlc.timelock.try_into().unwrap() @ HTLCError::NotPastTimeLock,
    //constraint = htlc.sender == *sender_token_account.owner @ HTLCError::UnauthorizedAccess
    )]
    pub htlc: Account<'info,HTLC>,
    #[account(
        mut,
        seeds = [
            b"htlc_account".as_ref(),
            htlc_id.as_ref()
        ],
        bump,
    )]
    pub htlc_token_account: Account<'info, TokenAccount>,

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
#[instruction(phtlc_id: u64, htlc_id: String, phtlc_bump: u8)]  
pub struct Convert<'info > {
    #[account(mut,
    seeds = [
        phtlc_id.to_le_bytes().as_ref()
    ],
    bump,
    has_one = token_contract @HTLCError::NoToken,
    constraint = !phtlc.refunded @ HTLCError::AlreadyRefunded,
    constraint = !phtlc.converted @ HTLCError::AlreadyConverted,
    constraint = phtlc.sender == user_signing.key() || phtlc.messenger == user_signing.key() @ HTLCError::UnauthorizedAccess,
    )]
    pub phtlc: Account<'info,PHTLC>,
    #[account(
    init,
    payer = user_signing,
    //space = size_of::<HTLC>() + 8,
    space = 256,
    seeds = [
        htlc_id.as_ref()
    ],
    bump,
    )]
    pub htlc: Account<'info, HTLC>,
    #[account(
        mut,
        seeds = [
            b"phtlc_account".as_ref(),
            phtlc_id.to_le_bytes().as_ref()
        ],
        bump,
    )]
    pub phtlc_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
    init,
    payer = user_signing,
    seeds = [
        b"htlc_account".as_ref(),
        htlc_id.as_ref()
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
#[instruction(phtlc_id: u64, phtlc_bump: u8)] 
pub struct GetPDetails<'info> {
    #[account(
        seeds = [
            phtlc_id.to_le_bytes().as_ref()
        ],
        bump,// = htlc_bump,
    )]
    pub phtlc: Account<'info, PHTLC>,
}

#[derive(Accounts)]
#[instruction(htlc_id: String, htlc_bump: u8)] 
pub struct GetDetails<'info> {
    #[account(
        seeds = [
            htlc_id.as_ref()
        ],
        bump,// = htlc_bump,
    )]
    pub htlc: Account<'info, HTLC>,
}

#[event]
pub struct TokenTransferPreInitiated{
    pub chains: Vec<String>,
    pub assets: Vec<String>,
    pub lp_path: Vec<String>,
    pub phtlc_id: u64,
    pub dst_chain: String,
    pub dst_asset: String,
    pub target_currency_receiver_address: String,
    pub sender: Pubkey,
    pub src_asset: String,
    pub receiver: Pubkey,
    pub timelock: u64,
    pub messenger: Pubkey,
    pub amount: u64,
    pub token_contract: Pubkey,
}

#[event]
pub struct TokenTransferInitiated{
    #[index]
    hashlock: String,//Check the type
    amount: u64,//TODO: check if this should be u256
    chain: String,
    timelock: u64,//TODO: check if this should be u256
    #[index]
    sender: Pubkey,
    receiver: Pubkey,
    token_contract: Pubkey,//TODO: check what type is token
    target_currency_receiver_address: String,
    phtlc_id: u64,
}

#[event]
pub struct TokenTransferClaimed{
    #[index]
    htlc_id: String,//Check the type
    redeem_address: Pubkey,
}
#[event]
pub struct TokenTransferRefunded{
    #[index]
    htlc_id:String,//Check the type
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
    #[msg("Already Converted")]
    AlreadyConverted,
    #[msg("Funds Can Not Be Zero.")]
    FundsNotSent,
    #[msg("Unauthorized Access")]
    UnauthorizedAccess,
    #[msg("Not The Owner")]
    NotOwner,
    #[msg("Not The Sender")]
    NotSender,
    #[msg("Not The Reciever")]
    NotReciever,
    #[msg("Wrong Token")]
    NoToken,
}
