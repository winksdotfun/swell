import { useState, useEffect, useCallback } from "react";
import Custombutton from "./Wallet";
import { useAccount, usePublicClient, useWriteContract, useBalance } from "wagmi";
import { Wallet } from "lucide-react";
import { ethers } from "ethers";
import proxyContractABI from "../abi/ProxyContract.json";
import implementedContractABI from "../abi/ImplementedContract.json";

interface PriceData {
  ethUsdPrice: number;
  swellUsdPrice: number;
}

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionHash: string | null;
  newPoints: number;
}

const SuccessModal = ({ isOpen, onClose, transactionHash, newPoints }: SuccessModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] p-6 rounded-xl max-w-md w-full mx-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold">Transaction Successful!</h3>
          <p className="text-gray-300 text-center">
            You just scored <span className="font-semibold text-white">100</span> wink points!
          </p>
          <div className="flex gap-4 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => window.open(`https://sepolia.etherscan.io/tx/${transactionHash}`, '_blank')}
              className="px-4 py-2 bg-[#2f44df] rounded-full hover:bg-[#1f2d8f] transition-colors"
            >
              View Transaction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Contract addresses
const SWELL_PROXY_ADDRESS = "0xf951E335afb289353dc249e82926178EaC7DEd78" as const;
const SWETH_IMPLEMENTATION_ADDRESS = "0xce95ba824ae9a4df9b303c0bbf4d605ba2affbfc" as const;


