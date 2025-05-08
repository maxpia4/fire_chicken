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
import { log } from "console";

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
  const [failedATAs, setFailedATAs] = useState<Recipient[]>([]); // 실패한 ATA 리스트
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [loadingDots, setLoadingDots] = useState(1);

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
        // 실패한 경우, 해당 수령인의 ata를 undefined로 설정하고 실패 리스트에 추가
        const failedRecipients: Recipient[] = [];
        for (const recipient of recipients) {
          if (!recipient.ata) continue;
          const ataInfo = await connection.getAccountInfo(recipient.ata);
          if (!ataInfo || ataInfo.owner.toString() !== TOKEN_PROGRAM_ID.toString()) {
            console.error(`ATA ${recipient.ata.toString()} initialization failed.`);
            recipient.ata = undefined;
            failedRecipients.push(recipient);
          }
        }
        setFailedATAs(prev => [...prev, ...failedRecipients]);
      }
    }
  };

  // 단계 1: 모든 수령인의 ATA 초기화
  const initializeAllATAs = async () => {
    if (!publicKey || !file) {
      alert("Please connect wallet and upload a file!");
      return;
    }

    try {
      setIsProcessing(true);
      setStatus([]);
      setProgress(0);
      setIsATAInitialized(false);

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

        // ATA 생성 후 재확인
        setStatus(prev => [...prev, "Verifying ATA creation status..."]);
        const verificationFailed: Recipient[] = [];
        const verificationSuccess: Recipient[] = [];
        
        for (let i = 0; i < recipientsWithoutATA.length; i += batchSize) {
          const batch = recipientsWithoutATA.slice(i, i + batchSize);
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
              if (!accountInfo || accountInfo.owner.toString() !== TOKEN_PROGRAM_ID.toString()) {
                console.log(`ATA verification failed for ${recipient.address}`);
                verificationFailed.push(recipient);
              } else {
                recipient.ata = atas[index];
                verificationSuccess.push(recipient);
              }
            });
          } catch (error: any) {
            console.error(`Failed to verify ATAs for batch ${i / batchSize + 1}:`, error);
            setStatus(prev => [...prev, `Failed to verify ATAs for batch ${i / batchSize + 1}: ${error.message}`]);
            // 에러 발생 시 해당 배치의 모든 수령인을 실패로 처리
            batch.forEach(recipient => verificationFailed.push(recipient));
          }
        }

        if (verificationFailed.length > 0) {
          setFailedATAs(verificationFailed);
          setStatus(prev => [
            ...prev,
            `ATA verification completed: ${verificationFailed.length} recipients failed to initialize ATAs.`,
          ]);
        }

        // 성공한 ATA들과 기존에 있던 ATA들을 합쳐서 recipients 업데이트
        const successfulRecipients = [...recipientsWithATA, ...verificationSuccess];
        setRecipients(successfulRecipients);
        
        setStatus(prev => [
          ...prev,
          `Successfully initialized ATAs for ${successfulRecipients.length} recipients.`,
        ]);
      } else {
        setStatus(prev => [...prev, "All recipients already have ATAs. No creation needed."]);
        setProgress(100); // 모든 지갑에 ATA가 이미 있으면 100%로 설정
      }

      setStatus(prev => [...prev, "ATA initialization completed for all recipients."]);
      setIsATAInitialized(true); // ATA 초기화 완료 표시
    } catch (error: any) {
      console.error("ATA initialization failed:", error);
      setStatus(prev => [...prev, `Process failed: ${error.message}`]);
    } finally {
      setIsProcessing(false);
    }
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

    setIsProcessing(true);
    setStatus([]);
    setProgress(0);

    // ATA가 없는 수령인 제외
    const validRecipients = recipients.filter(recipient => recipient.ata);
    if (validRecipients.length === 0) {
      alert("No valid recipients with initialized ATAs found!");
      return;
    }

    setStatus(prev => [...prev, `Starting token transfer for ${validRecipients.length} valid recipients...`]);
    if (failedATAs.length > 0) {
      setStatus(prev => [...prev, `Skipping ${failedATAs.length} recipients with failed ATA initialization.`]);
    }

    const provider = phantomRef.current as any;
    const connection = new Connection(
      "https://late-cosmological-sanctuary.solana-mainnet.quiknode.pro/e98f88b1e34a9a219301e325e6d145f748077c67/"
    );
    const senderPublicKey = provider.publicKey!;

    const chunkSize = 20; // 트랜잭션당 최대 50개 전송 (트랜잭션 크기 최적화)
    const totalChunks = Math.ceil(validRecipients.length / chunkSize);

    // 디버깅 로그 추가
    console.log("validRecipients.length:", validRecipients.length);
    console.log("chunkSize:", chunkSize);
    console.log("totalChunks:", totalChunks);

    // 토큰 전송
    setStatus(prev => [...prev, "Starting token transfer for all valid recipients..."]);
    for (let i = 0; i < validRecipients.length; i += chunkSize) {
      const chunk = validRecipients.slice(i, i + chunkSize);
      const currentChunkIndex = i / chunkSize + 1;

      try {
        const transaction = new Transaction();
        const recentBlockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = recentBlockhash.blockhash;
        transaction.feePayer = senderPublicKey;

        // 우선순위 수수료 설정 (1 SOL = 1,000,000,000 lamports)
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 100000, // 우선순위 수수료 증가
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
        console.log("transaction.instructions.length:", transaction.instructions.length);

        if (transaction.instructions.length > 0) {
          const { signature } = await provider.signAndSendTransaction(transaction);
          setStatus(prev => [
            ...prev,
            `Chunk ${currentChunkIndex}/${totalChunks} - Transaction sent: ${signature}`,
          ]);

          // 트랜잭션 확인 로직 개선
          let retries = 3;
          while (retries > 0) {
            try {
              const confirmation = await connection.confirmTransaction({
                signature,
                blockhash: recentBlockhash.blockhash,
                lastValidBlockHeight: recentBlockhash.lastValidBlockHeight
              }, 'confirmed');
              
              if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${confirmation.value.err}`);
              }
              
              setStatus(prev => [
                ...prev,
                `Chunk ${currentChunkIndex}/${totalChunks} - Token transfer confirmed: ${signature}`,
              ]);
              break;
            } catch (error: any) {
              retries--;
              if (retries === 0) {
                throw error;
              }
              await new Promise(resolve => setTimeout(resolve, 5000)); // 5초 대기 후 재시도
            }
          }
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

    setStatus(prev => [...prev, "Token transfer completed for all valid recipients."]);
    setIsProcessing(false);
  };

  useEffect(() => {
    initPhantom(); // Phantom Embedded Wallet 초기화 (선택적)
    connectWallet(); // Phantom 확장과 연결
  }, []);

  useEffect(() => {
    console.log("file", file);
  }, [file]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      interval = setInterval(() => {
        setLoadingDots(prev => prev === 5 ? 1 : prev + 1);
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target?.files[0]);
  };

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center mb-4">
      <span className="ml-2 text-blue-500 font-medium">
        처리 중입니다.<br/>
        잠시만 기다려주세요{'.'.repeat(loadingDots)}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-lg font-medium text-gray-700">Upload CSV (address,amount per line):</label>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange} 
                className="mt-2 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>
            
            <div className="text-center text-xl font-semibold text-gray-700">
              Public Key: {publicKey || "Not connected"}
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={initializeAllATAs}
                disabled={!publicKey || !file || isProcessing}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
              >
                Send Tokens step1 (Initialize ATAs)
              </button>
              <button
                onClick={transferTokens}
                disabled={!publicKey || !file || !isATAInitialized || isProcessing}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
              >
                Send Tokens step2 (Transfer Tokens)
              </button>
            </div>

            <div className="mt-6">
              {isProcessing && (
                <div className="mb-4">
                  <LoadingSpinner />
                </div>
              )}
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-center mt-2 text-gray-600">{progress.toFixed(2)}% Complete</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Status:</h2>
            <div className="max-h-[500px] overflow-y-auto">
              <ul className="space-y-2">
                {status.map((msg, idx) => (
                  <li key={idx} className="text-lg text-gray-700">{msg}</li>
                ))}
              </ul>
            </div>
          </div>

          {failedATAs.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-red-600">Failed ATA Initializations:</h2>
              <div className="max-h-[500px] overflow-y-auto">
                <ul className="space-y-2">
                  {failedATAs.map((recipient, idx) => (
                    <li key={idx} className="text-lg text-red-600">
                      <div>Address: {recipient.address}</div>
                      <div>Amount: {recipient.amount}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
