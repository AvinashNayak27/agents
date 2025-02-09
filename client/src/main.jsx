import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import Hello from "./components/Hello.jsx";
import { baseSepolia } from "viem/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import "@coinbase/onchainkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";

const queryClient = new QueryClient();

const config = createConfig({
  chains: [baseSepolia],

  ssr: false,
  transports: {
    [baseSepolia.id]: http(),
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          config={{
            appearance: {
              name: "OnchainKit Playground",
              logo: "https://onchainkit.xyz/favicon/48x48.png?v4-19-24",
              mode: "light",
              theme: "light",
            },
          }}
          chain={baseSepolia}
        >
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/chat" element={<Hello />} />
            </Routes>
          </BrowserRouter>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
