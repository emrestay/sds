'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'

const CONTRACT_ADDRESS = "0xDB4e0A5E7b0d03aA41cBB7940c5e9Bab06cc7157"
const CONTRACT_ABI = [
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "reverseLookup",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
]

export function CustomConnectButton() {
  const { address, isConnected } = useAccount()
  const [domain, setDomain] = useState<string | null>(null)

  useEffect(() => {
    async function resolveDomain() {
      if (!address) return

      try {
        const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network')
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
        const resolvedDomain = await contract.reverseLookup(address)
        
        if (resolvedDomain && resolvedDomain !== "") {
          setDomain(resolvedDomain)
        } else {
          setDomain(null)
        }
      } catch (error) {
        console.error('Error resolving domain:', error)
        setDomain(null)
      }
    }

    if (isConnected) {
      resolveDomain()
    } else {
      setDomain(null)
    }
  }, [address, isConnected])

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted

        if (!ready) {
          return null
        }

        if (!account) {
          return (
            <button
              onClick={openConnectModal}
              type="button"
              className="inline-flex items-center px-4 py-2 rounded-md bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium"
            >
              Connect Wallet
            </button>
          )
        }

        if (chain?.unsupported) {
          return (
            <button
              onClick={openChainModal}
              type="button"
              className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              Wrong network
            </button>
          )
        }

        return (
          <div className="flex items-center gap-3">
            <button
              onClick={openChainModal}
              type="button"
              className="inline-flex items-center px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium text-sm"
            >
              {chain?.hasIcon && chain?.iconUrl && (
                <div className="mr-2 relative w-5 h-5">
                  <img
                    alt={chain.name ?? 'Chain icon'}
                    src={chain.iconUrl}
                    className="w-5 h-5"
                  />
                </div>
              )}
              {chain?.name}
            </button>

            <button
              onClick={openAccountModal}
              type="button"
              className="inline-flex items-center px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium text-sm"
            >
              {domain ? `${domain}` : account.displayName}
            </button>
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
} 