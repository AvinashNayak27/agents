import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";
import { QRCode } from "react-qr-code";
import { useState } from "react";

export default function App() {
  const [requestUrl, setRequestUrl] = useState(null);

  async function initializeReclaimForFlipkart() {
    try {
      // Step 1: Fetch the configuration from your backend
      const response = await fetch(
        "http://localhost:3000/reclaim/generate-config-flipkart"
      );
      const { reclaimProofRequestConfig } = await response.json();

      // Step 2: Initialize the ReclaimProofRequest with the received configuration
      const reclaimProofRequest = await ReclaimProofRequest.fromJsonString(
        reclaimProofRequestConfig
      );

      reclaimProofRequest.addContext(
        "address",
        "0xf7d4041e751E0b4f6eA72Eb82F2b200D278704A4"
      );

      // Step 3: Generate the request URL for the verification process
      const requestUrl = await reclaimProofRequest.getRequestUrl();
      setRequestUrl(requestUrl);

      // Step 4: Start the verification session
      await reclaimProofRequest.startSession({
        onSuccess: (proofs) => {
          if (proofs) {
            if (typeof proofs === "string") {
              // Custom callback URL case: proof is sent to callback URL
              console.log("SDK Message:", proofs);
            } else if (typeof proofs !== "string") {
              // Default callback URL case: proof object received directly
              console.log("Proof received:", proofs?.claimData.context);
            }
          }
          // Handle successful verification (e.g., update UI, send to backend)
        },
        onError: (error) => {
          console.error("Verification failed", error);
          // Handle verification failure (e.g., show error message)
        },
      });

      console.log("Request URL:", requestUrl);
    } catch (error) {
      console.error("Error initializing Reclaim:", error);
      // Handle initialization error (e.g., show error message)
    }
  }

  async function initializeReclaimForAmazon() {
    try {
      const response = await fetch(
        "http://localhost:3000/reclaim/generate-config-amazon"
      );
      const { reclaimProofRequestConfig } = await response.json();

      const reclaimProofRequest = await ReclaimProofRequest.fromJsonString(
        reclaimProofRequestConfig
      );
      reclaimProofRequest.addContext(
        "address",
        "0xf7d4041e751E0b4f6eA72Eb82F2b200D278704A4"
      );

      const requestUrl = await reclaimProofRequest.getRequestUrl();
      setRequestUrl(requestUrl);
      // Step 4: Start the verification session
      await reclaimProofRequest.startSession({
        onSuccess: (proofs) => {
          if (proofs) {
            if (typeof proofs === "string") {
              // Custom callback URL case: proof is sent to callback URL
              console.log("SDK Message:", proofs);
            } else if (typeof proofs !== "string") {
              // Default callback URL case: proof object received directly
              console.log("Proof received:", proofs?.claimData.context);
            }
          }
          // Handle successful verification (e.g., update UI, send to backend)
        },
        onError: (error) => {
          console.error("Verification failed", error);
          // Handle verification failure (e.g., show error message)
        },
      });

      console.log("Request URL:", requestUrl);
    } catch (error) {
      console.error("Error initializing Reclaim:", error);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-3xl font-bold underline">Hello world!</h1>
      <button
        onClick={initializeReclaimForFlipkart}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Generate QR Code for Flipkart
      </button>
      <button
        onClick={initializeReclaimForAmazon}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Generate QR Code for Amazon
      </button>
      {requestUrl && <QRCode value={requestUrl} size={256} />}
    </div>
  );
}
