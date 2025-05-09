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
  const [failedATAs, setFailedATAs] = useState<Recipient[]>([]); // 실패한 ATA 리스트 (2차 실패: 생성 시도 후 실패)
  const [noATAs, setNoATAs] = useState<Recipient[]>([]); // ATA가 없는 리스트 (1차 실패: 처리되지 못한 계정들)
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [loadingDots, setLoadingDots] = useState(1);
  const [stopProcessing, setStopProcessing] = useState<boolean>(false); // 진행 중지 플래그 추가
  const [validRecipientsOnly, setValidRecipientsOnly] = useState<boolean>(false); // ATA가 있는 수령인만 표시 플래그
  const [showDownloadButtons, setShowDownloadButtons] = useState<boolean>(false); // 다운로드 버튼 표시 플래그
  
  // 토큰 전송 관련 상태 추가
  const [sentTokens, setSentTokens] = useState<Recipient[]>([]); // 토큰 전송 성공 리스트
  const [failedTokens, setFailedTokens] = useState<Recipient[]>([]); // 토큰 전송 실패 리스트
  const [isStep2Completed, setIsStep2Completed] = useState<boolean>(false); // Step2 완료 여부
  
  // 걸러진 지갑 주소 상태 추가
  const [filteredAddresses, setFilteredAddresses] = useState<{address: string; reason: string}[]>([]);

  // 청크 크기 상태 추가
  const [chunkSize, setChunkSize] = useState<number>(10);
  // 단일 처리 모드 상태 추가
  const [singleProcessMode, setSingleProcessMode] = useState<boolean>(false);

  // ref로 stopProcessing 상태를 추적하여 비동기 함수에서 최신 값 접근
  const stopProcessingRef = useRef<boolean>(false);
  
  // stopProcessing 상태가 변경될 때마다 ref 값도 업데이트
  useEffect(() => {
    stopProcessingRef.current = stopProcessing;
  }, [stopProcessing]);

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

  // 중복 제거 헬퍼 함수 추가
  const getUniqueRecipients = (recipients: Recipient[]): Recipient[] => {
    const uniqueMap = new Map<string, Recipient>();
    recipients.forEach(recipient => {
      uniqueMap.set(recipient.address, recipient);
    });
    return Array.from(uniqueMap.values());
  };

  // CSV 다운로드 함수
  const downloadCSV = (data: Recipient[], filename: string) => {
    // CSV 헤더 추가
    const csvContent = "address,amount\n" + 
      data.map(recipient => `${recipient.address},${recipient.amount}`).join("\n");
    
    // Blob 생성 및 다운로드
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 청크 단위로 ATA 생성 함수
  const createATAForChunk = async (
    connection: Connection,
    provider: PhantomProvider,
    tokenMintAddress: PublicKey,
    recipients: Recipient[],
    payer: PublicKey
  ): Promise<void> => {
    // 중지 요청이 있는지 먼저 확인 - ref 사용
    if (stopProcessingRef.current) {
      console.log("ATA creation for chunk skipped due to stop request");
      // 중지 요청이 있는 경우 해당 청크는 모두 실패로 처리
      // 이미 setNoATAs에 추가되어 있으므로 추가하지 않음
      return;
    }

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
      // 각 수령인 처리 전에도 중지 요청 확인 - ref 사용
      if (stopProcessingRef.current) {
        console.log("ATA creation for remaining recipients skipped due to stop request");
        return;
      }

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

      await delay(200); // 500ms에서 200ms로 단축
      
      // 지연 후에도 중지 확인
      if (stopProcessingRef.current) {
        return;
      }
    }

    // 중지 요청이 있으면 트랜잭션 전송 건너뜀 - ref 사용
    if (stopProcessingRef.current) {
      console.log("Transaction sending skipped due to stop request");
      // 중지 요청이 있는 경우 해당 청크는 모두 실패로 처리
      // 이미 setNoATAs에 추가되어 있으므로 추가하지 않음
      return;
    }

    // 트랜잭션 전송
    if (transaction.instructions.length > 0) {
      try {
        // 트랜잭션 서명 직전에 한번 더 확인 - ref 사용
        if (stopProcessingRef.current) {
          console.log("Transaction signing skipped due to stop request");
          // 중지 요청이 있는 경우 해당 청크는 모두 실패로 처리
          // 이미 setNoATAs에 추가되어 있으므로 추가하지 않음
          return;
        }
        
        const { signature } = await provider.signAndSendTransaction(transaction);
        console.log(`ATA creation transaction sent: ${signature}`);
        
        // 트랜잭션 확인 전에도 중지 요청 확인 - ref 사용
        if (stopProcessingRef.current) {
          console.log("Transaction confirmation skipped due to stop request");
          // 트랜잭션이 전송되었지만 중지 요청이 있는 경우, 모두 실패로 간주
          // 이미 setNoATAs에 추가되어 있으므로 추가하지 않음
          return;
        }
        
        await connection.confirmTransaction(signature, "confirmed");
        console.log(`ATA creation transaction confirmed: ${signature}`);
      } catch (error: any) {
        console.error("Failed to create ATAs:", error);
        // 실패한 경우, 해당 수령인의 ata를 undefined로 설정하고 실패 리스트에 추가
        const failedRecipients: Recipient[] = [];
        for (const recipient of recipients) {
          if (!recipient.ata) continue;
          
          // 중지 요청 확인 - ref 사용
          if (stopProcessingRef.current) {
            // 중지 요청이 있으면 남은 검증을 건너뛰고 모두 실패로 처리
            // 이미 setNoATAs에 추가되어 있으므로 추가하지 않음
            return;
          }
          
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
      setStopProcessing(false); // 중지 플래그 초기화
      stopProcessingRef.current = false; // ref도 초기화
      setFailedATAs([]); // 실패 목록 초기화
      setNoATAs([]); // ATA 없는 목록 초기화
      setShowDownloadButtons(false); // 다운로드 버튼 비활성화
      setFilteredAddresses([]); // 걸러진 지갑 주소 초기화
      setValidRecipientsOnly(false); // 필터링 플래그 초기화
      
      // 중지 전 상태를 저장하기 위한 변수들
      let currentRecipientsWithATA: Recipient[] = [];
      let currentSuccessfullyCreated: Recipient[] = [];

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
      
      // 원본 라인을 저장하여 필터링된 항목 추적
      const csvLines = text?.split("\n") || [];
      const filteredLines: {address: string; reason: string}[] = [];
      
      const parsedRecipients: Recipient[] = csvLines
        .map((line: any, index: any) => {
          const [address, amount] = line.split(",");
          if (!address?.trim() || !amount?.trim()) {
            filteredLines.push({
              address: line.trim() || "빈 행",
              reason: "주소 또는 금액 누락"
            });
            return null;
          }
          if (!isValidSolanaAddress(address.trim())) {
            filteredLines.push({
              address: address.trim(),
              reason: "유효하지 않은 솔라나 주소"
            });
            return null;
          }
          const parsedAmount = parseInt(amount.trim());
          if (isNaN(parsedAmount) || parsedAmount <= 0) {
            filteredLines.push({
              address: address.trim(),
              reason: `유효하지 않은 금액: ${amount.trim()}`
            });
            return null;
          }
          return { address: address.trim(), amount: parsedAmount };
        })
        .filter((recipient: any): recipient is Recipient => recipient !== null);

      // 걸러진 주소 목록 설정
      setFilteredAddresses(filteredLines);

      if (!parsedRecipients || parsedRecipients.length === 0) {
        alert("No valid recipients found in CSV file!");
        return;
      }

      // 디버깅 로그 추가
      console.log("parsedRecipients.length:", parsedRecipients.length);
      console.log("filteredLines.length:", filteredLines.length);
      setRecipients([]); // 초기화 (이전 데이터 지우기)
      setStatus(prev => [...prev, `총 ${parsedRecipients.length}명의 수령인이 확인되었습니다.`]);
      if (filteredLines.length > 0) {
        setStatus(prev => [...prev, `${filteredLines.length}개의 유효하지 않은 행이 걸러졌습니다.`]);
      }

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
        // 중지 요청이 있는지 확인
        if (stopProcessingRef.current) {
          setStatus(prev => [...prev, "프로세스가 사용자에 의해 중단되었습니다."]);
          break;
        }

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

      // 중지 요청이 있는지 다시 확인
      if (stopProcessingRef.current) {
        // 이미 ATA가 있는 수령인만 선택
        currentRecipientsWithATA = [...recipientsWithATA]; // 현재 상태 저장
        
        // 처리되지 못한 계정들을 noATAs에 설정
        setNoATAs(recipientsWithoutATA);
        
        setRecipients(recipientsWithATA);
        setStatus(prev => [...prev, 
          `프로세스가 중단되었습니다. ${recipientsWithATA.length}명의 ATA가 이미 있는 수령인만 선택되었습니다.`,
          `ATA가 없는 수령인 ${recipientsWithoutATA.length}명은 처리되지 않았습니다.`]);
        setIsATAInitialized(true); // 기존 ATA만 사용하므로 초기화된 것으로 간주
        setIsProcessing(false);
        setProgress(100); // 진행률 100%로 설정
        setShowDownloadButtons(true); // 다운로드 버튼 활성화
        return;
      }

      setStatus(prev => [
        ...prev,
        `ATA check completed: ${recipientsWithATA.length} recipients already have ATAs, ${recipientsWithoutATA.length} recipients need ATAs.`,
      ]);

      // 여기서 recipients를 중간 업데이트하여 UI에 ATA가 있는 수령인이 표시되도록 함
      setRecipients(recipientsWithATA);
      currentRecipientsWithATA = [...recipientsWithATA]; // 현재 상태 저장
      
      // 여기서 ATA가 없는 수령인 목록 설정 (1차 리스트)
      setNoATAs(recipientsWithoutATA);

      // 단계 2: ATA가 없는 지갑들에 대해 한 번에 생성
      if (recipientsWithoutATA.length > 0) {
        console.log("recipientsWithoutATA:", recipientsWithoutATA);
        setStatus(prev => [...prev, "Creating ATAs for recipients without ATAs..."]);
        
        // 단일 처리 모드일 경우 청크 크기를 1로 설정
        const effectiveChunkSize = singleProcessMode ? 1 : chunkSize;
        const totalChunks = Math.ceil(recipientsWithoutATA.length / effectiveChunkSize);

        // 디버깅 로그 추가
        console.log("청크 크기 설정:", effectiveChunkSize, singleProcessMode ? "(단일 처리 모드)" : "");
        console.log("총 청크 수:", totalChunks);
        console.log("처리해야 할 수령인 수:", recipientsWithoutATA.length);

        setStatus(prev => [...prev, `청크 크기: ${effectiveChunkSize}${singleProcessMode ? " (단일 처리 모드)" : ""}, 총 청크 수: ${totalChunks}`]);

        // 생성 과정에서 성공한 recipient 추적
        const successfullyCreated: Recipient[] = [];
        // 현재 처리 중인 청크 추적
        let currentChunk: Recipient[] = [];

        for (let i = 0; i < recipientsWithoutATA.length; i += effectiveChunkSize) {
          // 중지 요청이 있는지 확인
          if (stopProcessingRef.current) {
            // 현재 처리 중인 청크가 있다면 실패로 처리
            if (currentChunk.length > 0) {
              setNoATAs(prev => [...prev, ...currentChunk]);
            }
            
            // 남은 모든 수령인도 처리되지 않음으로 설정
            const remainingRecipients = recipientsWithoutATA.slice(i);
            setNoATAs(prev => [...prev, ...remainingRecipients]);
            
            setStatus(prev => [...prev, "ATA 생성이 사용자에 의해 중단되었습니다."]);
            break;
          }

          currentChunk = recipientsWithoutATA.slice(i, i + effectiveChunkSize);
          const currentChunkIndex = i / effectiveChunkSize + 1;

          try {
            await createATAForChunk(
              connection,
              provider,
              tokenMintAddress,
              currentChunk,
              senderPublicKey
            );
            
            // 중지 요청이 있다면 성공해도 추가하지 않음
            if (stopProcessingRef.current) {
              // 중지 요청이 발생했다면 이 청크는 성공했더라도 실패로 취급
              setNoATAs(prev => [...prev, ...currentChunk]);
              continue;
            }
            
            setStatus(prev => [
              ...prev,
              `Chunk ${currentChunkIndex}/${totalChunks} - ATA creation completed for ${currentChunk.length} recipients.`,
            ]);
            
            // 성공한 chunk는 successfullyCreated 배열에 추가
            const createdWithATA = currentChunk.filter(r => r.ata);
            successfullyCreated.push(...createdWithATA);
            
            // 성공한 수령인들을 recipients에 추가 (점진적 업데이트)
            // 중지 요청이 있는 경우 업데이트 건너뜀
            if (!stopProcessingRef.current) {
              setRecipients(prev => [...prev, ...createdWithATA]);
            }
            
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
          
          // 현재 청크 처리 완료
          currentChunk = [];
        }

        // 중지 요청이 있는지 다시 확인
        if (stopProcessingRef.current) {
          // 중지 발생 시 여기에서 recipients 목록을 재설정
          // 중지 이후에 추가된 수령인은 모두 제외하고 초기 상태로 되돌림
          setRecipients([...currentRecipientsWithATA]);
          
          // 생성 시도했지만 successfullyCreated에 없는 recipients 중 
          // 현재 failedATAs나 noATAs에 없는 수령인들도 모두 처리되지 않음으로 분류
          const unprocessedRecipients = recipientsWithoutATA.filter(
            r => !successfullyCreated.some(s => s.address === r.address) && 
                 !failedATAs.some(f => f.address === r.address) &&
                 !noATAs.some(n => n.address === r.address)
          );
          
          if (unprocessedRecipients.length > 0) {
            setNoATAs(prev => [...prev, ...unprocessedRecipients]);
          }
          
          setStatus(prev => [
            ...prev, 
            `중지됨: 중지 전까지 ${currentRecipientsWithATA.length}명의 수령인에 대해 ATA가 준비되었습니다.`,
            `중지 후 트랜잭션은 모두 실패로 처리되었습니다.`,
            `ATA 생성 실패: ${failedATAs.length}명, 처리되지 않음: ${noATAs.length}명`
          ]);
          // ATA 검증 단계 생략
          setStatus(prev => [...prev, "프로세스가 중단되었습니다. 중지 전까지 생성된 ATA만 사용합니다."]);
        } else {
          // ATA 생성 후 재확인
          setStatus(prev => [...prev, "Verifying ATA creation status..."]);
          const verificationFailed: Recipient[] = [];
          
          // 생성 시도했지만 successfullyCreated에 없는 recipients
          const recipientsToVerify = recipientsWithoutATA.filter(
            r => !successfullyCreated.some(s => s.address === r.address)
          );
          
          if (recipientsToVerify.length > 0) {
            for (let i = 0; i < recipientsToVerify.length; i += batchSize) {
              const batch = recipientsToVerify.slice(i, i + batchSize);
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
                    // 검증에 성공한 ATA를 recipients에 추가
                    recipient.ata = atas[index];
                    setRecipients(prev => [...prev, recipient]);
                  }
                });
              } catch (error: any) {
                console.error(`Failed to verify ATAs for batch ${i / batchSize + 1}:`, error);
                setStatus(prev => [...prev, `Failed to verify ATAs for batch ${i / batchSize + 1}: ${error.message}`]);
                // 에러 발생 시 해당 배치의 모든 수령인을 실패로 처리
                batch.forEach(recipient => verificationFailed.push(recipient));
              }
            }
          }

          if (verificationFailed.length > 0) {
            setFailedATAs(prev => [...prev, ...verificationFailed]);
            setStatus(prev => [
              ...prev,
              `ATA verification completed: ${verificationFailed.length} recipients failed to initialize ATAs.`,
            ]);
          }
          
          // 최종 수령인 목록 설정
          setStatus(prev => [
            ...prev,
            `Successfully initialized ATAs for ${recipientsWithATA.length + successfullyCreated.length} recipients.`,
          ]);
        }
      } else {
        setStatus(prev => [...prev, "All recipients already have ATAs. No creation needed."]);
        setProgress(100); // 모든 지갑에 ATA가 이미 있으면 100%로 설정
      }

      if (stopProcessingRef.current) {
        setStatus(prev => [...prev, "프로세스가 중단되었지만, ATA가 있는 수령인은 토큰 전송에 사용할 수 있습니다."]);
      } else {
        setStatus(prev => [...prev, "ATA initialization completed for all recipients."]);
        // 다운로드 버튼 활성화
        setShowDownloadButtons(true);
      }
      
      setIsATAInitialized(true); // ATA 초기화 완료 표시
    } catch (error: any) {
      console.error("ATA initialization failed:", error);
      setStatus(prev => [...prev, `Process failed: ${error.message}`]);
    } finally {
      setIsProcessing(false);
      setStopProcessing(false); // 중지 플래그 초기화
      setSingleProcessMode(false); // 단일 처리 모드 초기화
    }
  };

  // 처리 중지 함수 수정
  const stopProcess = () => {
    setStopProcessing(true);
    stopProcessingRef.current = true; // ref도 함께 업데이트
    setStatus(prev => [...prev, "프로세스 중단 요청이 접수되었습니다. 즉시 중단됩니다..."]);
    setStatus(prev => [...prev, "중단 중... 진행 중인 모든 트랜잭션은 실패로 처리됩니다."]);
    // 진행률 100%로 설정
    setProgress(100);
    // 다운로드 버튼 활성화
    setShowDownloadButtons(true);
  };

  // ATA가 있는 수신자만 필터링하는 함수
  const filterValidRecipients = () => {
    setValidRecipientsOnly(true);
    const validRecips = recipients.filter(r => r.ata);
    setRecipients(validRecips);
    setStatus(prev => [...prev, `${validRecips.length}명의 유효한 수령인(ATA 있음)만 선택되었습니다.`]);
    setIsATAInitialized(true); // ATA가 있는 수령인만 남았으므로 초기화된 것으로 간주
  };

  // 단일 처리 모드 토글 함수
  const toggleSingleProcessMode = () => {
    setSingleProcessMode(!singleProcessMode);
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
    setSentTokens([]); // 전송 성공 리스트 초기화
    setFailedTokens([]); // 전송 실패 리스트 초기화
    setIsStep2Completed(false); // Step2 완료 상태 초기화
    setStopProcessing(false); // 중지 플래그 초기화
    stopProcessingRef.current = false; // ref도 초기화
    setShowDownloadButtons(false); // 다운로드 버튼 비활성화

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

    // 토큰 전송에는 고정 청크 크기 사용 (원래 값으로 복원)
    const fixedChunkSize = 20; // 트랜잭션당 최대 20개 전송 (트랜잭션 크기 최적화)
    const totalChunks = Math.ceil(validRecipients.length / fixedChunkSize);

    // 디버깅 로그 추가
    console.log("전송 청크 크기(고정값):", fixedChunkSize);
    console.log("총 청크 수:", totalChunks);
    console.log("전송할 유효 수령인 수:", validRecipients.length);

    setStatus(prev => [...prev, `전송 청크 크기(고정값): ${fixedChunkSize}, 총 청크 수: ${totalChunks}`]);

    // 현재 처리 중인 청크 추적
    let currentChunk: Recipient[] = [];

    // 토큰 전송
    setStatus(prev => [...prev, "Starting token transfer for all valid recipients..."]);
    for (let i = 0; i < validRecipients.length; i += fixedChunkSize) {
      // 중지 요청이 있는지 확인
      if (stopProcessingRef.current) {
        setStatus(prev => [...prev, "토큰 전송이 사용자에 의해 중단되었습니다."]);
        // 남은 수령인들 모두 실패로 처리
        const remainingRecipients = validRecipients.slice(i);
        setFailedTokens(prev => [...prev, ...remainingRecipients]);
        break;
      }

      currentChunk = validRecipients.slice(i, i + fixedChunkSize);
      const currentChunkIndex = i / fixedChunkSize + 1;

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

        for (const recipient of currentChunk) {
          if (!recipient.ata) {
            setStatus(prev => [
              ...prev,
              `Chunk ${currentChunkIndex}/${totalChunks} - Skipping ${recipient.address}: ATA not initialized.`,
            ]);
            // 실패 리스트에 추가
            setFailedTokens(prev => [...prev, recipient]);
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

        // 중지 요청이 있는지 확인
        if (stopProcessingRef.current) {
          setStatus(prev => [...prev, "토큰 전송이 사용자에 의해 중단되었습니다."]);
          // 현재 청크 수령인들 모두 실패로 처리
          setFailedTokens(prev => [...prev, ...currentChunk]);
          break;
        }

        if (transaction.instructions.length > 0) {
          // 트랜잭션 서명 직전에 중지 요청 확인
          if (stopProcessingRef.current) {
            setFailedTokens(prev => [...prev, ...currentChunk]);
            break;
          }

          const { signature } = await provider.signAndSendTransaction(transaction);
          setStatus(prev => [
            ...prev,
            `Chunk ${currentChunkIndex}/${totalChunks} - Transaction sent: ${signature}`,
          ]);

          // 트랜잭션 확인 로직 개선
          let retries = 3;
          let confirmed = false;
          
          while (retries > 0 && !stopProcessingRef.current) {
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
              
              // 전송 성공한 수령인들을 sentTokens에 추가
              setSentTokens(prev => [...prev, ...currentChunk]);
              confirmed = true;
              break;
            } catch (error: any) {
              retries--;
              if (retries === 0) {
                throw error;
              }
              await new Promise(resolve => setTimeout(resolve, 5000)); // 5초 대기 후 재시도
            }
          }
          
          // 중지되었거나 확인에 실패한 경우 실패 처리
          if (stopProcessingRef.current || !confirmed) {
            setFailedTokens(prev => [...prev, ...currentChunk]);
            if (!confirmed) {
              setStatus(prev => [
                ...prev,
                `Chunk ${currentChunkIndex}/${totalChunks} - Transaction confirmation failed after retries.`,
              ]);
            }
          }
        }

        // 진행률 계산: 청크 단위로 업데이트
        const transferProgress = (currentChunkIndex / totalChunks) * 100;
        console.log(`Transfer Progress: ${transferProgress}%`);
        setProgress(transferProgress);
        
        // 현재 청크 처리 완료
        currentChunk = [];
      } catch (error: any) {
        console.error(`Chunk ${currentChunkIndex} token transfer failed:`, error);
        setStatus(prev => [
          ...prev,
          `Chunk ${currentChunkIndex}/${totalChunks} - Token transfer failed: ${error.message}`,
        ]);
        
        // 실패한 청크의 수령인들을 실패 리스트에 추가
        setFailedTokens(prev => [...prev, ...currentChunk]);
      }
    }

    if (stopProcessingRef.current) {
      setStatus(prev => [...prev, "프로세스가 중단되었지만, 전송된 토큰은 블록체인에 기록되었습니다."]);
      // 중지 시 진행률 100%로 설정
      setProgress(100);
    } else {
      setStatus(prev => [
        ...prev, 
        `Token transfer completed: ${sentTokens.length} successful, ${failedTokens.length} failed.`
      ]);
    }
    
    setIsStep2Completed(true);
    setShowDownloadButtons(true); // 다운로드 버튼 활성화
    setIsProcessing(false);
    setStopProcessing(false);
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
    <div className="h-screen overflow-y-auto bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 상단 컨트롤 섹션 */}
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

            <div className="flex items-center">
              <button
                onClick={toggleSingleProcessMode}
                disabled={isProcessing}
                className={`px-6 py-2 ${singleProcessMode ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-500 hover:bg-gray-600'} text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors`}
              >
                ATA 단일 처리 모드 {singleProcessMode ? '켜짐' : '꺼짐'}
              </button>
              <span className="ml-3 text-sm text-gray-600">
                트랜잭션 실패가 잦은 경우 단일 처리 모드를 활성화하세요. ATA를 한 번에 하나씩 생성합니다. 
                (Step1 시작 전에 활성화해야 합니다)
              </span>
            </div>

            <div className="flex justify-center gap-4 flex-wrap">
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
              {isProcessing && (
                <button
                  onClick={stopProcess}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  중지
                </button>
              )}
              {(!isProcessing && recipients.length > 0 && !validRecipientsOnly) && (
                <button
                  onClick={filterValidRecipients}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  ATA 있는 수령인만 선택
                </button>
              )}
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
            
            {/* 엑셀 다운로드 버튼 섹션 */}
            {showDownloadButtons && (
              <div className="mt-4 flex justify-center gap-3 flex-wrap">
                {!isStep2Completed ? (
                  <>
                    <button
                      onClick={() => downloadCSV(recipients, "ata_success_recipients.csv")}
                      disabled={recipients.length === 0}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-green-600 transition-colors flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      ATA 있는 수령인 저장
                    </button>
                    <button
                      onClick={() => downloadCSV(getUniqueRecipients(noATAs), "ata_missing_recipients.csv")}
                      disabled={noATAs.length === 0}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      ATA 없는 수령인 저장
                    </button>
                    <button
                      onClick={() => downloadCSV(failedATAs, "ata_failed_recipients.csv")}
                      disabled={failedATAs.length === 0}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-red-600 transition-colors flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      ATA 생성 실패 저장
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => downloadCSV(sentTokens, "token_sent_recipients.csv")}
                      disabled={sentTokens.length === 0}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-green-600 transition-colors flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      토큰 전송 성공 저장
                    </button>
                    <button
                      onClick={() => downloadCSV(failedTokens, "token_failed_recipients.csv")}
                      disabled={failedTokens.length === 0}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-red-600 transition-colors flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      토큰 전송 실패 저장
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 상태 섹션 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Status:</h2>
          <div className="max-h-[300px] overflow-y-auto">
            <ul className="space-y-2">
              {status.map((msg, idx) => (
                <li key={idx} className="text-lg text-gray-700">{msg}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 수령인 섹션 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              {!isStep2Completed ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-700">현재 선택된 수령인: {recipients.length}명</h2>
                  {showDownloadButtons && recipients.length > 0 && (
                    <button 
                      onClick={() => downloadCSV(recipients, "ata_success_recipients.csv")}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      title="CSV로 다운로드"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-green-600">토큰 전송 성공: {sentTokens.length}명</h2>
                  {showDownloadButtons && sentTokens.length > 0 && (
                    <button 
                      onClick={() => downloadCSV(sentTokens, "token_sent_recipients.csv")}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      title="CSV로 다운로드"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              <ul className="space-y-2">
                {!isStep2Completed ? (
                  recipients.map((recipient, idx) => (
                    <li key={idx} className="text-md text-gray-700">
                      <div className="flex justify-between">
                        <span className="truncate w-3/4">{recipient.address}</span>
                        <span className="font-medium">{recipient.amount}</span>
                      </div>
                      <div className="text-xs text-green-600">ATA 있음</div>
                    </li>
                  ))
                ) : (
                  sentTokens.map((recipient, idx) => (
                    <li key={idx} className="text-md text-green-700">
                      <div className="flex justify-between">
                        <span className="truncate w-3/4">{recipient.address}</span>
                        <span className="font-medium">{recipient.amount}</span>
                      </div>
                      <div className="text-xs text-green-600">토큰 전송 성공</div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          {/* 토큰 전송 실패 리스트(Step2) 또는 ATA 없는 수령인 리스트(Step1) */}
          {isStep2Completed ? (
            failedTokens.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-red-600">토큰 전송 실패: {failedTokens.length}명</h2>
                  {showDownloadButtons && (
                    <button 
                      onClick={() => downloadCSV(failedTokens, "token_failed_recipients.csv")}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      title="CSV로 다운로드"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <ul className="space-y-2">
                    {failedTokens.map((recipient, idx) => (
                      <li key={idx} className="text-md text-red-600">
                        <div className="flex justify-between">
                          <span className="truncate w-3/4">{recipient.address}</span>
                          <span className="font-medium">{recipient.amount}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          ) : (
            getUniqueRecipients(noATAs).length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-orange-500">ATA가 없는 수령인: {getUniqueRecipients(noATAs).length}명</h2>
                  {showDownloadButtons && (
                    <button 
                      onClick={() => downloadCSV(getUniqueRecipients(noATAs), "ata_missing_recipients.csv")}
                      className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                      title="CSV로 다운로드"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <ul className="space-y-2">
                    {getUniqueRecipients(noATAs).map((recipient, idx) => (
                      <li key={idx} className="text-md text-orange-600">
                        <div className="flex justify-between">
                          <span className="truncate w-3/4">{recipient.address}</span>
                          <span className="font-medium">{recipient.amount}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          )}
        </div>

        {/* 실패한 ATA 초기화 (2차 실패) 또는 걸러진 주소 리스트 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 실패한 ATA 초기화 (2차 실패) */}
          {!isStep2Completed && failedATAs.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-red-600">ATA 생성 실패: {failedATAs.length}명</h2>
                {showDownloadButtons && (
                  <button 
                    onClick={() => downloadCSV(failedATAs, "ata_failed_recipients.csv")}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    title="CSV로 다운로드"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <ul className="space-y-2">
                  {failedATAs.map((recipient, idx) => (
                    <li key={idx} className="text-md text-red-600">
                      <div className="flex justify-between">
                        <span className="truncate w-3/4">{recipient.address}</span>
                        <span className="font-medium">{recipient.amount}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 걸러진 지갑 주소 리스트 */}
          {!isStep2Completed && filteredAddresses.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-600">CSV에서 걸러진 항목: {filteredAddresses.length}개</h2>
                {showDownloadButtons && (
                  <button 
                    onClick={() => {
                      const csvContent = "address,reason\n" + 
                        filteredAddresses.map(item => `${item.address},${item.reason}`).join("\n");
                      
                      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.setAttribute("href", url);
                      link.setAttribute("download", "filtered_addresses.csv");
                      link.style.visibility = "hidden";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                    title="CSV로 다운로드"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <ul className="space-y-2">
                  {filteredAddresses.map((item, idx) => (
                    <li key={idx} className="text-md text-gray-600">
                      <div className="flex justify-between">
                        <span className="truncate w-3/4">{item.address}</span>
                        <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded-full">{item.reason}</span>
                      </div>
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

