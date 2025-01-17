"use client"

import {useEffect, useState} from "react";

export default function Soon() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // 화면 크기 확인 및 모바일 여부 결정
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024); // 모바일 기준 너비 768px
    };
    handleResize(); // 초기 확인
    window.addEventListener("resize", handleResize); // 리스너 등록
    return () => window.removeEventListener("resize", handleResize); // 리스너 해제
  }, []);

  return (
    <>
      {isMobile && (
        <div className="inset-0 z-50 flex h-screen flex-col items-center justify-center px-10">
          <div className="text-center text-xl font-semibold text-gray-700">
            Coming soon mobile! <br/> Please use a PC screen for now.
          </div>
        </div>
      )}
    </>
  );
}