const StakeForm = () => {
  const [ethAmount, setEthAmount] = useState<string>("");
  const [swethAmount, setSwethAmount] = useState<string>("");
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [swEthBalance, setSwEthBalance] = useState<string>("0");
  const [winkpoints, setWinkpoints] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [error, setError] = useState<string>("");
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newPoints, setNewPoints] = useState<number>(0);

  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { data: balance } = useBalance({
    address: address,
    query: {
      refetchInterval: 3000, // Refetch every 3 seconds
    }
  });

  const ETH_TO_SWETH_RATIO = 1.089495761362249018;
  const SWETH_TO_ETH_RATIO = 1 / ETH_TO_SWETH_RATIO;
  const MIN_AMOUNT = 0.000000000001;

  const fetchWinkpoints = useCallback(async () => {
    if (!address) return 0;
  
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  }, [address]);

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

    fetchPrices();
    fetchBalances();
    fetchWinkpoints();
  }, [fetchWinkpoints]);

  const fetchBalances = async () => {
    if (!address) return;

    try {
      const swEthBalance = await publicClient?.readContract({
        address: SWETH_IMPLEMENTATION_ADDRESS,
        abi: implementedContractABI,
        functionName: "balanceOf",
        args: [address],
      });

      if (swEthBalance) {
        setSwEthBalance(ethers.utils.formatUnits(swEthBalance.toString(), 18));
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
      setSwEthBalance("0");
    }
  };

  const handleEthAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEthAmount(value);
    
    if (value) {
      const parsedValue = Number.parseFloat(value);
      const calculatedSweth = (parsedValue * SWETH_TO_ETH_RATIO).toFixed(18);
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
    if (balance?.formatted) {
      setEthAmount(balance.formatted);
      setSwethAmount((Number(balance.formatted) * SWETH_TO_ETH_RATIO).toFixed(18));
    }
  };

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
    
    setIsApproving(true);
    setError("");
    setTransactionHash(null);
    setShowSuccessModal(false);

    try {
      const amountInWei = ethers.utils.parseEther(ethAmount);
      
      // First, approve the implementation contract to receive ETH
      const approvalTx = await writeContractAsync({
        address: SWETH_IMPLEMENTATION_ADDRESS,
        abi: implementedContractABI,
        functionName: "approve",
        args: [
          SWETH_IMPLEMENTATION_ADDRESS,
          amountInWei.toBigInt()
        ],
        account: address as `0x${string}`,
      });

      await publicClient?.waitForTransactionReceipt({ hash: approvalTx });
      setIsApproving(false);

      // After approval, execute the deposit
      setIsDepositing(true);
      const depositTx = await writeContractAsync({
        address: SWETH_IMPLEMENTATION_ADDRESS,
        abi: implementedContractABI,
        functionName: "deposit",
        args: [], // No arguments needed for ETH deposit
        account: address as `0x${string}`,
        value: amountInWei.toBigInt()
      });

      setTransactionHash(depositTx);
      await publicClient?.waitForTransactionReceipt({ hash: depositTx });
      setIsDepositing(false);

      // Refresh balances after successful stake
      fetchBalances();

      // Update points and show success modal
      setShowSuccessModal(true);

      await updatePoints();
      const updatedPoints = await fetchWinkpoints();
      setNewPoints(updatedPoints);

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
    } finally {
      setIsApproving(false);
      setIsDepositing(false);
    }
  };

  const Loader = () => (
    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mx-auto" />
  );

  const getButtonText = () => {
    if (!isConnected) return 'Connect Wallet';
    if (isInsufficientFunds()) return 'Insufficient Funds';
    if (isBelowMinimum()) return `Minimum ${MIN_AMOUNT} ETH`;
    if (isApproving) return 'Approving...';
    if (isDepositing) return 'Depositing...';
    if (transactionHash) return 'View Transaction';
    return 'Stake';
  };

  const getButtonContent = () => {
    if (isApproving || isDepositing) {
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
    return !isConnected || isInsufficientFunds() || isBelowMinimum() || !ethAmount || isApproving || isDepositing;
  };

  const handleButtonClick = () => {
    if (transactionHash) {
      window.open(`https://etherscan.io/tx/${transactionHash}`, '_blank');
    } else {
      handleStakeClick();
    }
  };

  const calculateDollarAmount = (amount: string, price: number | undefined) => {
    if (!amount || !price) return "$0.00";
    const parsedAmount = Number.parseFloat(amount);
    return `$${(parsedAmount * price).toFixed(2)}`;
  };

  return (
    <>
      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        transactionHash={transactionHash}
        newPoints={newPoints}
      />
      <div className="bg-opacity-60 backdrop-blur-sm p-6 border border-white/10 rounded-xl min-w-[430px] max-w-[450px] mx-auto space-y-3 text-xs">
        <div className=" flex justify-between items-center">
          <div className="flex items-center gap-2">
            <p>Wink Points:</p>
            {isLoading ? (
              <div className="animate-pulse h-4 w-8 bg-gray-700 rounded"></div>
            ) : (
              <p>{winkpoints}</p>
            )}
          </div>
          <Custombutton />
        </div>

        <div className="flex justify-between items-center mb-3">
          <div className="px-3 py-1 rounded-full border border-gray-600 text-gray-400">
            {isConnected ? `${Number(balance?.formatted).toFixed(4)} ETH` : '- ETH'} Available
          </div>
          <Wallet className="text-gray-400 h-5" />
        </div>
      

        <div className="">
          <div className="flex justify-between items-center mb-2">
            <div className="text-base font-medium">Stake</div>
            <div className="flex items-center gap-2">
              <img src="/assets/icons/eth.svg" alt="ETH" className="w-8 h-8" />
              <div className="font-medium">ETH</div>
            </div>
          </div>

          <div className="">
            <div className="bg-[#2f44df]/10 p-2 rounded-xl flex">
              <input
                type="text"
                value={ethAmount}
                onChange={handleEthAmountChange}
                className="w-full text-base font-medium bg-transparent focus:outline-none p-2"
                placeholder="0"
              />
              <button
                className="border-[#2f44df] border text-[#2f44df] px-3 rounded-xl cursor-pointer"
                onClick={handleMaxClick}
              >
                MAX
              </button>
            </div>
            <p className="text-start mt-1 text-gray-600/90 pl-3">
              {calculateDollarAmount(ethAmount, priceData?.ethUsdPrice)}
            </p>
          </div>

          {/* <div className="flex justify-center my-1">
            <div className="bg-swell-navy p-2 rounded-full hover:rotate-180 transition-all duration-300 cursor-pointer">
              <img
                src="/assets/icons/arrow-down.svg"
                alt="arrow"
                className="w-6 h-6"
              />
            </div>
          </div> */}

          <div className="flex justify-between items-center mb-2">
            <div className="text-base font-medium">Receive</div>
            <div className="flex items-center gap-2">
              <img src="/assets/icons/sweth.svg" alt="swETH" className="w-8 h-8" />
              <div className="font-medium">swETH</div>
            </div>
          </div>

          <div className="">
            <div className="bg-[#2f44df]/10 p-2 rounded-xl flex">
              <input
                type="text"
                value={swethAmount}
                readOnly
                className="w-full text-base font-medium bg-transparent focus:outline-none p-2"
                placeholder="0"
              />
            </div>
            {/* <p className="text-start mt-1 text-gray-600/90 pl-3">
              {calculateDollarAmount(swethAmount, priceData?.ethUsdPrice)}
            </p> */}
          </div>

          <button 
            className="bg-[#2f44df] p-2 mt-3 w-full text-sm font-bold rounded-full cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center" 
            disabled={isButtonDisabled()}
            onClick={handleButtonClick}
          >
            {getButtonContent()}
          </button>
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
          <div className="border-b border-[#2f44df] my-1"></div>
          <div className=" ">
            <div className=" flex justify-between font-medium">
              <p>swETH APR</p>
              <p>3.94%</p>
            </div>
            <div className=" flex justify-between font-medium">
              <p>Exchange rate</p>
              <p>1 swETH = {SWETH_TO_ETH_RATIO.toFixed(6)} ETH</p>
            </div>
            <div className=" flex justify-between font-medium">
              <p>Transaction fee</p>
              <p>$1.50 USD</p>
            </div>
            <div className=" flex justify-between font-medium">
              <p>Processing time</p>
              <p>~12 days</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 mt-1"></div>
        <p className=' text-white text-center'>Powered by winks.fun</p>
      </div>
    </>
  );
};

export default StakeForm;
