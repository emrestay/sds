"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Droplet, Loader2, Info, AlertTriangle } from "lucide-react"
import { useAccount } from 'wagmi'
import { CustomConnectButton } from '@/components/custom-connect-button'

const FAUCET_ADDRESS = "0x6fC307D6df17eAf09cF6852b775E037E0496b53A"
const FAUCET_ABI = [
  "function claim() external",
  "function lastClaimTime(address) view returns (uint256)",
  "function isDomainHolder(address) view returns (bool)",
]

export default function FaucetPage() {
  const { address, isConnected } = useAccount()
  const [status, setStatus] = useState<string>("Connect your wallet to check claim eligibility")
  const [statusType, setStatusType] = useState<"success" | "error" | "info" | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [timeRemaining, setTimeRemaining] = useState<string>("")

  useEffect(() => {
    if (isConnected && address) {
      checkClaim()
    }
  }, [isConnected, address])

  const checkClaim = async () => {
    if (!address) return

    try {
      setIsLoading(true)
      setStatus("Checking claim eligibility...")
      setStatusType("info")

      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, provider)
      
      const [lastClaim, isHolder] = await Promise.all([
        contract.lastClaimTime(address),
        contract.isDomainHolder(address)
      ])

      const lastClaimTime = Number(lastClaim) * 1000 // Convert to milliseconds
      const timeSinceLastClaim = Date.now() - lastClaimTime
      const sevenDaysInMs = 6 * 60 * 60 * 1000 // 6 hours in milliseconds
      const timeLeft = sevenDaysInMs - timeSinceLastClaim

      if (!isHolder) {
        setStatus("❌ You must own a .som domain to use the faucet")
        setStatusType("error")
        return
      }

      if (timeLeft > 0) {
        const hours = Math.floor(timeLeft / (60 * 60 * 1000))
        const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000))
        setTimeRemaining(`${hours}h ${minutes}m`)
        setStatus("❌ You must wait before claiming again")
        setStatusType("error")
      } else {
        setTimeRemaining("6h 0m")
        setStatus("✅ You can claim 0.2 STT now!")
        setStatusType("success")
      }
    } catch (error) {
      console.error("Error checking claim:", error)
      setStatus("Failed to check claim eligibility")
      setStatusType("error")
    } finally {
      setIsLoading(false)
    }
  }

  const claim = async () => {
    if (!address) return

    try {
      setIsLoading(true)
      setStatus("Claiming 0.2 STT...")
      setStatusType("info")

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, signer)
      
      const tx = await contract.claim()
      await tx.wait()
      
      setStatus("✅ Successfully claimed 0.2 STT!")
      setStatusType("success")
      setTimeRemaining("6h 0m")
    } catch (error) {
      console.error("Error claiming tokens:", error)
      setStatus("Failed to claim tokens")
      setStatusType("error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 relative">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-md mx-auto">
          <Card className="border-2 border-purple-100 dark:border-gray-700 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <Droplet className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                Somnia Faucet
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Claim 0.2 STT tokens once every 6 hours
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {!isConnected ? (
                <div className="space-y-4 flex flex-col items-center justify-center py-6">
                  <p className="text-gray-500 dark:text-gray-400 text-center">
                    Connect your wallet to use the faucet
                  </p>
                  <CustomConnectButton />
                </div>
              ) : (
                <>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Connected: {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={claim}
                      disabled={isLoading || statusType !== "success"}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Claiming...
                        </>
                      ) : (
                        "Claim 0.2 STT"
                      )}
                    </Button>
                  </div>

                  {timeRemaining && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-800 dark:text-yellow-300 text-sm">
                      <p className="flex items-center">
                        <Info className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>Time remaining: {timeRemaining}</span>
                      </p>
                    </div>
                  )}

                  {status && (
                    <Alert
                      className={`${
                        statusType === "success"
                          ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                          : statusType === "error"
                            ? "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                            : "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                      }`}
                    >
                      <AlertDescription>{status}</AlertDescription>
                    </Alert>
                  )}

                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-800 dark:text-blue-300 text-sm">
                    <p className="flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>Only .som domain holders can use the faucet</span>
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
} 