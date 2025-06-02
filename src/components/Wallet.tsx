import "@rainbow-me/rainbowkit/styles.css";
import {
  ConnectButton
} from "@rainbow-me/rainbowkit";



const Custombutton = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <>
                    <button
                      className="bg-[#F7931A] text-white p-2 rounded-xl cursor-pointer"
                      onClick={openConnectModal}
                      type="button"
                    >
                      Connect Wallet
                    </button>
                  </>
                );
              }

              if (chain.unsupported) {
                return (
                  <>
                    <button
                      className=" w-fit p-2 bg-red-500 hover:bg-red-600 cursor-pointer"
                      onClick={openChainModal}
                      type="button"
                    >
                      Wrong network
                    </button>
                  </>
                );
              }

              return (
                <div className="">
                  <button
                    className="bg-[#F7931A] text-white p-2 rounded-xl cursor-pointer"
                    onClick={openAccountModal}
                    type="button"
                  >
                    {account.displayName}
                    {account.displayBalance
                      ? ` (${account.displayBalance})`
                      : ""}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default Custombutton;