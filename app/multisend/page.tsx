"use client";

import { useEffect, useRef, useState } from "react";
import { createPhantom, Position } from "@phantom/wallet-sdk";
import { ComputeBudgetProgram, Connection, PublicKey, Transaction, AccountInfo } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
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
  ata?: PublicKey; // 초기화된 ATA 주소를 저장
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
  const [recipients, setRecipients] = useState<Recipient[]>([]); // 수령인 목록 상태로 저장
  const [senderATA, setSenderATA] = useState<PublicKey | null>(null); // 발신자의 ATA 저장
  const [isATAInitialized, setIsATAInitialized] = useState<boolean>(false); // ATA 초기화 완료 여부

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

  const isValidSolanaAddress = (address: string): boolean => {
    try {
      new PublicKey(address);
      return true;
    } catch (error) {
      return false;
    }
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 청크 단위로 ATA 생성 함수
  const createATAForChunk = async (
    connection: Connection,
    provider: PhantomProvider,
    tokenMintAddress: PublicKey,
    recipients: Recipient[],
    payer: PublicKey
  ): Promise<void> => {
    const transaction = new Transaction();
    const recentBlockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = recentBlockhash.blockhash;
    transaction.feePayer = payer;

    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 0, // 우선순위 수수료 0으로 설정
      })
    );

    console.log("recipients:", recipients);
    // 각 수령인에 대해 ATA 생성 인스트럭션 추가
    for (const recipient of recipients) {
      const walletAddress = new PublicKey(recipient.address);
      const ata = await getAssociatedTokenAddress(
        tokenMintAddress,
        walletAddress,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // 이미 ATA가 설정된 경우 건너뜀 (안전장치)
      if (recipient.ata) {
        console.log(`ATA already set for ${walletAddress.toString()}: ${recipient.ata.toString()}`);
        continue;
      }

      console.log(`Adding instruction to create ATA for ${walletAddress.toString()}...`);
      transaction.add(
        createAssociatedTokenAccountInstruction(
          payer,
          ata,
          walletAddress,
          tokenMintAddress,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
      recipient.ata = ata;

      await delay(500);
    }

    // 트랜잭션 전송
    if (transaction.instructions.length > 0) {
      try {
        const { signature } = await provider.signAndSendTransaction(transaction);
        console.log(`ATA creation transaction sent: ${signature}`);
        await connection.confirmTransaction(signature, "confirmed");
        console.log(`ATA creation transaction confirmed: ${signature}`);
      } catch (error: any) {
        console.error("Failed to create ATAs:", error);
        // 실패한 경우, 해당 수령인의 ata를 undefined로 설정
        for (const recipient of recipients) {
          if (!recipient.ata) continue;
          const ataInfo = await connection.getAccountInfo(recipient.ata);
          if (!ataInfo || ataInfo.owner.toString() !== TOKEN_PROGRAM_ID.toString()) {
            console.error(`ATA ${recipient.ata.toString()} initialization failed.`);
            recipient.ata = undefined;
          }
        }
      }
    }
  };

  // 단계 1: 모든 수령인의 ATA 초기화
  const initializeAllATAs = async () => {
    if (!publicKey || !file) {
      alert("Please connect wallet and upload a file!");
      return;
    }

    setStatus([]); // 상태 초기화
    setProgress(0); // 진행률 초기화
    setIsATAInitialized(false); // ATA 초기화 상태 초기화

    const provider = phantomRef.current as any;
    const connection = new Connection(
      "https://late-cosmological-sanctuary.solana-mainnet.quiknode.pro/e98f88b1e34a9a219301e325e6d145f748077c67/"
    );
    const senderPublicKey = provider.publicKey!;
    const tokenMintAddress = new PublicKey("93eQWWgcaSMriusbjR3v3e2Me5dM17JJbPmyxVKPKZXZ"); // 불닭코인 주소

    // CSV 파일 파싱 (예: "address,amount" 형식)
    let text: any;
    if (file && "text" in file) {
      text = (await file.text()).trim();
    }
    const parsedRecipients: Recipient[] = text
      ?.split("\n")
      .map((line: any, index: any) => {
        const [address, amount] = line.split(",");
        if (!address?.trim() || !amount?.trim()) {
          console.log(`Skipping invalid line ${index + 1}: ${line}`);
          return null;
        }
        if (!isValidSolanaAddress(address.trim())) {
          console.log(`Skipping invalid Solana address in line ${index + 1}: ${line}`);
          return null;
        }
        const parsedAmount = parseInt(amount.trim());
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          console.log(`Skipping invalid amount in line ${index + 1}: ${line}`);
          return null;
        }
        return { address: address.trim(), amount: parsedAmount };
      })
      .filter((recipient: any): recipient is Recipient => recipient !== null);

    if (!parsedRecipients || parsedRecipients.length === 0) {
      alert("No valid recipients found in CSV file!");
      return;
    }

    // 디버깅 로그 추가
    console.log("recipients.length:", parsedRecipients.length);
    setRecipients(parsedRecipients); // 수령인 목록 저장

    // 발신자의 ATA 초기화
    const senderRecipient: any = { address: senderPublicKey.toString() };
    console.log("senderRecipient:", senderRecipient);
    try {
      await createATAForChunk(
        connection,
        provider,
        tokenMintAddress,
        [senderRecipient],
        senderPublicKey
      );
      if (!senderRecipient.ata) {
        throw new Error("Sender ATA initialization failed.");
      }
      setSenderATA(senderRecipient.ata); // 발신자의 ATA 저장
      setStatus(prev => [...prev, "Sender ATA initialized successfully."]);
    } catch (error: any) {
      console.error("Failed to initialize sender ATA:", error);
      setStatus(prev => [...prev, `Failed to initialize sender ATA: ${error.message}`]);
      return;
    }

    // 단계 1: 모든 수령인의 ATA 존재 여부 확인 (getMultipleAccounts 사용)
    setStatus(prev => [...prev, "Checking existing ATAs for all recipients..."]);
    const recipientsWithATA: Recipient[] = [];
    const recipientsWithoutATA: Recipient[] = [];
    const batchSize = 100; // 한 번에 100개 계정 조회 (Solana RPC 제한)

    for (let i = 0; i < parsedRecipients.length; i += batchSize) {
      const batch = parsedRecipients.slice(i, i + batchSize);
      try {
        // 각 수령인의 ATA 주소 계산
        const atas = await Promise.all(
          batch.map(recipient =>
            getAssociatedTokenAddress(
              tokenMintAddress,
              new PublicKey(recipient.address),
              false,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          )
        );

        // getMultipleAccountsInfo로 한 번에 조회
        const accountsInfo = await connection.getMultipleAccountsInfo(atas, "confirmed");
        accountsInfo.forEach((accountInfo: any | null, index: number) => {
          const recipient = batch[index];
          const walletAddress = new PublicKey(recipient.address);
          if (accountInfo && accountInfo.owner.toString() === TOKEN_PROGRAM_ID.toString()) {
            console.log(`ATA already exists for ${walletAddress.toString()}: ${atas[index].toString()}`);
            recipient.ata = atas[index];
            recipientsWithATA.push(recipient);
          } else {
            console.log(`No ATA found for ${walletAddress.toString()}. Will create later.`);
            recipientsWithoutATA.push(recipient);
          }
        });
      } catch (error: any) {
        console.error(`Failed to check ATAs for batch ${i / batchSize + 1}:`, error);
        setStatus(prev => [...prev, `Failed to check ATAs for batch ${i / batchSize + 1}: ${error.message}`]);
        // 에러 발생 시 해당 배치의 모든 수령인을 생성 대상으로 분류
        batch.forEach(recipient => recipientsWithoutATA.push(recipient));
      }

      // 진행률 업데이트
      const checkedRecipients = Math.min(i + batchSize, parsedRecipients.length);
      const checkProgress = (checkedRecipients / parsedRecipients.length) * 50;
      console.log(`Check Progress: ${checkProgress}%`);
      setProgress(checkProgress);

      // QuikNode 요청 제한을 고려하여 배치 간 200ms 대기
      await delay(200);
    }

    setStatus(prev => [
      ...prev,
      `ATA check completed: ${recipientsWithATA.length} recipients already have ATAs, ${recipientsWithoutATA.length} recipients need ATAs.`,
    ]);

    // 단계 2: ATA가 없는 지갑들에 대해 한 번에 생성
    if (recipientsWithoutATA.length > 0) {
      console.log("recipientsWithoutATA:", recipientsWithoutATA);
      setStatus(prev => [...prev, "Creating ATAs for recipients without ATAs..."]);
      const chunkSize = 10; // 트랜잭션당 최대 1개 전송 (트랜잭션 크기 최적화)
      const totalChunks = Math.ceil(recipientsWithoutATA.length / chunkSize);

      // 디버깅 로그 추가
      console.log("recipientsWithoutATA.length:", recipientsWithoutATA.length);
      console.log("chunkSize:", chunkSize);
      console.log("totalChunks:", totalChunks);

      for (let i = 0; i < recipientsWithoutATA.length; i += chunkSize) {
        const chunk = recipientsWithoutATA.slice(i, i + chunkSize);
        const currentChunkIndex = i / chunkSize + 1;

        try {
          await createATAForChunk(
            connection,
            provider,
            tokenMintAddress,
            chunk,
            senderPublicKey
          );
          setStatus(prev => [
            ...prev,
            `Chunk ${currentChunkIndex}/${totalChunks} - ATA creation completed for ${chunk.length} recipients.`,
          ]);
        } catch (error: any) {
          console.error(`Chunk ${currentChunkIndex} ATA creation failed:`, error);
          setStatus(prev => [
            ...prev,
            `Chunk ${currentChunkIndex}/${totalChunks} - ATA creation failed: ${error.message}`,
          ]);
        }

        // 진행률 계산: 생성 단계는 50%에서 100%까지
        const createProgress = 50 + (currentChunkIndex / totalChunks) * 50;
        console.log(`Create Progress: ${createProgress}%`);
        setProgress(createProgress);
      }
    } else {
      setStatus(prev => [...prev, "All recipients already have ATAs. No creation needed."]);
      setProgress(100); // 모든 지갑에 ATA가 이미 있으면 100%로 설정
    }

    setStatus(prev => [...prev, "ATA initialization completed for all recipients."]);
    setIsATAInitialized(true); // ATA 초기화 완료 표시
  };

  // 단계 2: 토큰 전송
  const transferTokens = async () => {
    if (!publicKey || !file) {
      alert("Please connect wallet and upload a file!");
      return;
    }

    if (!isATAInitialized) {
      alert("Please initialize ATAs first by clicking 'Send Tokens step1'!");
      return;
    }

    if (!senderATA) {
      alert("Sender ATA is not initialized!");
      return;
    }

    if (recipients.length === 0) {
      alert("No recipients available. Please initialize ATAs first!");
      return;
    }

    setStatus([]); // 상태 초기화
    setProgress(0); // 진행률 초기화

    const provider = phantomRef.current as any;
    const connection = new Connection(
      "https://late-cosmological-sanctuary.solana-mainnet.quiknode.pro/e98f88b1e34a9a219301e325e6d145f748077c67/"
    );
    const senderPublicKey = provider.publicKey!;

    const chunkSize = 20; // 트랜잭션당 최대 50개 전송 (트랜잭션 크기 최적화)
    const totalChunks = Math.ceil(recipients.length / chunkSize);

    // 디버깅 로그 추가
    console.log("recipients.length:", recipients.length);
    console.log("chunkSize:", chunkSize);
    console.log("totalChunks:", totalChunks);

    // 토큰 전송
    setStatus(prev => [...prev, "Starting token transfer for all recipients..."]);
    for (let i = 0; i < recipients.length; i += chunkSize) {
      const chunk = recipients.slice(i, i + chunkSize);
      const currentChunkIndex = i / chunkSize + 1;

      try {
        const transaction = new Transaction();
        const recentBlockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = recentBlockhash.blockhash;
        transaction.feePayer = senderPublicKey;

        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 0, // 우선순위 수수료 0으로 설정
          })
        );

        for (const recipient of chunk) {
          if (!recipient.ata) {
            setStatus(prev => [
              ...prev,
              `Chunk ${currentChunkIndex}/${totalChunks} - Skipping ${recipient.address}: ATA not initialized.`,
            ]);
            continue;
          }

          transaction.add(
            createTransferInstruction(
              senderATA,
              recipient.ata,
              senderPublicKey,
              recipient.amount * 1000000,
              [],
              TOKEN_PROGRAM_ID
            )
          );
        }

        if (transaction.instructions.length > 0) {
          const { signature } = await provider.signAndSendTransaction(transaction);
          await connection.confirmTransaction(signature, "confirmed");
          setStatus(prev => [
            ...prev,
            `Chunk ${currentChunkIndex}/${totalChunks} - Token transfer completed: ${signature}`,
          ]);
        }

        // 진행률 계산: 청크 단위로 업데이트
        const transferProgress = (currentChunkIndex / totalChunks) * 100;
        console.log(`Transfer Progress: ${transferProgress}%`);
        setProgress(transferProgress);
      } catch (error: any) {
        console.error(`Chunk ${currentChunkIndex} token transfer failed:`, error);
        setStatus(prev => [
          ...prev,
          `Chunk ${currentChunkIndex}/${totalChunks} - Token transfer failed: ${error.message}`,
        ]);
      }
    }

    setStatus(prev => [...prev, "Token transfer completed for all recipients."]);
  };

  useEffect(() => {
    initPhantom(); // Phantom Embedded Wallet 초기화 (선택적)
    connectWallet(); // Phantom 확장과 연결
  }, []);

  useEffect(() => {
    console.log("file", file);
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target?.files[0]);
  };

  return (
    <div className="inset-0 z-50 flex h-screen flex-col items-center justify-center px-10 text-3xl overflow-y-scroll">
      <div className="mt-4">
        <label>Upload CSV (address,amount per line):</label>
        <input type="file" accept=".csv" onChange={handleFileChange} className="mt-2" />
      </div>
      <div className="text-center text-xl font-semibold text-gray-700">
        Public Key: {publicKey || "Not connected"}
      </div>
      <button
        onClick={initializeAllATAs}
        disabled={!publicKey || !file}
        className="mt-4 bg-blue-500 text-white p-2 rounded disabled:bg-gray-400"
      >
        Send Tokens step1 (Initialize ATAs)
      </button>
      <button
        onClick={transferTokens}
        disabled={!publicKey || !file || !isATAInitialized}
        className="mt-4 bg-blue-500 text-white p-2 rounded disabled:bg-gray-400"
      >
        Send Tokens step2 (Transfer Tokens)
      </button>

      <div className="mt-4 fixed top-20">
        <progress value={progress} max="100" className="w-full" />
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
