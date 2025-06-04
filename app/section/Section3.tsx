"use client"

import { twMerge } from "tailwind-merge";
import { SectionContainer } from "@/app/components/SectionContainer";
import { useState } from "react";

// Uniswap iframe 컴포넌트
const UniswapIframe = () => {
  return (
    <iframe 
      src="https://app.uniswap.org/#/swap?outputCurrency=0x6982508145454ce325ddbe47a25d4ec3d2311933" 
      height="660px" 
      width="100%" 
      style={{
        border: 0,
        margin: '0 auto',
        display: 'block',
        borderRadius: '10px',
        maxWidth: '600px',
        minWidth: '300px',
      }}
    />
  );
};

// 간소화된 스왑 UI 컴포넌트
const SimpleSwapUI = () => {
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  
  // 계산 로직 (실제로는 더 복잡한 로직이 필요)
  const calculateToAmount = (value: string) => {
    const numValue = parseFloat(value) || 0;
    // 임시 환율 예시 (1 SOL = 1000 FC)
    return (numValue * 1000).toString();
  };
  
  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    setToAmount(calculateToAmount(value));
  };

  const handleSwapClick = () => {
    window.open("https://raydium.io/swap/?inputMint=93eQWWgcaSMriusbjR3v3e2Me5dM17JJbPmyxVKPKZXZ&outputMint=sol", "_blank");
  };
  
  return (
    <div className="bg-[#0E111B] p-6 rounded-xl max-w-md mx-auto cursor-pointer" onClick={handleSwapClick}>
      <div className="text-white text-2xl font-bold mb-4">Swap</div>
      
      {/* From 섹션 */}
      <div className="bg-[#1B2133] rounded-xl p-4 mb-2">
        <div className="flex justify-between mb-2">
          <span className="text-white font-medium">From</span>
          <div className="flex space-x-2">
            <button className="text-blue-400 text-sm px-2 py-1 rounded bg-[#2A3A58]">Max</button>
            <button className="text-blue-400 text-sm px-2 py-1 rounded bg-[#2A3A58]">50%</button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-red-500 flex items-center justify-center mr-2">
              <span className="text-white font-bold text-xs">SOL</span>
            </div>
            <span className="text-white text-xl font-bold">SOL</span>
          </div>
          <input 
            type="text" 
            value={fromAmount} 
            onChange={(e) => handleFromAmountChange(e.target.value)}
            placeholder="0.0" 
            className="bg-transparent text-white text-right text-xl focus:outline-none w-1/2" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="text-gray-500 text-right text-sm mt-1">~$0</div>
      </div>
      
      {/* 방향 전환 버튼 */}
      <div className="flex justify-center -my-3 relative z-10">
        <button className="bg-[#5D6B8E] hover:bg-[#4A5674] text-white rounded-full p-2 w-10 h-10 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
          </svg>
        </button>
      </div>
      
      {/* To 섹션 */}
      <div className="bg-[#1B2133] rounded-xl p-4 mt-2">
        <div className="flex justify-between mb-2">
          <span className="text-white font-medium">To</span>
          <div className="flex space-x-2">
            <button className="text-blue-400 text-sm px-2 py-1 rounded bg-[#2A3A58]">Max</button>
            <button className="text-blue-400 text-sm px-2 py-1 rounded bg-[#2A3A58]">50%</button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
              <img src="/fire_chicken_char.png" alt="FC" className="w-full h-full object-cover" />
            </div>
            <span className="text-white text-xl font-bold">FC</span>
          </div>
          <input 
            type="text" 
            value={toAmount} 
            readOnly 
            placeholder="0.0" 
            className="bg-transparent text-white text-right text-xl focus:outline-none w-1/2" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="text-gray-500 text-right text-sm mt-1">~$0</div>
      </div>
      
      {/* 연결 버튼 */}
      <button className="w-full bg-[#67E3FF] hover:bg-[#5CD0EC] text-[#0E111B] font-bold py-3 rounded-xl mt-4 transition duration-200">
        Link to Raydium
      </button>
    </div>
  );
};

export const Section3 = () => {
  const [showSwapUI, setShowSwapUI] = useState(false);
  
  return (
  <SectionContainer sectionIdx={3}>
    <div className="flex flex-1 flex-col lg:flex-row items-center justify-center px-10">
      {/* 모바일에서만 이미지 표시 */}
      <img
        className={twMerge("w-[500px] block lg:hidden")}
        src="/fire_chicken_char.png"
        alt="Fire Chicken"
      />
      <div className="flex-1 p-8 rounded-lg shadow-lg bg-black bg-opacity-70 text-white font-bold mb-52 lg:mb-0">
        {/* 반응형 텍스트 크기 적용 */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6">
          How to Get Firechicken Coin (How to Buy)
        </h1>

          {!showSwapUI ? (
        <div className="space-y-8">
          <div className="p-2 rounded-lg shadow-md">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-4">
              Step 1: Create a Phantom Wallet
            </h2>
            <p className="text-base sm:text-lg md:text-xl leading-relaxed">
              Firechicken Coin is a Solana-based token, so you need to create a Solana-compatible wallet.
            </p>
          </div>

          <div className="p-2 rounded-lg shadow-md">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-4">
              Step 2: Buy Solana (SOL)
            </h2>
            <p className="text-base sm:text-lg md:text-xl leading-relaxed">
              Purchase Solana from a cryptocurrency exchange.
            </p>
          </div>

          <div className="p-2 rounded-lg shadow-md">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-4">
              Step 3: Visit Raydium
            </h2>
            <p className="text-base sm:text-lg md:text-xl leading-relaxed">
              Head to <a href="https://raydium.io" className="hover:underline text-red-600">https://raydium.io</a> and
              search for Firechicken Token.
            </p>
          </div>

          <div className="p-2 rounded-lg shadow-md">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-4">
              Step 4: Swap SOL for Firechicken Coin
            </h2>
            <p className="text-base sm:text-lg md:text-xl leading-relaxed">
              Register your Phantom Wallet on Raydium and perform the token swap.
            </p>
          </div>

              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setShowSwapUI(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full text-lg transition-all transform hover:scale-105 active:scale-95"
                >
                  직접 스왑 사용하기
                </button>
        </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Sol → Firechicken 스왑</h2>
                <button
                  onClick={() => setShowSwapUI(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                >
                  가이드로 돌아가기
                </button>
              </div>
              
              <SimpleSwapUI />
              {/* <UniswapIframe /> */}
              
              <div className="bg-yellow-600 bg-opacity-30 p-4 rounded-lg mt-4">
                <p className="text-sm">⚠️ 항상 지갑을 연결하고 거래하기 전에 토큰 주소를 확인하세요. 불닭코인 주소: <span className="font-mono bg-black bg-opacity-40 px-1 rounded">93eQWWgcaSMriusbjR3v3e2Me5dM17JJbPmyxVKPKZXZ</span></p>
              </div>
            </div>
          )}
      </div>

      {/* 데스크탑에서만 이미지 표시 */}
      <img
        className={twMerge("w-[500px] lg:block hidden")}
        src="/fire_chicken_char.png"
        alt="Fire Chicken"
      />
    </div>
  </SectionContainer>
);
};
