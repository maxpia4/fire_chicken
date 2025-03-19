"use client";

import { useEffect, useRef, useState } from "react";
import { createPhantom, Position } from "@phantom/wallet-sdk";
import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

// Phantom Provider 타입 정의
interface PhantomProvider {
  isPhantom: boolean;
  isConnected: boolean;
  publicKey: PublicKey | null;
  connect: () => Promise<void>;
  signAndSendTransaction: (transaction: Transaction) => Promise<{ signature: string }>;
  disconnect: () => Promise<void>;
}
interface Recipient {
  address: string;
  amount: number;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

export default function Soon() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const phantomRef = useRef<PhantomProvider | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string[]>([]);
  const [progress, setProgress] = useState<number>(0);

  // Phantom 초기화 (옵션)
  const initPhantom = async () => {
    try {
      const phantom = await createPhantom({
        position: Position.bottomRight,
        hideLauncherBeforeOnboarded: false,
        namespace: "my-app",
      });
      console.log("Phantom initialized:", phantom);
      phantom.show();
    } catch (error) {
      console.error("Phantom initialization failed:", error);
    }
  };

  // Provider 가져오기
  const getProvider = (): PhantomProvider => {
    if ("solana" in window) {
      const provider = window.solana;
      if (provider?.isPhantom) return provider;
    }
    throw new Error("Phantom Wallet not found");
  };

  // 지갑 연결
  const connectWallet = async () => {
    const provider = getProvider();
    try {
      if (!provider.isConnected) {
        await provider.connect();
      }
      setPublicKey(provider.publicKey?.toString() || null);
      phantomRef.current = provider; // provider 저장
      console.log("Provider connected:", provider);
      console.log("Public Key:", provider.publicKey?.toString());
    } catch (error) {
      console.error("Phantom connection failed:", error);
    }
  };

  const sendToMultipleWallets = async () => {

    const provider = phantomRef.current as any;
    const connection = new Connection("https://late-cosmological-sanctuary.solana-mainnet.quiknode.pro/e98f88b1e34a9a219301e325e6d145f748077c67/");
    const senderPublicKey = provider.publicKey!;
    const tokenMintAddress = new PublicKey("93eQWWgcaSMriusbjR3v3e2Me5dM17JJbPmyxVKPKZXZ"); // 불닭코인 주소

    // CSV 파일 파싱 (예: "address,amount" 형식)
    let text
    if ( file && "text" in file) {
      text = await file?.text();
    }
    const recipients: Recipient[] = text?.split("\n").map(line => {
      const [address, amount] = line.split(",");
      return { address: address.trim(), amount: parseInt(amount.trim()) };
    }) as any;

    const chunkSize = 20; // 트랜잭션당 최대 20개 전송
    const totalChunks = Math.ceil(recipients.length / chunkSize);

    for (let i = 0; i < recipients.length; i += chunkSize) {
      const chunk = recipients.slice(i, i + chunkSize);
      const transaction = new Transaction();
      const recentBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = recentBlockhash.blockhash;
      transaction.feePayer = senderPublicKey;

      try {
        for (const recipient of chunk) {
          const recipientPubkey = new PublicKey(recipient.address);
          const senderATA = await getAssociatedTokenAddress(tokenMintAddress, senderPublicKey);
          const recipientATA = await getAssociatedTokenAddress(tokenMintAddress, recipientPubkey);

          transaction.add(
            createTransferInstruction(
              senderATA,
              recipientATA,
              senderPublicKey,
              recipient.amount * 1000000,
              [],
              TOKEN_PROGRAM_ID
            )
          );
        }

        const { signature } = await provider.signAndSendTransaction(transaction);
        setStatus(prev => [...prev, `Chunk ${i / chunkSize + 1}/${totalChunks} sent: ${signature}`]);
        setProgress((i + chunkSize) / recipients.length * 100);
      } catch (error:any) {
        console.error(`Chunk ${i / chunkSize + 1} failed:`, error);
        setStatus(prev => [...prev, `Chunk ${i / chunkSize + 1} failed: ${error.message}`]);
      }
    }
  };

  useEffect(() => {
    initPhantom(); // Phantom Embedded Wallet 초기화 (선택적)
    connectWallet(); // Phantom 확장과 연결
  }, []);


  useEffect(() => {
    console.log("file",file)
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target?.files[0]);
  };

  return (
    <div className="inset-0 z-50 flex h-screen flex-col items-center justify-center px-10 text-3xl">
      <div className="mt-4">
        <label>Upload CSV (address,amount per line):</label>
        <input type="file" accept=".csv" onChange={handleFileChange} className="mt-2"/>
      </div>
      <div className="text-center text-xl font-semibold text-gray-700">
        Public Key: {publicKey || "Not connected"}
      </div>
      <button
        onClick={sendToMultipleWallets}
        disabled={!publicKey || !file}
        className="mt-4 bg-blue-500 text-white p-2 rounded disabled:bg-gray-400"
      >
        Send Tokens
      </button>

      <div className="mt-4">
        <progress value={progress} max="100" className="w-full"/>
        <p>{progress.toFixed(2)}% Complete</p>
      </div>

      <div className="mt-4">
        <h2>Status:</h2>
        <ul>
          {status.map((msg, idx) => (
            <li key={idx}>{msg}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
