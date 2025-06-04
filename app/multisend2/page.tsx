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
  
  // 3단계(재시도) 관련 상태 추가
  const [retrySuccessTokens, setRetrySuccessTokens] = useState<Recipient[]>([]); // 재시도 성공 리스트
  const [retryFailedTokens, setRetryFailedTokens] = useState<Recipient[]>([]); // 재시도 실패 리스트
  const [isStep3Completed, setIsStep3Completed] = useState<boolean>(false); // Step3 완료 여부
  
  // 원스텝 처리 관련 상태 추가
  const [oneStepSuccessTokens, setOneStepSuccessTokens] = useState<Recipient[]>([]); // 원스텝 성공 리스트
  const [oneStepFailedTokens, setOneStepFailedTokens] = useState<Recipient[]>([]); // 원스텝 실패 리스트
  const [isOneStepCompleted, setIsOneStepCompleted] = useState<boolean>(false); // 원스텝 완료 여부
  
  // 걸러진 지갑 주소 상태 추가
  const [filteredAddresses, setFilteredAddresses] = useState<{address: string; reason: string}[]>([]);

  // 청크 크기 상태 추가
  const [chunkSize, setChunkSize] = useState<number>(10);
  // 단일 처리 모드 상태 추가
  const [singleProcessMode, setSingleProcessMode] = useState<boolean>(false);
  // 통합 처리 모드 상태 추가
  const [combinedMode, setCombinedMode] = useState<boolean>(false);

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

  // 통합 처리 모드 토글 함수
  const toggleCombinedMode = () => {
    setCombinedMode(!combinedMode);
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
    
    // 2단계 완료 후 ATA 없는 계정과 ATA 생성 실패 계정을 failedTokens에 추가
    const ataFailedRecipients = [...noATAs, ...failedATAs];
    if (ataFailedRecipients.length > 0) {
      setStatus(prev => [...prev, `ATA 관련 실패한 ${ataFailedRecipients.length}개 계정을 Step3 재시도 목록에 추가했습니다.`]);
      setFailedTokens(prev => [...prev, ...ataFailedRecipients]);
    }
  };

  // ATA 생성과 토큰 전송을 한 번에 수행하는 통합 함수
  const initializeAndTransferTokens = async () => {
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
      setStatus(prev => [...prev, "발신자의 ATA를 확인하고 초기화합니다..."]);
      const senderAta = await getAssociatedTokenAddress(
        tokenMintAddress,
        senderPublicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      // 발신자 ATA 확인
      const senderAtaInfo = await connection.getAccountInfo(senderAta);
      if (!senderAtaInfo || senderAtaInfo.owner.toString() !== TOKEN_PROGRAM_ID.toString()) {
        // 발신자 ATA가 없으면 생성
        try {
          const transaction = new Transaction();
          transaction.add(
            createAssociatedTokenAccountInstruction(
              senderPublicKey,
              senderAta,
              senderPublicKey,
              tokenMintAddress,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
          
          const { signature } = await provider.signAndSendTransaction(transaction);
          await connection.confirmTransaction(signature, "confirmed");
          setStatus(prev => [...prev, "발신자 ATA가 성공적으로 초기화되었습니다."]);
        } catch (error: any) {
          console.error("Failed to initialize sender ATA:", error);
          setStatus(prev => [...prev, `발신자 ATA 초기화 실패: ${error.message}`]);
          return;
        }
      } else {
        setStatus(prev => [...prev, "발신자의 ATA가 이미 존재합니다."]);
      }
      
      setSenderATA(senderAta);

      // 단일 처리 모드일 경우 청크 크기를 1로 설정
      const effectiveChunkSize = singleProcessMode ? 1 : Math.min(5, chunkSize); // 통합 모드에서는 청크 크기를 더 작게 제한
      
      // 처리할 총 청크 수 계산
      const totalChunks = Math.ceil(parsedRecipients.length / effectiveChunkSize);
      
      setStatus(prev => [
        ...prev,
        `통합 처리 모드로 진행합니다. (ATA 생성 + 토큰 전송)`,
        `청크 크기: ${effectiveChunkSize}${singleProcessMode ? " (단일 처리 모드)" : ""}, 총 청크 수: ${totalChunks}`
      ]);

      // 성공한 수령인과 실패한 수령인 추적
      const successfulRecipients: Recipient[] = [];
      const failedRecipients: Recipient[] = [];
      
      // 청크 단위로 처리
      for (let i = 0; i < parsedRecipients.length; i += effectiveChunkSize) {
        // 중지 요청이 있는지 확인
        if (stopProcessingRef.current) {
          setStatus(prev => [...prev, "프로세스가 사용자에 의해 중단되었습니다."]);
          break;
        }
        
        const currentChunk = parsedRecipients.slice(i, i + effectiveChunkSize);
        const currentChunkIndex = Math.floor(i / effectiveChunkSize) + 1;
        
        setStatus(prev => [
          ...prev,
          `청크 ${currentChunkIndex}/${totalChunks} 처리 중... (${currentChunk.length}명)`
        ]);
        
        // 각 수령인에 대해 ATA 확인 및 트랜잭션 생성
        const transaction = new Transaction();
        const recentBlockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = recentBlockhash.blockhash;
        transaction.feePayer = senderPublicKey;
        
        // 우선순위 수수료 설정
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 100000, // 우선순위 수수료 증가
          })
        );
        
        // 청크 내 각 수령인 처리
        for (const recipient of currentChunk) {
          try {
            const recipientPublicKey = new PublicKey(recipient.address);
            const recipientAta = await getAssociatedTokenAddress(
              tokenMintAddress,
              recipientPublicKey,
              false,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            );
            
            // 수령인의 ATA 확인
            const ataInfo = await connection.getAccountInfo(recipientAta);
            
            // ATA가 없으면 생성 인스트럭션 추가
            if (!ataInfo || ataInfo.owner.toString() !== TOKEN_PROGRAM_ID.toString()) {
              transaction.add(
                createAssociatedTokenAccountInstruction(
                  senderPublicKey,
                  recipientAta,
                  recipientPublicKey,
                  tokenMintAddress,
                  TOKEN_PROGRAM_ID,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                )
              );
            }
            
            // 토큰 전송 인스트럭션 추가
            transaction.add(
              createTransferInstruction(
                senderAta,
                recipientAta,
                senderPublicKey,
                recipient.amount * 1000000,
                [],
                TOKEN_PROGRAM_ID
              )
            );
            
            // ATA 설정 (트랜잭션 서명 전에 설정)
            recipient.ata = recipientAta;
            
          } catch (error) {
            console.error(`Failed to prepare transaction for recipient ${recipient.address}:`, error);
            failedRecipients.push(recipient);
          }
        }
        
        // 트랜잭션 서명 및 전송
        if (transaction.instructions.length > 0) {
          try {
            // 중지 요청 확인
            if (stopProcessingRef.current) {
              failedRecipients.push(...currentChunk);
              break;
            }
            
            const { signature } = await provider.signAndSendTransaction(transaction);
            setStatus(prev => [
              ...prev,
              `청크 ${currentChunkIndex}/${totalChunks} - 트랜잭션 전송됨: ${signature}`
            ]);
            
            // 트랜잭션 확인
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
                  `청크 ${currentChunkIndex}/${totalChunks} - 트랜잭션 확인됨: ${signature}`
                ]);
                
                // 성공한 수령인들 추가
                successfulRecipients.push(...currentChunk);
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
              failedRecipients.push(...currentChunk);
              if (!confirmed) {
                setStatus(prev => [
                  ...prev,
                  `청크 ${currentChunkIndex}/${totalChunks} - 트랜잭션 확인 실패 (재시도 후)`
                ]);
              }
            }
          } catch (error: any) {
            console.error(`Chunk ${currentChunkIndex} failed:`, error);
            setStatus(prev => [
              ...prev,
              `청크 ${currentChunkIndex}/${totalChunks} - 실패: ${error.message}`
            ]);
            
            // 실패한 청크의 수령인들을 실패 리스트에 추가
            failedRecipients.push(...currentChunk);
          }
        }
        
        // 진행률 계산
        const progressValue = (currentChunkIndex / totalChunks) * 100;
        setProgress(progressValue);
        
        // 200ms 대기 (네트워크 요청 제한 고려)
        await delay(200);
      }
      
      // 처리 완료 후 상태 업데이트
      // 성공한 수령인들을 수령인 목록 및 전송 성공 목록에 추가
      setRecipients(successfulRecipients);
      setSentTokens(successfulRecipients);
      
      // 실패한 수령인들을 실패 목록에 추가
      setFailedTokens(failedRecipients);
      
      // 중지 여부에 따른 메시지 설정
      if (stopProcessingRef.current) {
        setStatus(prev => [
          ...prev,
          "프로세스가 중단되었지만, 전송된 토큰은 블록체인에 기록되었습니다."
        ]);
      } else {
        setStatus(prev => [
          ...prev, 
          `통합 처리 완료: 성공 ${successfulRecipients.length}명, 실패 ${failedRecipients.length}명`
        ]);
      }
      
      // 모든 처리 완료 표시
      setIsATAInitialized(true);
      setIsStep2Completed(true);
      setIsStep3Completed(true);
      setIsOneStepCompleted(true); // 원스텝 처리 완료 상태로 설정
      setShowDownloadButtons(true);
    } catch (error: any) {
      console.error("Combined process failed:", error);
      setStatus(prev => [...prev, `프로세스 실패: ${error.message}`]);
    } finally {
      setIsProcessing(false);
      setStopProcessing(false);
      setSingleProcessMode(false);
      setProgress(100); // 진행률 100%로 설정
    }
  };

  // 실패한 토큰 전송 항목만 원스텝으로 재시도하는 함수
  const retryFailedTransfers = async () => {
    if (!publicKey || !file) {
      alert("지갑을 연결하고 파일을 업로드해주세요!");
      return;
    }

    if (failedTokens.length === 0) {
      alert("재시도할 실패 항목이 없습니다!");
      return;
    }

    try {
      setIsProcessing(true);
      setStatus([]);
      setProgress(0);
      setStopProcessing(false); // 중지 플래그 초기화
      stopProcessingRef.current = false; // ref도 초기화
      setShowDownloadButtons(false); // 다운로드 버튼 비활성화
      setRetrySuccessTokens([]); // 재시도 성공 리스트 초기화
      setRetryFailedTokens([]); // 재시도 실패 리스트 초기화
      setIsStep3Completed(false); // Step3 완료 상태 초기화
      
      const provider = phantomRef.current as any;
      const connection = new Connection(
        "https://late-cosmological-sanctuary.solana-mainnet.quiknode.pro/e98f88b1e34a9a219301e325e6d145f748077c67/"
      );
      const senderPublicKey = provider.publicKey!;
      const tokenMintAddress = new PublicKey("93eQWWgcaSMriusbjR3v3e2Me5dM17JJbPmyxVKPKZXZ"); // 불닭코인 주소

      // 발신자의 ATA 확인
      setStatus(prev => [...prev, "발신자의 ATA를 확인합니다..."]);
      const senderAta = await getAssociatedTokenAddress(
        tokenMintAddress,
        senderPublicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      // 발신자 ATA 확인
      const senderAtaInfo = await connection.getAccountInfo(senderAta);
      if (!senderAtaInfo || senderAtaInfo.owner.toString() !== TOKEN_PROGRAM_ID.toString()) {
        alert("발신자 ATA가 없습니다. 먼저 ATA를 초기화해주세요.");
        setIsProcessing(false);
        return;
      }
      
      setSenderATA(senderAta);
      
      // 재시도 대상 복사 (원본 배열을 변경하지 않기 위해)
      const recipientsToRetry = [...failedTokens];
      // 성공, 실패 추적 배열
      const successfulRecipients: Recipient[] = [];
      const failedRecipients: Recipient[] = [];
      
      setStatus(prev => [...prev, `총 ${recipientsToRetry.length}개의 항목에 대해 재시도를 시작합니다...`]);
      
      // 각 실패 항목에 대해 순차적으로 처리
      for (let i = 0; i < recipientsToRetry.length; i++) {
        // 중지 요청 확인
        if (stopProcessingRef.current) {
          setStatus(prev => [...prev, "프로세스가 사용자에 의해 중단되었습니다."]);
          // 남은 항목들을 모두 실패로 처리
          failedRecipients.push(...recipientsToRetry.slice(i));
          break;
        }
        
        const recipient = recipientsToRetry[i];
        const recipientPublicKey = new PublicKey(recipient.address);
        
        try {
          setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] 수령인 ${recipient.address} 처리 중...`]);
          
          // ATA 확인 및 생성
          const recipientAta = await getAssociatedTokenAddress(
            tokenMintAddress,
            recipientPublicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );
          
          // ATA 존재 여부 확인
          const ataInfo = await connection.getAccountInfo(recipientAta);
          
          // 처리 방법 결정: 원래 방식으로 시도하고 실패 시 대체 방법 시도
          let success = false;
          
          // 첫 번째 시도: 원래 방식 (ATA 생성 + 토큰 전송)
          if (!success) {
            try {
              if (!ataInfo || ataInfo.owner.toString() !== TOKEN_PROGRAM_ID.toString()) {
                setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] 방법 1: 통합 트랜잭션으로 ATA 생성 및 토큰 전송 시도...`]);
              } else {
                setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] 방법 1: ATA 확인됨, 토큰 전송만 시도...`]);
              }
              
              const transaction = new Transaction();
              const recentBlockhash = await connection.getLatestBlockhash();
              transaction.recentBlockhash = recentBlockhash.blockhash;
              transaction.feePayer = senderPublicKey;
              
              // 수수료 증액으로 우선순위 상향
              transaction.add(
                ComputeBudgetProgram.setComputeUnitPrice({
                  microLamports: 500000, // 높은 우선순위 설정
                })
              );
              
              // ATA가 없으면 생성 인스트럭션 추가
              if (!ataInfo || ataInfo.owner.toString() !== TOKEN_PROGRAM_ID.toString()) {
                transaction.add(
                  createAssociatedTokenAccountInstruction(
                    senderPublicKey,
                    recipientAta,
                    recipientPublicKey,
                    tokenMintAddress,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                  )
                );
              }
              
              // 토큰 전송 인스트럭션 추가
              transaction.add(
                createTransferInstruction(
                  senderAta,
                  recipientAta,
                  senderPublicKey,
                  recipient.amount * 1000000,
                  [],
                  TOKEN_PROGRAM_ID
                )
              );
              
              // 트랜잭션 전송
              const { signature } = await provider.signAndSendTransaction(transaction);
              setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] 통합 트랜잭션 전송됨: ${signature}`]);
              
              // 트랜잭션 확인 (재시도 포함)
              let retries = 3;
              while (retries > 0) {
                try {
                  await connection.confirmTransaction({
                    signature,
                    blockhash: recentBlockhash.blockhash,
                    lastValidBlockHeight: recentBlockhash.lastValidBlockHeight
                  }, "confirmed");
                  
                  setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] 통합 처리 성공!`]);
                  success = true;
                  break;
                } catch (error: any) {
                  retries--;
                  if (retries <= 0) throw error;
                  await delay(2000); // 2초 대기 후 재시도
                  setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] 트랜잭션 확인 재시도 중...`]);
                }
              }
            } catch (error: any) {
              console.error(`Method 1 failed for ${recipient.address}:`, error);
              setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] 방법 1 실패: ${error.message}`]);
            }
          }
          
          // 두 번째 시도: 2단계로 분리 (실패 시)
          if (!success) {
            try {
              setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] 방법 2: 단계별 처리 시도 중...`]);
              
              // 1) ATA가 없으면 생성
              if (!ataInfo || ataInfo.owner.toString() !== TOKEN_PROGRAM_ID.toString()) {
                setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] ATA 생성 시도...`]);
                const ataTransaction = new Transaction();
                const ataBlockhash = await connection.getLatestBlockhash();
                ataTransaction.recentBlockhash = ataBlockhash.blockhash;
                ataTransaction.feePayer = senderPublicKey;
                
                // 더 높은 우선순위 설정
                ataTransaction.add(
                  ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: 1000000, // 매우 높은 우선순위
                  })
                );
                
                ataTransaction.add(
                  createAssociatedTokenAccountInstruction(
                    senderPublicKey,
                    recipientAta,
                    recipientPublicKey,
                    tokenMintAddress,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                  )
                );
                
                const { signature: ataSig } = await provider.signAndSendTransaction(ataTransaction);
                setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] ATA 생성 트랜잭션 전송됨: ${ataSig}`]);
                
                // 최대 5초까지 대기하며 확인
                let confirmed = false;
                for (let retry = 0; retry < 3; retry++) {
                  try {
                    await connection.confirmTransaction({
                      signature: ataSig,
                      blockhash: ataBlockhash.blockhash,
                      lastValidBlockHeight: ataBlockhash.lastValidBlockHeight
                    }, "confirmed");
                    confirmed = true;
                    break;
                  } catch (error) {
                    await delay(2000); // 2초 대기
                  }
                }
                
                if (!confirmed) {
                  // ATA가 실제로 생성되었는지 확인
                  const newAtaInfo = await connection.getAccountInfo(recipientAta);
                  if (!newAtaInfo || newAtaInfo.owner.toString() !== TOKEN_PROGRAM_ID.toString()) {
                    throw new Error("ATA creation could not be confirmed");
                  }
                }
                
                setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] ATA 생성 완료 또는 확인됨`]);
              }
              
              // 2) 토큰 전송
              // ATA 존재 여부 다시 확인 (성공했는지 확실히 하기 위해)
              const finalAtaInfo = await connection.getAccountInfo(recipientAta);
              if (!finalAtaInfo || finalAtaInfo.owner.toString() !== TOKEN_PROGRAM_ID.toString()) {
                throw new Error("ATA still not available after creation attempt");
              }
              
              setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] 토큰 전송 시도...`]);
              
              // 토큰 전송 트랜잭션
              const tokenTransaction = new Transaction();
              const tokenBlockhash = await connection.getLatestBlockhash();
              tokenTransaction.recentBlockhash = tokenBlockhash.blockhash;
              tokenTransaction.feePayer = senderPublicKey;
              
              // 더 높은 우선순위 설정
              tokenTransaction.add(
                ComputeBudgetProgram.setComputeUnitPrice({
                  microLamports: 1000000, // 매우 높은 우선순위
                })
              );
              
              tokenTransaction.add(
                createTransferInstruction(
                  senderAta,
                  recipientAta,
                  senderPublicKey,
                  recipient.amount * 1000000,
                  [],
                  TOKEN_PROGRAM_ID
                )
              );
              
              const { signature: tokenSig } = await provider.signAndSendTransaction(tokenTransaction);
              setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] 토큰 전송 트랜잭션 전송됨: ${tokenSig}`]);
              
              // 트랜잭션 확인
              await connection.confirmTransaction({
                signature: tokenSig,
                blockhash: tokenBlockhash.blockhash,
                lastValidBlockHeight: tokenBlockhash.lastValidBlockHeight
              }, "confirmed");
              
              setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] 단계별 처리 성공!`]);
              success = true;
            } catch (error: any) {
              console.error(`Method 2 failed for ${recipient.address}:`, error);
              setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] 방법 2 실패: ${error.message}`]);
            }
          }
          
          // 처리 결과에 따라 성공/실패 배열에 추가
          if (success) {
            successfulRecipients.push(recipient);
            setRetrySuccessTokens(prev => [...prev, recipient]);
            setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] ${recipient.address}에 대한 처리 성공!`]);
          } else {
            failedRecipients.push(recipient);
            setRetryFailedTokens(prev => [...prev, recipient]);
            setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] ${recipient.address}에 대한 모든 시도 실패`]);
          }
        } catch (error: any) {
          console.error(`Processing failed for ${recipient.address}:`, error);
          setStatus(prev => [...prev, `[${i+1}/${recipientsToRetry.length}] 처리 실패: ${error.message}`]);
          failedRecipients.push(recipient);
          // 실시간으로 실패 목록 업데이트
          setRetryFailedTokens(prev => [...prev, recipient]);
        }
        
        // 진행률 업데이트
        const progress = ((i + 1) / recipientsToRetry.length) * 100;
        setProgress(progress);
        
        // QuikNode 요청 제한을 고려하여 각 처리 간 200ms 대기
        await delay(200);
      }
      
      // 결과 업데이트
      setSentTokens(prev => [...prev, ...successfulRecipients]);
      // 실패 목록 업데이트 (기존 failedTokens에서 성공한 항목 제거)
      setFailedTokens(prev => 
        prev.filter(failed => 
          !successfulRecipients.some(success => success.address === failed.address)
        )
      );
      
      setStatus(prev => [
        ...prev,
        `재시도 완료: ${successfulRecipients.length}개 성공, ${failedRecipients.length}개 실패`
      ]);
      
      if (stopProcessingRef.current) {
        setStatus(prev => [...prev, "프로세스가 중단되었지만, 전송된 토큰은 블록체인에 기록되었습니다."]);
      }
      
      setIsStep3Completed(true); // Step3 완료 상태로 설정
      setShowDownloadButtons(true);
    } catch (error: any) {
      console.error("Failed to retry failed transfers:", error);
      setStatus(prev => [...prev, `Retry process failed: ${error.message}`]);
    } finally {
      setIsProcessing(false);
      setStopProcessing(false);
      setProgress(100); // 진행률 100%로 설정
    }
  };

  // 바로 단일 처리 진행 함수 추가
  const directSingleProcess = async () => {
    if (!publicKey || !file) {
      alert("지갑을 연결하고 파일을 업로드해주세요!");
      return;
    }

    try {
      setIsProcessing(true);
      setStatus([]);
      setProgress(0);
      setStopProcessing(false); // 중지 플래그 초기화
      stopProcessingRef.current = false; // ref도 초기화
      setShowDownloadButtons(false); // 다운로드 버튼 비활성화
      
      // 모든 상태 초기화
      setRecipients([]);
      setSentTokens([]);
      setFailedTokens([]);
      setNoATAs([]);
      setFailedATAs([]);
      setRetrySuccessTokens([]); // 재시도 성공 리스트 초기화
      setRetryFailedTokens([]); // 재시도 실패 리스트 초기화
      setOneStepSuccessTokens([]); // 원스텝 성공 리스트 초기화
      setOneStepFailedTokens([]); // 원스텝 실패 리스트 초기화
      setFilteredAddresses([]);
      setIsATAInitialized(false);
      setIsStep2Completed(false);
      setIsStep3Completed(false);
      setIsOneStepCompleted(false); // 원스텝 완료 상태 초기화
      
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
      } else {
        alert("파일을 읽을 수 없습니다!");
        setIsProcessing(false);
        return;
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
        alert("CSV 파일에서 유효한 수령인을 찾을 수 없습니다!");
        setIsProcessing(false);
        return;
      }

      setStatus(prev => [
        ...prev, 
        `총 ${parsedRecipients.length}명의 수령인이 확인되었습니다.`,
        `${filteredLines.length}개의 유효하지 않은 행이 걸러졌습니다.`,
        `단일 처리 모드로 진행합니다. 각 수령인마다 ATA 확인/생성 및 토큰 전송을 독립적으로 처리합니다.`
      ]);
      
      // 발신자의 ATA 확인
      setStatus(prev => [...prev, "발신자의 ATA를 확인합니다..."]);
      const senderAta = await getAssociatedTokenAddress(
        tokenMintAddress,
        senderPublicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      // 발신자 ATA 확인
      const senderAtaInfo = await connection.getAccountInfo(senderAta);
      if (!senderAtaInfo || senderAtaInfo.owner.toString() !== TOKEN_PROGRAM_ID.toString()) {
        // 발신자 ATA 생성 시도
        try {
          setStatus(prev => [...prev, "발신자 ATA가 없습니다. 생성을 시도합니다..."]);
          const senderAtaTransaction = new Transaction();
          senderAtaTransaction.add(
            createAssociatedTokenAccountInstruction(
              senderPublicKey,
              senderAta,
              senderPublicKey,
              tokenMintAddress,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
          
          const { signature: senderAtaSig } = await provider.signAndSendTransaction(senderAtaTransaction);
          await connection.confirmTransaction(senderAtaSig, "confirmed");
          setStatus(prev => [...prev, "발신자 ATA가 성공적으로 생성되었습니다."]);
        } catch (error: any) {
          setStatus(prev => [...prev, `발신자 ATA 생성 실패: ${error.message}`]);
          alert("발신자 ATA 생성에 실패했습니다. 프로세스를 중단합니다.");
          setIsProcessing(false);
          return;
        }
      } else {
        setStatus(prev => [...prev, "발신자 ATA가 확인되었습니다."]);
      }
      
      setSenderATA(senderAta);
      
      // 성공, 실패 추적 배열
      const successfulRecipients: Recipient[] = [];
      const failedRecipients: Recipient[] = [];
      
      // 각 수령인에 대해 단일 처리
      for (let i = 0; i < parsedRecipients.length; i++) {
        // 중지 요청 확인
        if (stopProcessingRef.current) {
          setStatus(prev => [...prev, "프로세스가 사용자에 의해 중단되었습니다."]);
          // 남은 항목들을 모두 실패로 처리
          failedRecipients.push(...parsedRecipients.slice(i));
          break;
        }
        
        const recipient = parsedRecipients[i];
        const recipientPublicKey = new PublicKey(recipient.address);
        
        try {
          setStatus(prev => [...prev, `[${i+1}/${parsedRecipients.length}] 수령인 ${recipient.address} 처리 중...`]);
          
          // ATA 확인 및 생성
          const recipientAta = await getAssociatedTokenAddress(
            tokenMintAddress,
            recipientPublicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );
          
          // ATA 존재 여부 확인
          const ataInfo = await connection.getAccountInfo(recipientAta);
          
          // 처리 방법 결정: 원래 방식으로 시도하고 실패 시 대체 방법 시도
          let success = false;
          
          // 첫 번째 시도: 통합 트랜잭션 방식
          try {
            if (!ataInfo || ataInfo.owner.toString() !== TOKEN_PROGRAM_ID.toString()) {
              setStatus(prev => [...prev, `[${i+1}/${parsedRecipients.length}] 통합 트랜잭션으로 ATA 생성 및 토큰 전송 시도...`]);
            } else {
              setStatus(prev => [...prev, `[${i+1}/${parsedRecipients.length}] ATA 있음, 토큰 전송만 시도...`]);
            }
            
            const transaction = new Transaction();
            const recentBlockhash = await connection.getLatestBlockhash();
            transaction.recentBlockhash = recentBlockhash.blockhash;
            transaction.feePayer = senderPublicKey;
            
            // 수수료 설정
            transaction.add(
              ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 500000, // 높은 우선순위 설정
              })
            );
            
            // ATA가 없으면 생성 인스트럭션 추가
            if (!ataInfo || ataInfo.owner.toString() !== TOKEN_PROGRAM_ID.toString()) {
              transaction.add(
                createAssociatedTokenAccountInstruction(
                  senderPublicKey,
                  recipientAta,
                  recipientPublicKey,
                  tokenMintAddress,
                  TOKEN_PROGRAM_ID,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                )
              );
            }
            
            // 토큰 전송 인스트럭션 추가
            transaction.add(
              createTransferInstruction(
                senderAta,
                recipientAta,
                senderPublicKey,
                recipient.amount * 1000000,
                [],
                TOKEN_PROGRAM_ID
              )
            );
            
            // 트랜잭션 전송
            const { signature } = await provider.signAndSendTransaction(transaction);
            setStatus(prev => [...prev, `[${i+1}/${parsedRecipients.length}] 트랜잭션 전송됨: ${signature}`]);
            
            // 트랜잭션 확인
            await connection.confirmTransaction({
              signature,
              blockhash: recentBlockhash.blockhash,
              lastValidBlockHeight: recentBlockhash.lastValidBlockHeight
            }, "confirmed");
            
            setStatus(prev => [...prev, `[${i+1}/${parsedRecipients.length}] 처리 성공!`]);
            recipient.ata = recipientAta; // ATA 설정
            successfulRecipients.push(recipient);
            success = true;
          } catch (error: any) {
            console.error(`Transaction failed for ${recipient.address}:`, error);
            setStatus(prev => [...prev, `[${i+1}/${parsedRecipients.length}] 처리 실패: ${error.message}`]);
            // 성공하지 못했다면 실패 목록에 추가
            if (!success) {
              failedRecipients.push(recipient);
            }
          }
          
          // 실시간으로 목록 업데이트
          if (success) {
            setSentTokens(prev => [...prev, recipient]);
            setRecipients(prev => [...prev, recipient]);
            // 원스텝 성공 목록에 추가
            setOneStepSuccessTokens(prev => [...prev, recipient]);
          } else {
            setFailedTokens(prev => [...prev, recipient]);
            // 원스텝 실패 목록에 추가
            setOneStepFailedTokens(prev => [...prev, recipient]);
          }
        } catch (error: any) {
          console.error(`Processing failed for ${recipient.address}:`, error);
          setStatus(prev => [...prev, `[${i+1}/${parsedRecipients.length}] 처리 실패: ${error.message}`]);
          failedRecipients.push(recipient);
          setFailedTokens(prev => [...prev, recipient]);
          // 원스텝 실패 목록에 추가
          setOneStepFailedTokens(prev => [...prev, recipient]);
        }
        
        // 진행률 업데이트
        const progress = ((i + 1) / parsedRecipients.length) * 100;
        setProgress(progress);
        
        // 요청 제한을 고려하여 200ms 대기
        await delay(200);
      }
      
      // 최종 결과 업데이트
      setStatus(prev => [
        ...prev,
        `프로세스 완료: 총 ${parsedRecipients.length}명 중 ${successfulRecipients.length}명 성공, ${failedRecipients.length}명 실패`
      ]);
      
      // 상태 업데이트
      setIsATAInitialized(true);
      setIsStep2Completed(true);
      setIsStep3Completed(true);
      setIsOneStepCompleted(true); // 원스텝 처리 완료 상태로 설정
      setShowDownloadButtons(true);
    } catch (error: any) {
      console.error("Direct single process failed:", error);
      setStatus(prev => [...prev, `프로세스 실패: ${error.message}`]);
    } finally {
      setIsProcessing(false);
      setStopProcessing(false);
      setProgress(100);
    }
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

            <div className="mt-6 mb-6">
              <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">솔라나 토큰 에어드랍 도구</h2>
              <h3 className="text-xl font-bold text-center text-gray-800 mb-4">3단계 처리 프로세스</h3>
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <p className="text-center text-gray-700 mb-2">효율적인 에어드랍을 위한 3단계 프로세스:</p>
                <ol className="list-decimal list-inside text-gray-700 space-y-1 ml-4">
                  <li><b>ATA 초기화</b>: 모든 수령인의 토큰 계정을 확인하고 생성합니다.</li>
                  <li><b>토큰 전송</b>: 준비된 계정으로 토큰을 전송합니다.</li>
                  <li><b>실패 항목 재시도</b>: 실패한 전송을 개별적으로 한 번 더 시도합니다.</li>
                </ol>
              </div>
              <p className="text-center text-gray-600 mb-4">각 단계가 완료된 후 다음 단계로 진행하세요.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 flex-wrap">
                <button
                  onClick={initializeAllATAs}
                  disabled={!publicKey || !file || isProcessing}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors flex items-center justify-center"
                >
                  <span className="bg-blue-700 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">1</span>
                  ATA 초기화
                </button>
                <button
                  onClick={transferTokens}
                  disabled={!publicKey || !file || !isATAInitialized || isProcessing}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors flex items-center justify-center"
                >
                  <span className="bg-blue-700 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">2</span>
                  토큰 전송
                </button>
                <button
                  onClick={retryFailedTransfers}
                  disabled={!publicKey || !file || !isStep2Completed || failedTokens.length === 0 || isProcessing}
                  className="px-6 py-3 bg-purple-500 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors flex items-center justify-center"
                >
                  <span className="bg-purple-700 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">3</span>
                  실패항목 재시도
                </button>
                
                <button
                  onClick={directSingleProcess}
                  disabled={!publicKey || !file || isProcessing}
                  className="px-6 py-3 bg-emerald-500 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors flex items-center justify-center"
                  title="CSV 파일에서 바로 ATA 확인/생성 및 토큰 전송을 한 번에 처리합니다. 각 수령인을 독립적으로 처리하여 성공률을 높입니다."
                >
                  <span className="bg-emerald-700 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">★</span>
                  원스텝 단일처리
                </button>
              </div>
              
              <div className="flex justify-center gap-4 mt-4">
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
              
              {/* 원스텝 단일처리 설명 */}
              {!isProcessing && (
                <div className="mt-4 bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-sm text-emerald-700">
                  <p className="font-medium">원스텝 단일처리란?</p>
                  <p>1단계와 2단계를 거치지 않고, CSV 파일에서 바로 모든 수령인을 개별적으로 처리합니다.</p>
                  <p>새로고침 후에도 사용 가능하며, 각 수령인마다 ATA 생성과 토큰 전송을 하나의 트랜잭션으로 처리합니다.</p>
                  <p>이 방식은 실패한 항목만 다시 처리하거나, 처음부터 엑셀 파일에 있는 모든 계정을 단일 처리할 때 유용합니다.</p>
                </div>
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
          </div>
        </div>

        {/* 엑셀 다운로드 버튼 섹션 */}
        {showDownloadButtons && (
          <div className="mt-4 flex justify-center gap-3 flex-wrap">
            {!isStep3Completed ? (
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
              {!isStep3Completed ? (
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
                {!isStep3Completed ? (
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
          {isStep3Completed ? (
            // Step3 완료 후 - 재시도 결과 표시
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* 재시도 성공 목록 */}
              {retrySuccessTokens.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-green-600">재시도 성공: {retrySuccessTokens.length}명</h2>
                    {showDownloadButtons && (
                      <button 
                        onClick={() => downloadCSV(retrySuccessTokens, "retry_success_recipients.csv")}
                        className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
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
                      {retrySuccessTokens.map((recipient, idx) => (
                        <li key={idx} className="text-md text-green-700">
                          <div className="flex justify-between">
                            <span className="truncate w-3/4">{recipient.address}</span>
                            <span className="font-medium">{recipient.amount}</span>
                          </div>
                          <div className="text-xs text-green-600">재시도 성공</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {/* 재시도 실패 목록 */}
              {retryFailedTokens.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-red-600">재시도 실패: {retryFailedTokens.length}명</h2>
                    {showDownloadButtons && (
                      <button 
                        onClick={() => downloadCSV(retryFailedTokens, "retry_failed_recipients.csv")}
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
                      {retryFailedTokens.map((recipient, idx) => (
                        <li key={idx} className="text-md text-red-600">
                          <div className="flex justify-between">
                            <span className="truncate w-3/4">{recipient.address}</span>
                            <span className="font-medium">{recipient.amount}</span>
                          </div>
                          <div className="text-xs text-red-500">재시도 실패</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {/* 아직 남아있는 실패 항목 - 다시 재시도 가능 */}
              {failedTokens.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-orange-600">단일 전송 실패: {failedTokens.length}명</h2>
                    <div className="flex space-x-2">
                      {!isProcessing && (
                        <button
                          onClick={retryFailedTransfers}
                          className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                          title="실패 항목 재시도"
                        >
                          <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            재시도
                          </span>
                        </button>
                      )}
                      {showDownloadButtons && (
                        <button 
                          onClick={() => downloadCSV(failedTokens, "remaining_failed_recipients.csv")}
                          className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                          title="CSV로 다운로드"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <ul className="space-y-2">
                      {failedTokens.map((recipient, idx) => (
                        <li key={idx} className="text-md text-orange-600">
                          <div className="flex justify-between">
                            <span className="truncate w-3/4">{recipient.address}</span>
                            <span className="font-medium">{recipient.amount}</span>
                          </div>
                          <div className="text-xs text-orange-500">아직 처리되지 않음</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : isOneStepCompleted ? (
            // 원스텝 처리 완료 후 - 결과 표시
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* 원스텝 성공 목록 */}
              {oneStepSuccessTokens.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-emerald-600">단일처리 성공: {oneStepSuccessTokens.length}명</h2>
                    {showDownloadButtons && (
                      <button 
                        onClick={() => downloadCSV(oneStepSuccessTokens, "onestep_success_recipients.csv")}
                        className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
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
                      {oneStepSuccessTokens.map((recipient, idx) => (
                        <li key={idx} className="text-md text-emerald-700">
                          <div className="flex justify-between">
                            <span className="truncate w-3/4">{recipient.address}</span>
                            <span className="font-medium">{recipient.amount}</span>
                          </div>
                          <div className="text-xs text-emerald-600">원스텝 성공</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {/* 원스텝 실패 목록 */}
              {oneStepFailedTokens.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-red-600">단일처리 실패: {oneStepFailedTokens.length}명</h2>
                    <div className="flex space-x-2">
                      {!isProcessing && (
                        <button
                          onClick={directSingleProcess}
                          className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                          title="단일처리 다시 시도"
                        >
                          <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            다시 시도
                          </span>
                        </button>
                      )}
                      {showDownloadButtons && (
                        <button 
                          onClick={() => downloadCSV(oneStepFailedTokens, "onestep_failed_recipients.csv")}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                          title="CSV로 다운로드"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <ul className="space-y-2">
                      {oneStepFailedTokens.map((recipient, idx) => (
                        <li key={idx} className="text-md text-red-600">
                          <div className="flex justify-between">
                            <span className="truncate w-3/4">{recipient.address}</span>
                            <span className="font-medium">{recipient.amount}</span>
                          </div>
                          <div className="text-xs text-red-500">원스텝 실패</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
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
          {!isStep3Completed && failedATAs.length > 0 && (
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
          {!isStep3Completed && filteredAddresses.length > 0 && (
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

 