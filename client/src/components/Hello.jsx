import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Trash2, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";
import QRCode from "react-qr-code";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownLink,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Avatar,
  Name,
  Identity,
  EthBalance,
  Address as AddressComponent,
} from "@coinbase/onchainkit/identity";

import { createPublicClient, http, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";
import { useAccount } from "wagmi";

// Initialize viem client
const client = createPublicClient({
  chain: baseSepolia,
  transport: http(), // Replace with your preferred RPC if needed
});

// ERC-20 contract address
const tokenAddress = "0x9c19f922ea67698098d81154e113350810c96422";

// ERC-20 balanceOf ABI
const erc20Abi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
]);

async function getTokenBalance(address) {
  try {
    const balance = await client.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    });

    console.log(`Balance: ${balance.toString()}`);
    return Number(balance) / 10 ** 18;
  } catch (error) {
    console.error("Error fetching balance:", error);
  }
}

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const { address } = useAccount();

  useEffect(() => {
    if (address) {
      getTokenBalance(address).then((balance) => {
        setTokenBalance(balance);
      });
    }
  }, [address, messages]);

  useEffect(() => {
    wsRef.current = new WebSocket("ws://localhost:3001");

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(data);

      if (data.content.includes("0xA878c19b33E4Aa9213C0EC648Ae081fC5920e71e")) {
        try {
          const jsonData = JSON.parse(data.content);
          if (jsonData) {
            generateReclaimProofRequest(jsonData).then((url) => {
              if (url) {
                setMessages((prev) => [
                  ...prev,
                  {
                    type: "qr",
                    content: url,
                    timestamp: new Date().toISOString(),
                  },
                ]);
              }
              setIsLoading(false);
            });
          }
        } catch (error) {
          console.error("Error parsing Reclaim proof config:", error);
        }
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          type: data.type,
          content: data.content,
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsLoading(false);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || !wsRef.current) return;

    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        content: input,
        timestamp: new Date().toISOString(),
      },
    ]);

    wsRef.current.send(input);
    setInput("");
    setIsLoading(true);
  };

  const getMessageStyle = (type) => {
    switch (type) {
      case "user":
        return "bg-blue-500 text-white self-end";
      case "agent":
        return "bg-gray-200 text-gray-800 self-start";
      case "tools":
        return "bg-green-100 text-gray-800 self-start";
      case "error":
        return "bg-red-100 text-red-800 self-start";
      default:
        return "bg-gray-200 text-gray-800 self-start";
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const generateReclaimProofRequest = async (jsonData) => {
    console.log("Generating Reclaim Proof Request");
    const jsonString = JSON.stringify(jsonData);
    const reclaimProofRequest = await ReclaimProofRequest.fromJsonString(
      jsonString
    );

    reclaimProofRequest.addContext("address", address);
    console.log(address);

    const requestUrl = await reclaimProofRequest.getRequestUrl();
    await reclaimProofRequest.startSession({
      onSuccess: (proofs) => {
        if (proofs) {
          if (typeof proofs === "string") {
            console.log("SDK Message:", proofs);
          } else if (typeof proofs !== "string") {
            console.log("Verification success", proofs?.claimData.context);
          }
        }
      },
      onError: (error) => {
        console.error("Verification failed", error);
      },
    });
    return requestUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex flex-col h-[90vh]">
          {/* Header */}
          <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Rewards Agent</h1>
            <div className="flex items-center gap-2">
              {address && (
                <p className="text-white">$Reward: {tokenBalance.toString()}</p>
              )}
              <Wallet>
                <ConnectWallet>
                  <Avatar className="h-6 w-6" />
                </ConnectWallet>
                <WalletDropdown>
                  <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <AddressComponent />
                    <EthBalance />
                  </Identity>
                  <WalletDropdownLink
                    icon="wallet"
                    href="https://keys.coinbase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Wallet
                  </WalletDropdownLink>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
              <button
                onClick={clearChat}
                className="p-2 text-indigo-100 hover:text-white hover:bg-indigo-700 rounded-full transition-colors"
                title="Clear chat history"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-6"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-indigo-600" />
                </div>
                <p className="text-xl font-medium text-gray-700">
                  Start a New Conversation
                </p>
                <p className="text-sm text-gray-500">
                  Send a message to begin chatting
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.type === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${getMessageStyle(
                      message.type
                    )}`}
                  >
                    {message.type === "qr" ? (
                      <div className="bg-white p-6 rounded-xl">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">
                          Verify Your Identity
                        </h3>
                        <div className="bg-white p-4 rounded-lg inline-block">
                          <QRCode value={message.content} />
                        </div>
                        <p className="mt-4 text-sm text-gray-600">
                          Open your mobile device's camera to scan this QR code
                        </p>
                      </div>
                    ) : message.type === "agent" ? (
                      <ReactMarkdown
                        className="prose prose-indigo prose-sm max-w-none"
                        components={{
                          a: ({ node, ...props }) => (
                            <a
                              className="text-indigo-600 hover:text-indigo-800"
                              target="_blank"
                              rel="noopener noreferrer"
                              {...props}
                            />
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="leading-relaxed">{message.content}</p>
                    )}
                    <span className="text-xs text-opacity-75 mt-2 inline-block">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-center py-4">
                <div className="bg-white p-3 rounded-full shadow-md">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 rounded-full border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-6 py-3 bg-indigo-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
