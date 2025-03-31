"use client";

import {useRef, useEffect, useState} from "react";
import { twMerge } from "tailwind-merge";

interface InfiniteVideoProps {
  src: string; // 비디오 소스
  type: string; // 비디오 타입
  loopTime: number; // 루프 시작 시간 (기본값 0)
  activeSection: number;
  className?: string;
}

export const InfiniteVideo = ({
                                src,
                                type,
                                loopTime = 0,
                                activeSection,
                                className,
                              }: InfiniteVideoProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isFirstPlay, setIsFirstPlay] = useState(true); // 첫 재생 여부 추적
  // 비디오 재생 제어
  useEffect(() => {
    const video = videoRef.current;
    if ( !video ) return;

    const handleEnded = () => {
      if (isFirstPlay) {
        // 첫 재생 후 상태 변경
        setIsFirstPlay(false);
      }
      // 중간부터 재생 시작
      video.currentTime = loopTime;
      video.play();
    };

    // 첫 재생이면 0초부터, 이후는 10초부터 시작
    video.currentTime = isFirstPlay ? 0 : loopTime;
    video.play().catch((error) => console.error("Play failed:", error));

    // 이벤트 리스너 추가
    video.addEventListener("ended", handleEnded);

    // 클린업: 이벤트 리스너 제거
    return () => {
      console.log("cleanup");
      video.removeEventListener("ended", handleEnded);
    };
  }, [activeSection, isFirstPlay]); // activeSection 또는 isFirstPlay 변경 시 실행

  return (
    <video
      ref={videoRef as any}
      autoPlay
      muted
      playsInline
      preload="auto"
      className={twMerge(className)}
    >
      <source src={src} type={type} />
    </video>
  );
};
