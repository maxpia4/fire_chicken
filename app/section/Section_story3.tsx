"use client";
import React, { useState, useRef } from 'react';
import { SectionContainer } from '@/app/components/SectionContainer';

const Section_story = () => {
  const [fade, setFade] = useState(false);
  const [showArrow, setShowArrow] = useState(true);
  const [blur, setBlur] = useState(0);
  const [showVideo2, setShowVideo2] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const video2Ref = useRef<HTMLVideoElement>(null);

  // blur 애니메이션 (양방향)
  const handleNext = () => {
    if (video2Ref.current) {
      video2Ref.current.currentTime = 0;
      video2Ref.current.play();
    }
    setShowArrow(false);
    let frame = 0;
    const totalFrames = 100;
    // 1. blur 증가 (첫 영상)
    const blurIn = () => {
      frame++;
      setBlur((frame / totalFrames) * 30);
      if (frame < totalFrames) {
        requestAnimationFrame(blurIn);
      } else {
        setFade(true);
        setShowVideo2(true);
        setShowInfo(true);
        frame = totalFrames;
        // 2. blur 감소 (두 번째 영상)
        const blurOut = () => {
          frame--;
          setBlur((frame / totalFrames) * 30);
          if (frame > 0) {
            requestAnimationFrame(blurOut);
          } else {
            setBlur(0);
    }
        };
        blurOut();
      }
    };
    blurIn();
  };

  return (
    <SectionContainer>
      <div className="w-full h-full flex flex-col bg-black relative">
        <div className="flex-1 relative">
          {/* 두 번째 영상은 항상 아래에 깔려 있음 */}
          {showVideo2 && (
            <video
              ref={video2Ref}
              src="/story_5-1.webm"
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover absolute inset-0 z-0 transition-opacity duration-200 ${fade ? 'opacity-100' : 'opacity-0'}`}
              style={{ filter: `blur(${blur}px)` }}
            />
          )}
          {/* 첫 번째 영상은 위에 겹쳐서, opacity로 페이드아웃 + blur 효과 */}
          {!fade && (
            <video
              src="/story_4.webm"
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover absolute inset-0 z-10 transition-opacity duration-200 ${fade ? 'opacity-0' : 'opacity-100'}`}
              style={{
                pointerEvents: showArrow ? 'auto' : 'none',
                filter: `blur(${blur}px)`
              }}
            />
          )}
          {/* 화살표 */}
          {showArrow && (
            <div
              onClick={handleNext}
              className="absolute right-10 top-1/2 transform -translate-y-1/2 cursor-pointer z-20"
            >
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group hover:bg-white/30 transition-all">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-white animate-pulse group-hover:animate-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* 토큰 ATA 정보 표시 섹션 */}
        {showInfo && (
          <div className="bg-black/80 backdrop-blur-sm text-white p-6 z-20 overflow-y-auto max-h-96 transition-all duration-300 ease-in-out transform translate-y-0 opacity-100">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">솔라나 토큰 ATA(Associated Token Account) 생성하기</h2>
              
              <div className="space-y-4">
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-xl font-bold text-blue-400 mb-2">ATA란?</h3>
                  <p>ATA(Associated Token Account)는 사용자의 지갑 주소와 연결된 토큰 계정으로, 특정 토큰의 잔액과 소유자 정보를 저장합니다.</p>
                </div>
                
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-xl font-bold text-blue-400 mb-2">ATA 생성 방법</h3>
                  <p className="mb-2">ATA는 다음과 같은 방법으로 생성할 수 있습니다:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>토큰을 받으면 자동으로 생성 (가장 일반적)</li>
                    <li>프로그래밍 방식으로 직접 생성 (createAssociatedTokenAccount 함수 사용)</li>
                    <li>CLI를 통한 생성: <code className="bg-black p-1 rounded">spl-token create-account &lt;토큰주소&gt;</code></li>
                  </ol>
                </div>
                
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-xl font-bold text-blue-400 mb-2">ATA 생성을 위한 코드 예시</h3>
                  <pre className="bg-black p-3 rounded text-xs overflow-x-auto">
{`// ATA 계정 주소 찾기
const associatedTokenAddress = await getAssociatedTokenAddress(
  tokenMintPubkey, // 토큰 주소
  ownerPubkey // 소유자 지갑 주소
);

// ATA 생성 트랜잭션
let tx = new Transaction().add(
  createAssociatedTokenAccountInstruction(
    payerPubkey, // 비용 지불 계정
    associatedTokenAddress, // 생성할 ATA 주소
    ownerPubkey, // 소유자 지갑 주소
    tokenMintPubkey // 토큰 주소
  )
);`}
                  </pre>
                </div>
              </div>
              
              <p className="mt-4 text-green-300 font-bold">💡 알고 계셨나요? 솔라나에서는 토큰을 받을 때 ATA가 존재하지 않으면 송신자가 수신자의 ATA를 자동으로 생성할 수 있습니다!</p>
            </div>
          </div>
        )}
      </div>
    </SectionContainer>
  );
};

export default Section_story;
