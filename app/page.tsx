"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Search,
  Check,
  X,
  Loader2,
  ExternalLink,
  Info,
  AlertTriangle,
  Twitter,
  BookOpen,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CustomConnectButton } from '@/components/custom-connect-button'
import { useAccount } from 'wagmi'

const CONTRACT_ADDRESS = "0xDB4e0A5E7b0d03aA41cBB7940c5e9Bab06cc7157"

const CONTRACT_ABI = [
  {
    inputs: [{ internalType: "string", name: "name", type: "string" }],
    name: "claimName",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "name", type: "string" }],
    name: "isAvailable",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "name", type: "string" }],
    name: "resolveName",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "reverseLookup",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
]

// Registration fee in STT
const REGISTRATION_FEE = "1.0"

declare global {
  interface Window {
    ethereum?: any
  }
}

export default function Home() {
  const { address, isConnected } = useAccount()
  const [userDomain, setUserDomain] = useState<string | null>(null)
  const [name, setName] = useState<string>("")
  const [status, setStatus] = useState<string>("")
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isChecking, setIsChecking] = useState<boolean>(false)
  const [isClaiming, setIsClaiming] = useState<boolean>(false)
  const [statusType, setStatusType] = useState<"success" | "error" | "info" | null>(null)
  const [activeTab, setActiveTab] = useState<"register" | "resolve" | "reverse">("register")
  const [resolveQuery, setResolveQuery] = useState<string>("")
  const [resolvedAddress, setResolvedAddress] = useState<string>("")
  const [reverseQuery, setReverseQuery] = useState<string>("")
  const [reverseName, setReverseName] = useState<string>("")
  const [isResolving, setIsResolving] = useState<boolean>(false)
  const [isReversing, setIsReversing] = useState<boolean>(false)
  const [isCheckingUserDomain, setIsCheckingUserDomain] = useState<boolean>(false)
  const [showWarningDialog, setShowWarningDialog] = useState<boolean>(false)
  const [showSuccessShare, setShowSuccessShare] = useState<boolean>(false)
  const [claimedDomain, setClaimedDomain] = useState<string>("")

  useEffect(() => {
    if (!name) {
      setIsAvailable(null)
      return
    }

    const timer = setTimeout(() => {
      checkAvailability(name)
    }, 500)

    return () => clearTimeout(timer)
  }, [name])

  // Check if user has a domain when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      checkUserDomain(address)
    } else {
      setUserDomain(null)
    }
  }, [isConnected, address])

  const checkUserDomain = async (address: string): Promise<void> => {
    try {
      setIsCheckingUserDomain(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
      const name = await contract.reverseLookup(address)

      if (name && name !== "") {
        setUserDomain(name)
      } else {
        setUserDomain(null)
      }
    } catch (err: any) {
      console.error("Failed to check user domain:", err)
      setUserDomain(null)
    } finally {
      setIsCheckingUserDomain(false)
    }
  }

  const checkAvailability = async (name: string): Promise<void> => {
    if (!name) return

    try {
      setIsChecking(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
      const available: boolean = await contract.isAvailable(name)
      setIsAvailable(available)
    } catch (err: any) {
      console.error(err)
      setStatus("Availability check failed: " + (err.message || "Unknown error"))
      setStatusType("error")
    } finally {
      setIsChecking(false)
    }
  }

  const handleClaimButtonClick = (): void => {
    setShowWarningDialog(true)
  }

  const claimName = async (): Promise<void> => {
    if (!isConnected || !name || !address) return

    try {
      setIsClaiming(true)
      setStatus(`Sending transaction with ${REGISTRATION_FEE} STT fee...`)
      setStatusType("info")

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)

      // Check balance before sending transaction
      const balance = await provider.getBalance(address)
      const requiredAmount = ethers.parseEther(REGISTRATION_FEE)

      if (balance < requiredAmount) {
        throw new Error(`Insufficient balance. You need at least ${REGISTRATION_FEE} STT to register a domain.`)
      }

      // Send transaction with 1 STT fee
      const tx = await contract.claimName(name, {
        value: ethers.parseEther(REGISTRATION_FEE),
      })

      setStatus(`Transaction confirming... (TX: ${tx.hash.substring(0, 10)}...)`)

      await tx.wait()

      // Update user domain after successful registration
      setUserDomain(name)
      setClaimedDomain(name) // Save the claimed domain for sharing
      setStatus(`✅ ${name}.som successfully claimed!`)
      setStatusType("success")
      setIsAvailable(false)
      setShowSuccessShare(true) // Show share section
      setName("") // Clear the input field after successful registration
    } catch (err: any) {
      console.error(err)

      // Check for specific error messages
      if (err.message && err.message.includes("insufficient funds")) {
        setStatus(`❌ Insufficient balance. You need at least ${REGISTRATION_FEE} STT to register a domain.`)
      } else if (err.reason && err.reason.includes("require(false)")) {
        setStatus("❌ Transaction failed: Insufficient balance or contract error.")
      } else {
        setStatus("❌ Transaction failed: " + (err.reason || err.message || "Unknown error"))
      }

      setStatusType("error")
    } finally {
      setIsClaiming(false)
    }
  }

  const handleResolveName = async (): Promise<void> => {
    if (!resolveQuery) return

    try {
      setIsResolving(true)
      setStatus("Resolving name...")
      setStatusType("info")

      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
      const addr = await contract.resolveName(resolveQuery)

      // If address is zero address (0x0000...0000) then domain not found
      if (addr === "0x0000000000000000000000000000000000000000") {
        setResolvedAddress("")
        setStatus(`❌ ${resolveQuery}.som not found!`)
        setStatusType("error")
      } else {
        setResolvedAddress(addr)
        setStatus(`✅ ${resolveQuery}.som address found!`)
        setStatusType("success")
      }
    } catch (err: any) {
      console.error(err)
      setResolvedAddress("")
      setStatus("❌ Name resolution failed: " + (err.reason || err.message || "Unknown error"))
      setStatusType("error")
    } finally {
      setIsResolving(false)
    }
  }

  const handleReverseLookup = async (): Promise<void> => {
    if (!reverseQuery) return

    try {
      setIsReversing(true)
      setStatus("Looking up address...")
      setStatusType("info")

      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
      const name = await contract.reverseLookup(reverseQuery)

      // If empty string returned then domain not found
      if (!name || name === "") {
        setReverseName("")
        setStatus(`❌ No name found for this address!`)
        setStatusType("error")
      } else {
        setReverseName(name)
        setStatus(`✅ Name found for address!`)
        setStatusType("success")
      }
    } catch (err: any) {
      console.error(err)
      setReverseName("")
      setStatus("❌ Address lookup failed: " + (err.reason || err.message || "Unknown error"))
      setStatusType("error")
    } finally {
      setIsReversing(false)
    }
  }

  const truncateAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  const getTwitterShareUrl = (domain: string) => {
    const tweetText = `I just claimed my "${domain}.som" domain via @somnia_domains! \n\n@Somnia_Network @SomniaEco \n\nClaim yours now 👉 https://somnia.domains/`
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 relative">
      <div className="container mx-auto px-4 py-6">
        {/* Header with logo on left and wallet/theme on right */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex flex-col">
            <div className="flex items-center">
              <div className="relative w-12 h-12 mr-3">
                <Image
                  src="/images/somnia-logo.png"
                  alt="Somnia Domain Services Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
                Somnia Domain Services
              </h2>
            </div>
            <div className="flex">
              <div className="w-12 mr-3"></div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 font-light tracking-wide">
                <span className="text-purple-600 dark:text-purple-400">Your Identity.</span>
                <span className="text-blue-600 dark:text-blue-400"> Onchain.</span>
                <span className="text-pink-600 dark:text-pink-400"> Forever.</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
          <a
              href="https://x.com/somnia_domains/status/1924615163396948442"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Need $STT?
            </a>
            <CustomConnectButton />
            <ThemeToggle />
          </div>
        </div>

        <div className="text-center mb-10">
          <p className="text-md text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Claim your .som domain name. (1 per wallet)
          </p>
        </div>

        {/* Success Share Card */}
        {showSuccessShare && (
          <div className="max-w-md mx-auto mb-8">
            <Card className="border-2 border-green-200 dark:border-green-800 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
                <h3 className="text-xl font-bold">🎉 Congratulations!</h3>
                <p>You've successfully claimed {claimedDomain}.som</p>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-blue-800 dark:text-blue-300 text-sm">
                  <p className="font-medium mb-1">Share your domain on X now for surprises on mainnet!</p>
                  <p className="text-xs">(Snapshot will be taken just before mainnet.)</p>
                </div>

                <div className="flex justify-center">
                  <a
                    href={getTwitterShareUrl(claimedDomain)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#1DA1F2] hover:bg-[#1a94df] text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    <Twitter className="h-5 w-5" />
                    Share on X (Twitter)
                  </a>
                </div>

                <div className="flex justify-center mt-4">
                  <Button variant="outline" onClick={() => setShowSuccessShare(false)} className="text-sm">
                    Continue to app
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="max-w-md mx-auto">
          <Card className="border-2 border-purple-100 dark:border-gray-700 shadow-lg">
            {isConnected ? (
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Domain Services</span>
                  {address && (
                    <a
                      href={`https://shannon-explorer.somnia.network/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm flex items-center gap-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                    >
                      Explorer <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </CardTitle>
              </CardHeader>
            ) : null}

            {!isConnected ? (
              <CardContent className="space-y-4 flex flex-col items-center justify-center py-10">
                <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
                  Please connect your wallet to use domain services
                </p>
                <CustomConnectButton />
              </CardContent>
            ) : (
              <>
                <CardContent className="p-4">
                  <div className="flex space-x-2 mb-4">
                    <Button
                      variant={activeTab === "register" ? "default" : "outline"}
                      className={activeTab === "register" ? "bg-gradient-to-r from-purple-600 to-blue-600" : ""}
                      onClick={() => setActiveTab("register")}
                    >
                      Register
                    </Button>
                    <Button
                      variant={activeTab === "resolve" ? "default" : "outline"}
                      className={activeTab === "resolve" ? "bg-gradient-to-r from-purple-600 to-blue-600" : ""}
                      onClick={() => setActiveTab("resolve")}
                    >
                      Resolve Name
                    </Button>
                    <Button
                      variant={activeTab === "reverse" ? "default" : "outline"}
                      className={activeTab === "reverse" ? "bg-gradient-to-r from-purple-600 to-blue-600" : ""}
                      onClick={() => setActiveTab("reverse")}
                    >
                      Lookup Address
                    </Button>
                  </div>

                  {activeTab === "register" && (
                    <div className="space-y-4">
                      {userDomain ? (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-yellow-800 dark:text-yellow-300 text-sm">
                          <p className="flex items-center">
                            <Info className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>
                              You already own <strong>{userDomain}</strong>. Only one domain per wallet is allowed.
                            </span>
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <Input
                                type="text"
                                placeholder="e.g. john"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="rounded-r-none focus-visible:ring-purple-500"
                              />
                              <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 border border-l-0 border-input rounded-r-md text-gray-500 dark:text-gray-300 font-medium">
                                .som
                              </div>
                            </div>

                            {isChecking && (
                              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Checking availability...
                              </div>
                            )}

                            {isAvailable !== null && !isChecking && (
                              <div className="flex items-center text-sm">
                                {isAvailable ? (
                                  <div className="flex items-center text-green-600 dark:text-green-400">
                                    <Check className="h-4 w-4 mr-1" />
                                    <span>Available! You can register it now.</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center text-red-600 dark:text-red-400">
                                    <X className="h-4 w-4 mr-1" />
                                    <span>This domain is already taken.</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md text-blue-700 dark:text-blue-300 text-sm">
                            <Info className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>Registration requires a fee of {REGISTRATION_FEE} STT</span>
                          </div>

                          <Button
                            onClick={handleClaimButtonClick}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                            disabled={!name || !isAvailable || isClaiming}
                          >
                            {isClaiming ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Search className="mr-2 h-4 w-4" />
                                {name ? `Register ${name}.som for ${REGISTRATION_FEE} STT` : "Register Domain"}
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {activeTab === "resolve" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <Input
                            type="text"
                            placeholder="e.g. john"
                            value={resolveQuery}
                            onChange={(e) => setResolveQuery(e.target.value)}
                            className="rounded-r-none focus-visible:ring-purple-500"
                          />
                          <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 border border-l-0 border-input rounded-r-md text-gray-500 dark:text-gray-300 font-medium">
                            .som
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={handleResolveName}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        disabled={!resolveQuery || isResolving}
                      >
                        {isResolving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Resolving...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4" />
                            Resolve Name
                          </>
                        )}
                      </Button>

                      {resolvedAddress && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address:</p>
                          <p className="text-sm break-all">{resolvedAddress}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "reverse" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Input
                          type="text"
                          placeholder="0x..."
                          value={reverseQuery}
                          onChange={(e) => setReverseQuery(e.target.value)}
                          className="focus-visible:ring-purple-500"
                        />
                      </div>

                      <Button
                        onClick={handleReverseLookup}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        disabled={!reverseQuery || isReversing}
                      >
                        {isReversing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Looking up...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4" />
                            Lookup Address
                          </>
                        )}
                      </Button>

                      {reverseName && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name:</p>
                          <p className="text-sm">{reverseName}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col">
                  {status && (
                    <Alert
                      className={`w-full ${
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
                </CardFooter>
              </>
            )}
          </Card>

          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Runs on Somnia Shannon Testnet.</p>
            <p className="mt-1">
              <a
                href="https://shannon-explorer.somnia.network"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 inline-flex items-center"
              >
                Block Explorer <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Social Media Links - Fixed at bottom right */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <a
          href="https://x.com/somnia_domains"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
          aria-label="Follow us on X (Twitter)"
        >
          <Twitter className="h-5 w-5 text-gray-700 dark:text-gray-300 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
        </a>
        <a
          href="https://somnia-domain-services.gitbook.io/somnia-domain-services"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
          aria-label="Read our documentation"
        >
          <BookOpen className="h-5 w-5 text-gray-700 dark:text-gray-300 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors" />
        </a>
      </div>

      {/* Warning Dialog */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Important Warning
            </DialogTitle>
          </DialogHeader>
          <div className="border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4 rounded-md text-red-800 dark:text-red-300">
            <p className="text-sm">
              <strong>Warning:</strong> Your Somnia domain can only be claimed once during the testnet period. After
              claiming, you cannot get another one or change it. Please make sure this is the domain you want to use.
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button variant="outline" onClick={() => setShowWarningDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              onClick={() => {
                setShowWarningDialog(false)
                claimName()
              }}
            >
              I Understand, Proceed with Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
