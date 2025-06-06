import { useState, useEffect, useCallback } from "react";
import Custombutton from "./Wallet";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { ethers, constants, providers } from "ethers";
import implementedContractABI from "../abi/ImplementedContract.json";
import ProxyContract from "../abi/ProxyContract.json";
import swellPointsContractABI from "../abi/PointsContract.json";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionHash: string | null;
  isProcessing: boolean;
  onClaim: () => Promise<void>;
  isClaiming: boolean;
  claimError: string;
}

const SuccessModal = ({ isOpen, transactionHash, isProcessing, onClaim, isClaiming, claimError }: SuccessModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4 shadow-xl">
        <div className="flex flex-col items-center gap-4">
          {isProcessing ? (
            <>
              <div className="animate-spin">
                <img src="/assets/icons/swbtc.webp" alt="swBTC" className="w-16 h-16" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Processing Transaction</h3>
              <p className="text-gray-600 text-center">
                Please wait while we process your transaction...
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Transaction Successful!</h3>
              <p className="text-gray-600 text-center">
                You just scored <span className="font-semibold text-[#2f44df]">100</span> wink points!
              </p>
              <div className="flex gap-4 mt-4">
                <button
                  onClick={onClaim}
                  className="px-4 py-2 cursor-pointer bg-[#2f44df] text-white rounded-full hover:bg-[#1f2d8f] transition-colors flex items-center justify-center min-w-[140px]"
                  disabled={isClaiming}
                >
                  {isClaiming ? (
                    <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Claiming...</span>
                  ) : (
                    'Claim Transaction'
                  )}
                </button>
                <button
                  onClick={() => window.open(`https://etherscan.io/tx/${transactionHash}`, '_blank')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  View Transaction
                </button>
              </div>
              {claimError && <p className="text-red-500 text-sm mt-2">{claimError}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Contract addresses
// const SWELL_PROXY_ADDRESS = "0xf951E335afb289353dc249e82926178EaC7DEd78" as const;
// const SWETH_IMPLEMENTATION_ADDRESS = "0xce95ba824ae9a4df9b303c0bbf4d605ba2affbfc" as const;

// wBTC contract address on Ethereum mainnet
const WBTC_ADDRESS = "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599";

const swellPointsContractAddress = '0x50Fe2A044ab8882208d70145F10E3D2eaF6cC59c';

// Minimal ERC20 ABI for balanceOf and decimals


const StakeForm = () => {
  const [ethAmount, setEthAmount] = useState<string>("");
  const [swethAmount, setSwethAmount] = useState<string>("");
  // const [swEthBalance, setSwEthBalance] = useState<string>("0");
  const [winkpoints, setWinkpoints] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [ethToSwETHRate, setEthToSwETHRate] = useState<string>("0");
  const [isProcessing, setIsProcessing] = useState(false);
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  // ETH balance (if needed for staking logic)

  // wBTC balance state
  const [wbtcBalance, setWbtcBalance] = useState<string>("0");

  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");

  const fetchWinkpoints = useCallback(async () => {
    if (!address) return 0;

    try {
      setIsProcessing(true);
      const response = await fetch(
        `https://orca-app-ezrxl.ondigitalocean.app/api/action/fetchSwellPoints?useraddress=${address}`,
        { method: "GET" }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Winkpoints data:", data);

      if (data && data.points !== undefined) {
        setWinkpoints(data.points);
        return data.points;
      } else {
        console.warn("Invalid data format received:", data);
        setWinkpoints(0);
        return 0;
      }
    } catch (error) {
      console.error("Error fetching winkpoints:", error);
      setWinkpoints(0);
      return 0;
    } finally {
      setIsProcessing(false);
    }
  }, [address]);

  const fetchEthToSwETHRate = useCallback(async () => {
    try {
      const rate = await publicClient?.readContract({
        address: "0x975304c676eb3dc86cd336138328e107a95eaa50",
        abi: implementedContractABI,
        functionName: "ethToRswETHRate",
      }) as bigint;
      console.log(swethAmount)
      if (rate) {
        const rateInEth = ethers.utils.formatUnits(rate, 18);
        console.log("ETH to rswETH rate:", rateInEth);
        setEthToSwETHRate(rateInEth);
      }
    } catch (error) {
      console.error("Error fetching ETH to swETH rate:", error);
    }
  }, [publicClient]);

  const fetchApr = useCallback(async () => {
    try {
      const response = await fetch('https://v3-lrt.svc.swellnetwork.io/api/tokens/rsweth/apr');
      const aprText = await response.text();
      console.log("APR:", aprText);
    } catch (error) {
      console.error("Error fetching APR:", error);
    }
  }, []);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('https://v3-lrt.svc.swellnetwork.io/swell.v3.StatsService/Prices?connect=v1&encoding=json&message=%7B%7D');
        const data = await response.json();
        console.log('Price data:', data);
      } catch (error) {
        console.error('Error fetching prices:', error);
      }
    };

    fetchEthToSwETHRate();
    fetchPrices();
    // fetchBalances();
    fetchWinkpoints();
    fetchApr();
  }, [fetchEthToSwETHRate, fetchWinkpoints, fetchApr]);

  useEffect(() => {
    const fetchWbtcBalance = async () => {
      if (!address || !publicClient) {
        setWbtcBalance("0");
        return;
      }
      try {
        // Get decimals
        const decimals = await publicClient.readContract({
          address: WBTC_ADDRESS,
          abi: ProxyContract,
          functionName: "decimals"
        });
        // Get balance
        const rawBalance = await publicClient.readContract({
          address: WBTC_ADDRESS,
          abi: ProxyContract,
          functionName: "balanceOf",
          args: [address]
        });
        console.log("rawBalance", rawBalance, "decimals", decimals);

        setWbtcBalance(ethers.utils.formatUnits(rawBalance as bigint, decimals as number));
        console.log(wbtcBalance)
      } catch (err) {
        setWbtcBalance("0");
      }
    };
    fetchWbtcBalance();
  }, [address, publicClient]);

  // const fetchBalances = async () => {
  //   if (!address) return;

  //   try {
  //     const swEthBalance = await publicClient?.readContract({
  //       address: SWETH_IMPLEMENTATION_ADDRESS,
  //       abi: implementedContractABI,
  //       functionName: "balanceOf",
  //       args: [address],
  //     });

  //     if (swEthBalance) {
  //       setSwEthBalance(ethers.utils.formatUnits(swEthBalance.toString(), 18));
  //     }
  //   } catch (error) {
  //     console.error("Error fetching balances:", error);
  //     setSwEthBalance("0");
  //   }
  // };

  const handleEthAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEthAmount(value);

    if (value && ethToSwETHRate) {
      const parsedValue = Number.parseFloat(value);
      const calculatedSweth = (parsedValue * Number(ethToSwETHRate)).toFixed(18);
      setSwethAmount(calculatedSweth);
    } else {
      setSwethAmount("");
    }
  };

  const updatePoints = async () => {
    try {
      const response = await fetch(
        "https://orca-app-ezrxl.ondigitalocean.app/api/action/updateSwellPoints",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            useraddress: address,
            newpoints: 100,
            txnhash: `https://etherscan.io/tx/${transactionHash}`
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update points");
      }

      const data = await response.json();
      console.log("Points updated:", data);

      setWinkpoints(0);
      fetchWinkpoints();
    } catch (error) {
      console.error("Error updating points:", error);
    }
  };

  const handleMaxClick = () => {
    if (wbtcBalance && ethToSwETHRate) {
      setEthAmount(wbtcBalance);
      setSwethAmount((Number(wbtcBalance) * Number(ethToSwETHRate)).toFixed(18));
    }
  };

  const MIN_AMOUNT = 0.000000000000001;

  const isInsufficientFunds = () => {
    if (!ethAmount || !wbtcBalance) return false;
    return Number(ethAmount) > Number(wbtcBalance);
  };

  const isBelowMinimum = () => {
    if (!ethAmount) return false;
    return Number(ethAmount) < MIN_AMOUNT;
  };

  const handleStakeClick = async () => {
    if (!address || !ethAmount) return;

    setError("");
    setTransactionHash(null);
    setShowSuccessModal(true);
    setIsProcessing(true);

    try {
      // wBTC uses 8 decimals
      const amountInWeiBigNumber = ethers.utils.parseUnits(ethAmount, 8);
      const amountInWei = BigInt(amountInWeiBigNumber.toString());

      // 1. Check allowance
      let allowanceBigInt: bigint = BigInt(0);
      const allowance = await publicClient?.readContract({
        address: WBTC_ADDRESS,
        abi: ProxyContract,
        functionName: "allowance",
        args: [address, "0x8DB2350D78aBc13f5673A411D4700BCF87864dDE"]
      });

      if (typeof allowance === 'bigint') {
        allowanceBigInt = allowance;
      } else if (typeof allowance === 'string' || typeof allowance === 'number') {
        allowanceBigInt = BigInt(allowance);
      } else if (allowance != null && typeof allowance === 'object' && 'toString' in allowance) {
        allowanceBigInt = BigInt(allowance.toString());
      }

      // 2. If allowance is not enough, approve MaxUint256
      if (allowanceBigInt < amountInWei) {
        setIsProcessing(true);
        // Approve MaxUint256 for best UX
        const approveTx = await writeContractAsync({
          address: WBTC_ADDRESS,
          abi: ProxyContract,
          functionName: "approve",
          args: ["0x8DB2350D78aBc13f5673A411D4700BCF87864dDE", constants.MaxUint256],
          account: address as `0x${string}`
        });
        await publicClient?.waitForTransactionReceipt({ hash: approveTx });
      }

      // 3. Now call deposit
      const depositTx = await writeContractAsync({
        address: "0x8DB2350D78aBc13f5673A411D4700BCF87864dDE",
        abi: implementedContractABI,
        functionName: "deposit",
        args: [amountInWei, address], // Pass amount and receiver
        account: address as `0x${string}`
      });

      setTransactionHash(depositTx);
      await publicClient?.waitForTransactionReceipt({ hash: depositTx });

      // Refresh balances after successful stake
      // fetchBalances();

      // Update points and show success message
      // await updatePoints();
      // await fetchWinkpoints();
      setIsProcessing(false);

    } catch (error) {
      console.error("Error:", error);
      let errorMsg = "Transaction failed";
      if (error instanceof Error) {
        if (error.message.includes("user rejected transaction")) {
          errorMsg = "Transaction rejected by user";
        } else if (error.message.includes("insufficient funds")) {
          errorMsg = "Insufficient funds for gas";
        } else {
          errorMsg = `Error: ${error.message.split('\n')[0]}`;
        }
      }
      setError(errorMsg);
      setShowSuccessModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Claim points on Swellchain
 const handleClaim = async () => {
  setIsClaiming(true);
  setClaimError("");
  try {
    // Switch to Swellchain if needed (do this BEFORE creating provider/signer)
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x783' }], // 1923 in hex
    });

    // Now create provider and signer (they will be on the correct network)
    const provider = new providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    // Initialize contract
    const contract = new ethers.Contract(
      swellPointsContractAddress, 
      swellPointsContractABI, 
      signer
    );

    // Call updated claimPoints with parameters
    const tx = await contract.claimPoints(address, transactionHash);
    await tx.wait();
    
    // Refresh points
    await updatePoints();
    setShowSuccessModal(false);

  } catch (error: any) {
    if (error.code === 4001) {
      setClaimError("User rejected transaction");
    } else if (error.message) {
      setClaimError(error.message);
    } else {
      setClaimError("Claim failed");
    }
    console.error('Claim failed:', error);
  } finally {
    setIsClaiming(false);
  }
};

  const Loader = () => (
    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mx-auto" />
  );

  const getButtonText = () => {
    if (!isConnected) return 'Connect Wallet';
    if (isInsufficientFunds()) return 'Insufficient Funds';
    if (isBelowMinimum()) return `Minimum ${MIN_AMOUNT} ETH`;
    return 'Stake';
  };

  const getButtonContent = () => {
    if (isProcessing) {
      return (
        <div className="flex items-center justify-center gap-2">
          <Loader />
          <span>{getButtonText()}</span>
        </div>
      );
    }
    return getButtonText();
  };

  const isButtonDisabled = () => {
    return !isConnected || isInsufficientFunds() || isBelowMinimum() || !ethAmount || isProcessing;
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    setTransactionHash(null);
    setEthAmount("");
    setSwethAmount("");
  };



  return (
    <>
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => handleModalClose()}
        transactionHash={transactionHash}
        isProcessing={isProcessing}
        onClaim={handleClaim}
        isClaiming={isClaiming}
        claimError={claimError}
      />
      <div className="bg-white/80 backdrop-blur-sm p-6 border border-gray-200 rounded-xl min-w-[430px] max-w-[450px] mx-auto space-y-3 text-xs shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <p className="text-gray-700">Wink Points:</p>
            {isProcessing ? (
              <div className="animate-pulse h-4 w-8 bg-gray-200 rounded"></div>
            ) : (
              <p className="text-gray-800">{winkpoints}</p>
            )}
          </div>
          <Custombutton />
        </div>

        <div className="flex justify-between items-center mb-3">
          <p className="text-gray-600 border border-[#2f44df] rounded-full px-2 py-1">
            ✓ Attested with Sign Protocol 
            <a
              href="https://sepolia.basescan.org/tx/0xe41df2467ed5313534c3b31d9b41f5641a79604f960551c739e1f0c1920facf5"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2f44df] rounded-full px-2 py-1 underline"
            >
              View Attestation
            </a>
          </p>
          <div className="px-3 py-1 rounded-full border border-gray-300 text-gray-700">
            {isConnected ? `${Number(wbtcBalance).toFixed(6)} wBTC` : '- wBTC'}
          </div>
        </div>

        <div className="">
          <div className="flex justify-between items-center mb-2">
            <div className="text-base font-medium text-gray-800">Stake</div>
            <div className="flex items-center gap-2">
              <img src="/assets/icons/wBTC.svg" alt="ETH" className="w-8 h-8" />
              <div className="font-medium text-gray-800">wBTC</div>
            </div>
          </div>

          <div className="">
            <div className="bg-gray-50 p-2 rounded-xl flex border border-gray-200">
              <input
                type="text"
                value={ethAmount}
                onChange={handleEthAmountChange}
                className="w-full text-base font-medium bg-transparent focus:outline-none p-2 text-gray-800"
                placeholder="0"
              />
              <button
                className="border-[#F7931A] border text-[#000000] px-3 rounded-xl cursor-pointer hover:bg-[#F7931A]/5 transition-colors"
                onClick={handleMaxClick}
              >
                MAX
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-2 mt-4">
            <div className="text-base font-medium text-gray-800">Receive</div>
            <div className="flex items-center gap-2">
              <img src="/assets/icons/swbtc.webp" alt="swETH" className="w-8 h-8" />
              <div className="font-medium text-gray-800">swBTC</div>
            </div>
          </div>

          <div className="">
            <div className="bg-gray-50 p-2 rounded-xl flex border border-gray-200">
              <input
                type="text"
                value={ethAmount}
                readOnly
                className="w-full text-base font-medium bg-transparent focus:outline-none p-2 text-gray-800"
                placeholder="0"
              />
            </div>
          </div>

          <button
            className="bg-[#F7931A] p-2 mt-3 w-full text-sm font-bold rounded-full cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-white hover:bg-[#F7931A]/70 transition-colors"
            disabled={isButtonDisabled()}
            onClick={handleStakeClick}
          >
            {getButtonContent()}
          </button>
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
          <div className="border-b border-gray-200 my-1"></div>
          <div className="">
            <div className="flex justify-between font-medium">
              <p className="text-gray-700">swBTC APR</p>
              <p className="text-gray-800">TBD</p>
            </div>
            <div className="flex justify-between font-medium">
              <div className="font-medium text-gray-700">Exchange rate</div>
              <div className="text-right">
                <p className="text-gray-800">1 swBTC = 1 wBTC</p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 mt-1"></div>
        <p className="text-gray-600 text-center">Powered by winks.fun</p>
      </div>
    </>
  );
};

export default StakeForm;
