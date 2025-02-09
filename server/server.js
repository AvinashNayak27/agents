const { CdpAgentkit } = require("@coinbase/cdp-agentkit-core");
const { CdpToolkit, CdpTool } = require("@coinbase/cdp-langchain");
const { HumanMessage } = require("@langchain/core/messages");
const { MemorySaver } = require("@langchain/langgraph");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { ChatOpenAI } = require("@langchain/openai");
const { WebSocketServer } = require("ws");
const dotenv = require("dotenv");
const { z } = require("zod");
const express = require("express");
const cors = require("cors");
const { ReclaimProofRequest, verifyProof } = require("@reclaimprotocol/js-sdk");
const { parseEther } = require("viem");

dotenv.config();

const PORT = process.env.PORT || 3000;

function validateEnvironment() {
  const missingVars = [];
  const requiredVars = [
    "OPENAI_API_KEY",
    "CDP_API_KEY_NAME",
    "CDP_API_KEY_PRIVATE_KEY",
  ];

  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error("Error: Required environment variables are not set");
    missingVars.forEach((varName) => {
      console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
  }

  if (!process.env.NETWORK_ID) {
    console.warn(
      "Warning: NETWORK_ID not set, defaulting to base-sepolia testnet"
    );
  }
}

const generateReclaimProofForFlipkart = async (wallet, args) => {
  const userAgent =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1".toLowerCase();
  let isMobile =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent
    );
  let isAppleDevice = /mac|iphone|ipad|ipod/i.test(userAgent);
  let deviceType = isMobile ? (isAppleDevice ? "ios" : "android") : "desktop";
  const reclaimProofRequest = await ReclaimProofRequest.init(
    process.env.APP_ID,
    process.env.APP_SECRET,
    process.env.FLIPKART_PROVIDER_ID,
    {
      log: false,
      acceptAiProviders: true,
      device: deviceType,
      useAppClip: deviceType !== "desktop",
    }
  );

  reclaimProofRequest.setAppCallbackUrl(
    "https://30e1-103-232-241-246.ngrok-free.app/receive-proofs"
  );

  const reclaimProofRequestConfig = reclaimProofRequest.toJsonString();

  return reclaimProofRequestConfig;
};

const generateReclaimProofForAmazon = async (wallet, args) => {
  const userAgent =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  let isMobile =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent
    );
  let isAppleDevice = /mac|iphone|ipad|ipod/i.test(userAgent);
  let deviceType = isMobile ? (isAppleDevice ? "ios" : "android") : "desktop";
  const reclaimProofRequest = await ReclaimProofRequest.init(
    process.env.APP_ID,
    process.env.APP_SECRET,
    process.env.AMAZON_PROVIDER_ID,
    {
      log: false,
      acceptAiProviders: true,
      device: "desktop",
      useAppClip: deviceType !== "desktop",
    }
  );

  reclaimProofRequest.setAppCallbackUrl(
    "https://30e1-103-232-241-246.ngrok-free.app/receive-proofs"
  );

  const reclaimProofRequestConfig = reclaimProofRequest.toJsonString();

  return reclaimProofRequestConfig;
};

const getDataFromFlipkart = async (proof) => {
  console.log("Getting data from Flipkart");
  const isvalid = await verifyProof(proof);
  if (!isvalid) {
    return "Invalid proof";
  }
  const amount = JSON.parse(proof.claimData.context).extractedParameters.text;
  const address = JSON.parse(proof.claimData.context).contextMessage;
  return { amount, address };
};

const getDataFromAmazon = async (proof) => {
  console.log("Getting data from Amazon");
  const isvalid = await verifyProof(proof);
  if (!isvalid) {
    return "Invalid proof";
  }
  const amount = JSON.parse(
    proof.claimData.context
  ).extractedParameters.balance.replace("&#x20b9;", "");
  const address = JSON.parse(proof.claimData.context).contextMessage;
  return { amount, address };
};

const transferReward = async (wallet, args) => {
  const abi = [
    {
      constant: false,
      inputs: [
        {
          name: "to",
          type: "address",
        },
        {
          name: "amount",
          type: "uint256",
        },
      ],
      name: "transfer",
      outputs: [
        {
          name: "",
          type: "bool",
        },
      ],
      payable: false,
      stateMutability: "nonpayable",
      type: "function",
    },
  ];

  const tx = await wallet.invokeContract({
    contractAddress: "0x9c19f922ea67698098d81154e113350810c96422",
    abi: abi,
    method: "transfer",
    args: {
      to: args.address,
      amount: parseEther(args.amount).toString(),
    },
    assetId: "eth",
    amount: "0",
  });

  const data = await tx.wait();
  return data.getTransactionLink();
};

const TRANSFER_REWARD_INPUT = z.object({
  platform: z
    .enum(["flipkart", "amazon"])
    .describe("The platform from which the reward is to be transferred"),
  amount: z.string().describe("The amount of reward to be transferred"),
  address: z
    .string()
    .describe("The address to which the reward is to be transferred"),
});

