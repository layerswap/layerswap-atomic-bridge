# TACT Compilation Report
Contract: LayerswapV8Jetton
BOC Size: 3683 bytes

# Types
Total Types: 19

## StateInit
TLB: `_ code:^cell data:^cell = StateInit`
Signature: `StateInit{code:^cell,data:^cell}`

## Context
TLB: `_ bounced:bool sender:address value:int257 raw:^slice = Context`
Signature: `Context{bounced:bool,sender:address,value:int257,raw:^slice}`

## SendParameters
TLB: `_ bounce:bool to:address value:int257 mode:int257 body:Maybe ^cell code:Maybe ^cell data:Maybe ^cell = SendParameters`
Signature: `SendParameters{bounce:bool,to:address,value:int257,mode:int257,body:Maybe ^cell,code:Maybe ^cell,data:Maybe ^cell}`

## Deploy
TLB: `deploy#946a98b6 queryId:uint64 = Deploy`
Signature: `Deploy{queryId:uint64}`

## DeployOk
TLB: `deploy_ok#aff90f57 queryId:uint64 = DeployOk`
Signature: `DeployOk{queryId:uint64}`

## FactoryDeploy
TLB: `factory_deploy#6d0ff13b queryId:uint64 cashback:address = FactoryDeploy`
Signature: `FactoryDeploy{queryId:uint64,cashback:address}`

## TokenTransfer
TLB: `token_transfer#0f8a7ea5 queryId:uint64 amount:coins destination:address response_destination:address custom_payload:Maybe ^cell forward_ton_amount:coins forward_payload:remainder<slice> = TokenTransfer`
Signature: `TokenTransfer{queryId:uint64,amount:coins,destination:address,response_destination:address,custom_payload:Maybe ^cell,forward_ton_amount:coins,forward_payload:remainder<slice>}`

## TokenNotification
TLB: `token_notification#7362d09c queryId:uint64 amount:coins from:address forward_payload:remainder<slice> = TokenNotification`
Signature: `TokenNotification{queryId:uint64,amount:coins,from:address,forward_payload:remainder<slice>}`

## TokenExcesses
TLB: `token_excesses#d53276db queryId:uint64 = TokenExcesses`
Signature: `TokenExcesses{queryId:uint64}`

## HTLC
TLB: `_ dstAddress:^string dstChain:^string dstAsset:^string srcAsset:^string sender:address senderPubKey:int257 srcReceiver:address secret:int257 hashlock:int257 amount:int257 timelock:int257 redeemed:bool refunded:bool jettonMasterAddress:address htlcJettonWalletAddress:address = HTLC`
Signature: `HTLC{dstAddress:^string,dstChain:^string,dstAsset:^string,srcAsset:^string,sender:address,senderPubKey:int257,srcReceiver:address,secret:int257,hashlock:int257,amount:int257,timelock:int257,redeemed:bool,refunded:bool,jettonMasterAddress:address,htlcJettonWalletAddress:address}`

## CommitData
TLB: `_ dstChain:^string dstAsset:^string dstAddress:^string srcAsset:^string srcReceiver:address timelock:int257 jettonMasterAddress:address htlcJettonWalletAddress:address senderPubKey:int257 hopChains:dict<int, ^StringImpl{data:^string}> hopAssets:dict<int, ^StringImpl{data:^string}> hopAddresses:dict<int, ^StringImpl{data:^string}> = CommitData`
Signature: `CommitData{dstChain:^string,dstAsset:^string,dstAddress:^string,srcAsset:^string,srcReceiver:address,timelock:int257,jettonMasterAddress:address,htlcJettonWalletAddress:address,senderPubKey:int257,hopChains:dict<int, ^StringImpl{data:^string}>,hopAssets:dict<int, ^StringImpl{data:^string}>,hopAddresses:dict<int, ^StringImpl{data:^string}>}`

## LockData
TLB: `_ Id:int257 timelock:int257 srcReceiver:address srcAsset:^string dstChain:^string dstAddress:^string dstAsset:^string hashlock:int257 jettonMasterAddress:address htlcJettonWalletAddress:address = LockData`
Signature: `LockData{Id:int257,timelock:int257,srcReceiver:address,srcAsset:^string,dstChain:^string,dstAddress:^string,dstAsset:^string,hashlock:int257,jettonMasterAddress:address,htlcJettonWalletAddress:address}`

