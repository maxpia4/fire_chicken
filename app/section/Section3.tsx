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



const handleSwapClick = () => {
  window.open("https://raydium.io/swap/?inputMint=93eQWWgcaSMriusbjR3v3e2Me5dM17JJbPmyxVKPKZXZ&outputMint=sol", "_blank");
};

export const Section3 = () => {
  const [showSwapUI, setShowSwapUI] = useState(false);
  
  return (
    <SectionContainer sectionIdx={3}>
      <div className="flex flex-1 flex-col items-center justify-center px-[10%]">
        <div className="w-full flex justify-center items-center mt-20 space-x-10">

          {/* Raydium Button 이미지 - 클릭 가능하게 만들기 */}
          <div className="cursor-pointer flex flex-col items-center justify-center" onClick={handleSwapClick}>
            <img
              className="max-w-[100%] h-auto"
              src="/section3-contents_raydium-btn.png"
              alt="Raydium Button"
            />
            <button className="mt-10 bg-[#1C243E] text-white px-4 py-2 rounded-md w-full text-[13px]">
              Raydium 바로가기 →
            </button>
          </div>

          <div className="flex flex-col items-center justify-center space-y-10">
            {/* How to Get fire chicken Coin 이미지 */}
            <div className="w-full flex justify-center">
              <img
                className="max-w-[50%] h-auto"
                src="/How to Get fire chicken Coin.png"
                alt="How to Get fire chicken Coin"
              />
            </div>
            {/* Section3 Contents 이미지 */}
            <div className="w-full flex justify-center">
              <img
                className="max-w-[85%] h-auto"
                src="/section3-contents.png"
                alt="Section 3 Contents"
              />
            </div>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
};
