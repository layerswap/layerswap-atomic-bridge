(define-trait messenger
  (
    (notify
      (uint               ;; id
      (buff 32)           ;; hashlock
      (string-ascii 256)  ;; dst-chain
      (string-ascii 256)  ;; dst-asset
      (string-ascii 256)  ;; dst-address
      (string-ascii 256)  ;; src-asset
      principal           ;; sender
      principal           ;; src-receiver
      uint                ;; amount
      uint)               ;; timelock
      (response bool uint) ;; Return type: response bool for success, uint for error
    )
  )
)

(define-public (notify
    (id uint)
    (hashlock (buff 32))
    (dst-chain (string-ascii 256))
    (dst-asset (string-ascii 256))
    (dst-address (string-ascii 256))
    (src-asset (string-ascii 256))
    (sender principal)
    (src-receiver principal)
    (amount uint)
    (timelock uint)
  )
  (begin
    (print {
      id: id,
      hashlock: hashlock,
      dst-chain: dst-chain,
      dst-asset: dst-asset,
      dst-address: dst-address,
      src-asset: src-asset,
      sender: sender,
      src-receiver: src-receiver,
      amount: amount,
      timelock: timelock
    })
    (ok true)
  )
)