## AddLock
TLB: `add_lock#5cdd41d9 Id:int257 hashlock:int257 timelock:int257 = AddLock`
Signature: `AddLock{Id:int257,hashlock:int257,timelock:int257}`

## Redeem
TLB: `redeem#758db085 Id:int257 secret:int257 = Redeem`
Signature: `Redeem{Id:int257,secret:int257}`

## Refund
TLB: `refund#ad821ef9 Id:int257 = Refund`
Signature: `Refund{Id:int257}`

## AddLockSig
TLB: `add_lock_sig#c1d818ff data:^slice signature:^slice = AddLockSig`
Signature: `AddLockSig{data:^slice,signature:^slice}`

## TokenCommitted
TLB: `token_committed#bf3d24d1 Id:int257 dstChain:^string dstAddress:^string dstAsset:^string sender:address srcReceiver:address srcAsset:^string amount:int257 timelock:int257 jettonMasterAddress:address htlcJettonWalletAddress:address senderPubKey:int257 hopChains:dict<int, ^StringImpl{data:^string}> hopAssets:dict<int, ^StringImpl{data:^string}> hopAddresses:dict<int, ^StringImpl{data:^string}> = TokenCommitted`
Signature: `TokenCommitted{Id:int257,dstChain:^string,dstAddress:^string,dstAsset:^string,sender:address,srcReceiver:address,srcAsset:^string,amount:int257,timelock:int257,jettonMasterAddress:address,htlcJettonWalletAddress:address,senderPubKey:int257,hopChains:dict<int, ^StringImpl{data:^string}>,hopAssets:dict<int, ^StringImpl{data:^string}>,hopAddresses:dict<int, ^StringImpl{data:^string}>}`

## TokenLocked
TLB: `token_locked#0f47e1b8 Id:int257 dstChain:^string dstAddress:^string dstAsset:^string sender:address srcReceiver:address srcAsset:^string amount:int257 timelock:int257 hashlock:int257 jettonMasterAddress:address htlcJettonWalletAddress:address = TokenLocked`
Signature: `TokenLocked{Id:int257,dstChain:^string,dstAddress:^string,dstAsset:^string,sender:address,srcReceiver:address,srcAsset:^string,amount:int257,timelock:int257,hashlock:int257,jettonMasterAddress:address,htlcJettonWalletAddress:address}`

## StringImpl
TLB: `_ data:^string = StringImpl`
Signature: `StringImpl{data:^string}`

# Get Methods
Total Get Methods: 3

## getDetails
Argument: Id

## getContractsLength

## getContracts
Argument: senderAddr

# Error Codes
2: Stack underflow
3: Stack overflow
4: Integer overflow
5: Integer out of expected range
6: Invalid opcode
7: Type check error
8: Cell overflow
9: Cell underflow
10: Dictionary error
13: Out of gas error
32: Method ID not found
34: Action is invalid or not supported
37: Not enough TON
38: Not enough extra-currencies
128: Null reference exception
129: Invalid serialization prefix
130: Invalid incoming message
131: Constraints error
132: Access denied
133: Contract stopped
134: Invalid argument
135: Code of a contract was not found
136: Invalid address
137: Masterchain support is not enabled for this contract
4670: Funds Not Sent
8650: Hashlock Already Set
11493: Contract Already Exists
21683: Not Future Timelock
24064: HTLC Already Exists
31687: No Allowance
38239: Not Passed Timelock
46887: Already Redeemed
48401: Invalid signature
49162: Already Refunded
50918: Hashlock Not Match
58417: Contract Does Not Exist

# Trait Inheritance Diagram

```mermaid
graph TD
LayerswapV8Jetton
LayerswapV8Jetton --> BaseTrait
LayerswapV8Jetton --> Deployable
Deployable --> BaseTrait
```

# Contract Dependency Diagram

```mermaid
graph TD
LayerswapV8Jetton
```