async function initializeAgent(shouldTransferReward = false) {
  try {
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY,
    });

    const walletData = {
      walletId: process.env.WALLET_ID,
      seed: process.env.WALLET_SEED,
      defaultAddressId: "0xB9Cf11e1dd8547a8f03Ac922E894938F666CD935",
    };

    const walletDataStr = JSON.stringify(walletData);

    const config = {
      cdpWalletData: walletDataStr || undefined,
      networkId: process.env.NETWORK_ID || "base-sepolia",
    };

    const agentkit = await CdpAgentkit.configureWithWallet(config);
    const cdpToolkit = new CdpToolkit(agentkit);
    const tools = cdpToolkit.getTools();

    const generateReclaimProofForFlipkartTool = new CdpTool(
      {
        name: "generate_reclaim_proof_for_flipkart",
        description: "Generates a Reclaim proof for Flipkart",
        func: generateReclaimProofForFlipkart,
        argsSchema: z.object({}).strip(),
      },
      agentkit
    );

    const generateReclaimProofForAmazonTool = new CdpTool(
      {
        name: "generate_reclaim_proof_for_amazon",
        description: "Generates a Reclaim proof for Amazon",
        func: generateReclaimProofForAmazon,
        argsSchema: z.object({}).strip(),
      },
      agentkit
    );

    const transferRewardTool = new CdpTool(
      {
        name: "transfer_reward",
        description: "Transfers a reward to a specified address",
        func: transferReward,
        argsSchema: TRANSFER_REWARD_INPUT,
      },
      agentkit
    );

    if (shouldTransferReward) {
      tools.push(transferRewardTool);
    }

    tools.push(
      generateReclaimProofForFlipkartTool,
      generateReclaimProofForAmazonTool
    );

    const memory = new MemorySaver();
    const agentConfig = {
      configurable: { thread_id: "Rewards Agent!" },
    };

    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: shouldTransferReward
        ? "You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit."
        : "You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. You cannot transfer rewards at this time, but you can help users to redeem their rewards from their Flipkart and Amazon rewards. and ask them to choose the platform to redeem their rewards. and call the generate_reclaim_proof_for_flipkart or generate_reclaim_proof_for_amazon tool to generate the proof for the platform they choose.",
    });

    return { agent, config: agentConfig };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}

async function startServers() {
  validateEnvironment();

  const { agent, config } = await initializeAgent();

  // Initialize Express app
  const app = express();

  app.use(express.json());
  app.use(express.text({ type: "*/*", limit: "50mb" })); // This is to parse the urlencoded proof object that is returned to the callback url
  app.use(cors());

  app.get("/", (req, res) => {
    res.send("Hello World");
  });

  // Route to receive proofs
  app.post("/receive-proofs", async (req, res) => {
    try {
      console.log("Received proof");
      // decode the urlencoded proof object
      const decodedBody = decodeURIComponent(req.body);
      const proof = JSON.parse(decodedBody);
      console.log(proof);

      // Verify the proof using the SDK verifyProof function
      const result = await verifyProof(proof);
      if (!result) {
        return res.status(400).json({ error: "Invalid proofs data" });
      }

      // Safely parse parameters and extract WPM
      try {
        let platform = null;

        if (JSON.parse(proof.claimData.parameters).url.includes("amazon")) {
          platform = "amazon";
        } else if (
          JSON.parse(proof.claimData.parameters).url.includes("flipkart")
        ) {
          platform = "flipkart";
        }

        if (!platform) {
          return res
            .status(400)
            .json({ error: "Platform value not found in proof" });
        }

        console.log("Platform found in proof", platform);

        // Get the agent and config
        const { agent, config } = await initializeAgent(true);

        console.log("Agent and config initialized");

        const { amount, address } =
          platform === "amazon"
            ? await getDataFromAmazon(proof)
            : await getDataFromFlipkart(proof);

        console.log("Amount and address extracted");

        // Create a message to check WPM reward
        const message = `User submitted proof for ${platform}. Please send the reward to the user. The amount is ${amount} and the address is ${address}.`;

        // Call the agent with the message
        const stream = await agent.stream(
          { messages: [new HumanMessage(message)] },
          config
        );

        // Process the stream and send to websocket
        for await (const chunk of stream) {
          if ("agent" in chunk) {
            wss.clients.forEach((client) => {
              client.send(
                JSON.stringify({
                  type: "agent",
                  content: chunk.agent.messages[0].content,
                })
              );
            });
          } else if ("tools" in chunk) {
            wss.clients.forEach((client) => {
              client.send(
                JSON.stringify({
                  type: "tools",
                  content: chunk.tools.messages[0].content,
                })
              );
            });
          }
        }

        return res.sendStatus(200);
      } catch (parseError) {
        console.error("Error parsing parameters:", parseError);
        return res.status(400).json({ error: "Invalid parameters format" });
      }
    } catch (error) {
      console.error("Error processing proof:", error);
      return res.status(500).json({ error: "Failed to process proof" });
    }
  });

  // Start HTTP server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP server is running on port ${PORT}`);
  });

  // Start WebSocket server
  const wss = new WebSocketServer({ port: PORT + 1 });
  console.log(`WebSocket server is running on port ${PORT + 1}`);

  wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("message", async (message) => {
      try {
        const userInput = message.toString();
        const stream = await agent.stream(
          { messages: [new HumanMessage(userInput)] },
          config
        );

        for await (const chunk of stream) {
          if ("agent" in chunk) {
            ws.send(
              JSON.stringify({
                type: "agent",
                content: chunk.agent.messages[0].content,
              })
            );
          } else if ("tools" in chunk) {
            ws.send(
              JSON.stringify({
                type: "tools",
                content: chunk.tools.messages[0].content,
              })
            );
          }
        }
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: "error",
            content: error.message,
          })
        );
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });
}

if (require.main === module) {
  console.log("Starting HTTP and WebSocket Servers...");
  startServers().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
