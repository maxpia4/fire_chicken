"use client";

import { twMerge } from "tailwind-merge";
import { SectionContainer } from "@/app/components/SectionContainer";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";

export const Section4 = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMovingDown, setIsMovingDown] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [isBubbleVisible, setIsBubbleVisible] = useState(true);
  

  const handlePlayClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
      
      // 이미지 애니메이션 시작 (shake)
      setIsAnimating(true);
      
      // 말풍선 즉시 숨기기
      setIsBubbleVisible(false);
      
      // 1초 후에 컨테이너가 아래로 이동
      setTimeout(() => {
        setIsMovingDown(true);
      }, 1000);
      
      // 3초 후에 콘텐츠 오버레이 표시
      setTimeout(() => {
        setIsContentVisible(true);
      }, 4000);
      
      // 2.5초 후 이미지 버튼 숨기기 (완전히 화면 밖으로 나간 후)
      setTimeout(() => {
        setIsButtonVisible(false);
      }, 2500);
    }
  };

  // 비디오 시간 관리
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // 비디오 로드 완료 시 0초 위치에서 시작 (기본값이므로 별도 설정 불필요)
    
    const handleTimeUpdate = () => {
      // 영상이 끝나면 10초 지점부터 자동으로 다시 시작
      if (video.currentTime >= video.duration - 0.1) {
        video.currentTime = 10;
        video.play().catch(err => console.log('재생 실패:', err));
      }
    };

    // loadeddata 이벤트 핸들러 제거
    video.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  return (
    <SectionContainer sectionIdx={4}>
      <div className="flex flex-1 items-center justify-center relative">
        {/* 배경 비디오 */}
        <video 
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover z-0"
          src="/section4-bg_animation.webm"
          muted
          playsInline
        />

        {/* 콘텐츠 오버레이 */}
        <div 
          className={`p-8 rounded-lg shadow-xl bg-black bg-opacity-70 text-white font-bold text-center mx-auto z-10 relative ${isContentVisible ? 'animate-contentShow' : 'animate-contentHide opacity-0 scale-0'}`}
        >
          {/* 반응형 글자 크기 설정 */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-extrabold mb-6">
            Tokenomics
          </h1>

          <div className="space-y-6">
            <div className="p-6 rounded-lg shadow-md">
              <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
                Total Supply: 10 billion tokens.
              </p>
            </div>
          </div>
        </div>
        
        {/* Flex 컨테이너를 추가하여 이미지 버튼을 중앙 정렬 */}
        <div 
          ref={containerRef}
          className={`absolute bottom-24 left-0 right-0 flex justify-center items-center z-20 ${
            isMovingDown ? 'transform translate-y-[200vh] transition-all duration-500 ease-in' : ''
          }`}
        >
          {isButtonVisible && (
            <div 
              ref={imageRef}
              className={`cursor-pointer relative ${
                isAnimating 
                  ? 'animate-shake' 
                  : 'hover:scale-110 transition-transform duration-300'
              }`}
              onClick={handlePlayClick}
            >
              {/* 말풍선 - 위치 조정 */}
              {isBubbleVisible && (
                <>
                  <div className="absolute -top-10 inset-x-0 flex justify-center">
                    <div className="bg-white text-black px-5 py-2 rounded-xl font-extrabold text-lg tracking-wide animate-bounce shadow-lg border-2 border-gray-200 relative">
                      Click me!
                      {/* 말풍선 꼬리 */}
                      <div className="absolute bottom-[-8px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-white border-r-[8px] border-r-transparent"></div>
                    </div>
                  </div>
                
                  <Image 
                    src="/fire_chicken_tokenomics.png" 
                    alt="Fire Chicken Tokenomics" 
                    width={120} 
                    height={120}
                    className="transition-transform duration-300 hover:scale-105"
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </SectionContainer>
  );
};
