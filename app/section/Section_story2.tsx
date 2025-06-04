"use client";
import React, { useRef, useEffect, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { SectionContainer } from '@/app/components/SectionContainer';

// 동적 페이지 컴포넌트 - 투명 또는 흰색으로 설정 가능
const DynamicPage = React.forwardRef<HTMLDivElement, { isActive: boolean }>((props, ref) => (
  <div 
    className={`page w-full h-full transition-colors duration-300 ${props.isActive ? 'bg-transparent' : 'bg-white'}`} 
    ref={ref} 
    data-density="soft"
  ></div>
));
DynamicPage.displayName = 'DynamicPage';

const BlackPage = React.forwardRef<HTMLDivElement>((props, ref) => (
  <div className="page w-full h-full bg-black" ref={ref} data-density="soft"></div>
));
BlackPage.displayName = 'BlackPage';

const SoftPage = React.forwardRef<HTMLDivElement, { src: string; isActive?: boolean }>((props, ref) => (
  <div className={`page w-full h-full ${props.isActive ? 'bg-transparent' : 'bg-black'}`} ref={ref}>
    <video
      src={props.src}
      autoPlay
      loop
      muted
      playsInline
      className="w-full h-full object-cover"
    />
  </div>
));
SoftPage.displayName = 'SoftPage';

const ASPECT_RATIO = 16 / 9;

const Section_story2 = () => {
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 896, height: 504 });
  const [position, setPosition] = useState({ left: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(8); // 총 페이지 수

  // 페이지 번호에 따른 활성화 상태 결정
  const isPageActive = (pageNumber: number) => {
    // 첫 번째 페이지(0)는 항상 투명하게 처리
    if (pageNumber === 0) return true;
    
    // 나머지 페이지는 현재 펼쳐진 페이지와 그 다음 페이지가 활성화
    return pageNumber === currentPage || pageNumber === currentPage + 1;
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateSizes = () => {
        // 페이지 크기 계산
        const maxWidth = Math.min(window.innerWidth, 1200);
        const maxHeight = Math.min(window.innerHeight, 700);
        let width = maxWidth;
        let height = width / ASPECT_RATIO;
        
        if (height > maxHeight) {
          height = maxHeight;
          width = height * ASPECT_RATIO;
        }
        
        // 왼쪽 페이지를 화면 밖으로 밀어내기 위한 위치 계산
        // 왼쪽 페이지가 완전히 보이지 않도록 더 왼쪽으로 조정
        const left = -width+150;
        
        setDimensions({ width, height });
        setPosition({ left });
      };
      
      updateSizes();
      window.addEventListener('resize', updateSizes);
      return () => window.removeEventListener('resize', updateSizes);
    }
  }, []);

  // 페이지 전환 이벤트 핸들러
  const handlePageFlip = (e: any) => {
    // 현재 페이지 업데이트
    setCurrentPage(e.data);
  };

  return (
    <SectionContainer>
      <div className="w-full h-full flex items-center justify-start bg-black overflow-hidden" ref={containerRef}>
        <div style={{ 
          position: 'relative', 
          left: `${position.left}px`,
          transition: 'left 0.3s ease-out'
        }}>
          <HTMLFlipBook
            ref={bookRef}
            width={dimensions.width}
            height={dimensions.height}
            size="fixed"
            minWidth={320}
            maxWidth={1280}
            minHeight={180}
            maxHeight={720}
            maxShadowOpacity={0.5}
            showCover={false}
            mobileScrollSupport={true}
            className="book-flip"
            style={{ background: "transparent" }}
            startPage={1}
            drawShadow={true}
            flippingTime={900}
            usePortrait={false}
            autoSize={false}
            startZIndex={0}
            clickEventForward={false}
            useMouseEvents={true}
            swipeDistance={30}
            showPageCorners={true}
            disableFlipByClick={false}
            onFlip={handlePageFlip}
          >
            <DynamicPage isActive={true} />
            <BlackPage />
            <DynamicPage isActive={isPageActive(2)} />
            <SoftPage src="/story_4.webm" isActive={isPageActive(3)} />
            <DynamicPage isActive={isPageActive(4)} />
            <SoftPage src="/story_5-1.webm" isActive={isPageActive(5)} />
            <DynamicPage isActive={isPageActive(6)} />
            <BlackPage />
          </HTMLFlipBook>

          {/* 디버그용 페이지 정보 (필요시 주석 해제) */}
          {/* <div className="absolute bottom-4 right-4 bg-white/50 p-2 rounded">
            현재 페이지: {currentPage} / {totalPages}
          </div> */}
        </div>
      </div>
    </SectionContainer>
  );
};

export default Section_story2;
