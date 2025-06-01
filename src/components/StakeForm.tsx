import { useState, useEffect, useCallback } from "react";
import Custombutton from "./Wallet";
import { useAccount, usePublicClient, useWriteContract, useBalance } from "wagmi";
import { ethers } from "ethers";
import implementedContractABI from "../abi/ImplementedContract.json";

interface PriceData {
  ethUsdPrice: number;
  swellUsdPrice: number;
}

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionHash: string | null;
  isProcessing: boolean;
}

const SuccessModal = ({ isOpen, onClose, transactionHash, isProcessing }: SuccessModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4 shadow-xl">
        <div className="flex flex-col items-center gap-4">
          {isProcessing ? (
            <>
              <div className="animate-spin">
                <img src="/assets/icons/sweth.svg" alt="swETH" className="w-16 h-16" />
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
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => window.open(`https://etherscan.io/tx/${transactionHash}`, '_blank')}
                  className="px-4 py-2 bg-[#2f44df] text-white rounded-full hover:bg-[#1f2d8f] transition-colors"
                >
                  View Transaction
                </button>
              </div>
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


const StakeForm = () => {
  const [ethAmount, setEthAmount] = useState<string>("");
  const [swethAmount, setSwethAmount] = useState<string>("");
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  // const [swEthBalance, setSwEthBalance] = useState<string>("0");
  const [winkpoints, setWinkpoints] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [ethToSwETHRate, setEthToSwETHRate] = useState<string>("0");
  const [isProcessing, setIsProcessing] = useState(false);
  const [apr, setApr] = useState<string>("0.00");

  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { data: balance } = useBalance({
    address: address,
    query: {
      refetchInterval: 3000,
    }
  });

  const fetchWinkpoints = useCallback(async () => {
    if (!address) return 0;

    try {
      setIsProcessing(true);
      const response = await fetch(
        `https://inner-circle-seven.vercel.app/api/action/getPoints?address=${address}`,
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
        address: "0xFAe103DC9cf190eD75350761e95403b7b8aFa6c0",
        abi: implementedContractABI,
        functionName: "ethToRswETHRate",
      }) as bigint;

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
      const aprNumber = parseFloat(aprText);
      setApr(aprNumber.toFixed(2));
      console.log("APR:", aprText);
    } catch (error) {
      console.error("Error fetching APR:", error);
      setApr("0.00");
    }
  }, []);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('https://v3-lrt.svc.swellnetwork.io/swell.v3.StatsService/Prices?connect=v1&encoding=json&message=%7B%7D');
        const data = await response.json();
        setPriceData(data);
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
        "https://inner-circle-seven.vercel.app/api/action/setPoints",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: address,
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
    if (balance?.formatted && ethToSwETHRate) {
      setEthAmount(balance.formatted);
      setSwethAmount((Number(balance.formatted) * Number(ethToSwETHRate)).toFixed(18));
    }
  };

  const MIN_AMOUNT = 0.000000000000001;

  const isInsufficientFunds = () => {
    if (!ethAmount || !balance?.formatted) return false;
    return Number(ethAmount) > Number(balance.formatted);
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
      const amountInWei = ethers.utils.parseEther(ethAmount);

      const depositTx = await writeContractAsync({
        address: "0xFAe103DC9cf190eD75350761e95403b7b8aFa6c0",
        abi: implementedContractABI,
        functionName: "deposit",
        args: [], // No arguments needed for ETH deposit
        account: address as `0x${string}`,
        value: amountInWei.toBigInt()
      });

      setTransactionHash(depositTx);
      await publicClient?.waitForTransactionReceipt({ hash: depositTx });

      // Refresh balances after successful stake
      // fetchBalances();

      // Update points and show success message
      await updatePoints();
      await fetchWinkpoints();
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

  const calculateDollarAmount = (amount: string, price: number | undefined) => {
    if (!amount || !price) return "$0.00";
    const parsedAmount = Number.parseFloat(amount);
    const dollarAmount = parsedAmount * price;
    return dollarAmount < 0.01 ? "<$0.01" : `$${dollarAmount.toFixed(2)}`;
  };

  return (
    <>
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => handleModalClose()}
        transactionHash={transactionHash}
        isProcessing={isProcessing}
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
            {isConnected ? `${Number(balance?.formatted).toFixed(4)} ETH` : '- ETH'}
          </div>
        </div>

        <div className="">
          <div className="flex justify-between items-center mb-2">
            <div className="text-base font-medium text-gray-800">Stake</div>
            <div className="flex items-center gap-2">
              <img src="/assets/icons/swell-icon.png" alt="ETH" className="w-8 h-8" />
              <div className="font-medium text-gray-800">SWELL</div>
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
                className="border-[#2F43EC] border text-[#000000] px-3 rounded-xl cursor-pointer hover:bg-[#2F43EC]/5 transition-colors"
                onClick={handleMaxClick}
              >
                MAX
              </button>
            </div>
            <p className="text-start mt-1 text-gray-500 pl-3">
              {calculateDollarAmount(ethAmount, priceData?.ethUsdPrice)}
            </p>
          </div>

          <div className="flex justify-between items-center mb-2 mt-4">
            <div className="text-base font-medium text-gray-800">Receive</div>
            <div className="flex items-center gap-2">
              <img src="/assets/icons/rswell-icon.webp" alt="swETH" className="w-8 h-8" />
              <div className="font-medium text-gray-800">rSWELL</div>
            </div>
          </div>

          <div className="">
            <div className="bg-gray-50 p-2 rounded-xl flex border border-gray-200">
              <input
                type="text"
                value={swethAmount}
                readOnly
                className="w-full text-base font-medium bg-transparent focus:outline-none p-2 text-gray-800"
                placeholder="0"
              />
            </div>
          </div>

          <button
            className="bg-[#2F43EC] p-2 mt-3 w-full text-sm font-bold rounded-full cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-white hover:bg-[#2F43EC]/70 transition-colors"
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
              <p className="text-gray-700">rswETH APR</p>
              <p className="text-gray-800">{apr}%</p>
            </div>
            <div className="flex justify-between font-medium">
              <div className="font-medium text-gray-700">Exchange rate</div>
              <div className="text-right">
                <p className="text-gray-800">1 ETH = {ethToSwETHRate ? Number(ethToSwETHRate).toFixed(6) : 'Loading...'} rswETH</p>
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
