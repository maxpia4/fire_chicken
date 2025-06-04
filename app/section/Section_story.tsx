"use client";
import React, { useState, useRef } from 'react';
import { SectionContainer } from '@/app/components/SectionContainer';

const Section_story = () => {
  const [fade, setFade] = useState(false);
  const [showArrow, setShowArrow] = useState(true);
  const video2Ref = useRef<HTMLVideoElement>(null);

  // 화살표 클릭 시 첫 번째 영상만 페이드 아웃, 두 번째 영상은 처음부터 재생
  const handleNext = () => {
    if (video2Ref.current) {
      video2Ref.current.currentTime = 0;
      video2Ref.current.play();
    }
    setFade(true);
    setShowArrow(false);
  };

  return (
  <SectionContainer>
      <div className="w-full h-full flex items-center justify-center bg-black relative">
        {/* 두 번째 영상은 항상 아래에 깔려 있음 */}
        <video
          ref={video2Ref}
          src="/story_5-1.webm"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover absolute inset-0 z-0"
        />
        {/* 첫 번째 영상은 위에 겹쳐서, opacity로 페이드아웃 */}
        <video
          src="/story_4.webm"
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover absolute inset-0 z-10 transition-opacity duration-200 ${fade ? 'opacity-0' : 'opacity-100'}`}
          style={{ pointerEvents: showArrow ? 'auto' : 'none' }}
        />
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
  </SectionContainer>
);
};

export default Section_story;
