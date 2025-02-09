A rewarding agent that converts various loyalty points from apps into $Reward, a unified reward token.

Reward enables users to convert reward points from platforms like **Flipkart SuperCoins and Amazon Pay Balance** into **on-chain crypto rewards** using **zkTLS and the Reclaim Protocol**. It is powered by the **Coinbase Developer Platform (CDP)** Agent kit.

---

### **How the Project Works**

1. **User Requests Reward Conversion**

   - The user wants to redeem their Flipkart SuperCoins or Amazon Pay Balance and convert them into cryptocurrency.
   - The system supports multiple reward platforms, but currently, Flipkart and Amazon are integrated.

2. **Generating Proof of Ownership (via Reclaim Protocol)**

   - To ensure authenticity, the user generates a **zk-proof** (zero-knowledge proof) via the **Reclaim Protocol**.
   - This proof is created based on the user’s Flipkart or Amazon account balance, ensuring that the claim is legitimate.
   - A callback URL is provided to receive the proof after generation.

3. **Verifying the Proof**

   - The system verifies the zk-proof using the `verifyProof` function from Reclaim Protocol.
   - If the proof is valid, the platform extracts relevant data such as:
     - **Amount of reward points** (e.g., `500 SuperCoins`)
     - **User’s wallet address** (to receive converted rewards)

4. **Converting Points to Cryptocurrency**

   - The verified amount is converted into **cryptocurrency** (on the Base Sepolia network for testing).
   - The smart contract function `transfer(address, amount)` is called to send the converted value to the user’s wallet.

5. **Agent and AI Automation**

   - A **Coinbase Developer Platform (CDP) AI agent** interacts with users and manages the reward transfer process.
   - The AI agent:
     - Helps users initiate the reclaim proof process.
     - Guides them on redeeming rewards from Flipkart/Amazon.
     - Triggers the proof verification and crypto transfer process.

6. **WebSocket & Express Server for Real-time Processing**
   - The backend runs on **Express.js** for HTTP API endpoints.
   - A **WebSocket server** enables real-time communication with clients (e.g., updates on proof verification and reward transfers).

---

### **Technology Stack**

- **Blockchain & Crypto:**

  - Coinbase Developer Platform (CDP) for wallet integration and contract interactions.
  - Viem library for Ethereum transactions.
  - zkTLS & Reclaim Protocol for zero-knowledge proof-based verification.

- **AI & Automation:**  
  -Coinbase Developer Platform (CDP) for intelligent agent workflows.

  - OpenAI’s GPT-4o-mini model for AI responses.

- **Backend Infrastructure:**
  - Node.js with Express.js for API services.
  - WebSocket for real-time communication.
  - dotenv for environment variable management.

---

### **Key Features**

✅ **Seamless Reward Conversion** – Users can convert Flipkart and Amazon rewards to crypto.  
✅ **Zero-Knowledge Proof-Based Verification** – Ensures legitimacy without exposing sensitive user data.  
✅ **AI-Driven Automation** – Guides users through the process and triggers transactions.  
✅ **Secure On-Chain Transfers** – Crypto rewards are directly sent to verified wallets.  
✅ **Real-Time Updates via WebSockets** – Users receive immediate feedback on transaction status.

---

### **Potential Future Enhancements**

🚀 **Support for More Reward Programs** – Add platforms like **CRED Coins, Google Play Points, etc.**  
🚀 **Cross-Chain Reward Conversion** – Enable swaps across chains (Ethereum, Solana, etc.).  
🚀 **Automated Reward Staking** – Let users stake converted rewards for passive income.
