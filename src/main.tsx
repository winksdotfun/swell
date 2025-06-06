import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mainnet } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { ReferrerTracker } from "./referrerTracker";
const config = getDefaultConfig({
  appName: "My RainbowKit App",
  projectId: "YOUR_PROJECT_ID", 
  chains: [mainnet], 
  ssr: true,
});

const queryClient = new QueryClient();


createRoot(document.getElementById('root')!).render(
  <StrictMode>
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider>
        <ReferrerTracker /> 
        <App />
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
</StrictMode>
)
