"use client";

import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { SectionContainer } from "@/app/components/SectionContainer";

export const Section5 = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isFading, setIsFading] = useState(false); // 페이드 애니메이션 상태

  const [isShaking, setIsShaking] = useState(false); // shake 애니메이션 상태
  const [isFlyingOut, setIsFlyingOut] = useState(false); // flyOut 애니메이션 상태

  const handleNextStep = () => {
    if (currentStep < 5) {
      // 페이드 아웃 트리거
      setIsFading(true);
      setTimeout(() => {
        // 상태 업데이트 후 페이드 인 트리거
        setCurrentStep((prevStep) => prevStep + 1);
        setIsFading(false);
      }, 300); // 페이드 아웃 지속 시간
    } else {
      setIsFading(true);
      setTimeout(() => {
        // 상태 업데이트 후 페이드 인 트리거
        setCurrentStep(1);
        setIsFading(false);
      }, 300); // 페이드 아웃 지속 시간
    }
  };

  useEffect(() => {
    if (currentStep === 4) {
      setIsShaking(true); // Shake 애니메이션 시작
    }
    if (currentStep === 5) {
      setIsShaking(false); // Shake 애니메이션 종료
      setTimeout(() => {
        setIsFlyingOut(true); // FlyOut 애니메이션 시작
      }, 100); // 1초 후에 FlyOut 애니메이션 시작
    }
  }, [currentStep]);

  const marginTopValues = ["mt-52", "mt-24", "mt-12", "mt-24"];
  const currentMarginTop = marginTopValues[currentStep];

  return (
    <SectionContainer sectionIdx={5}>
      <div className="h-full flex items-center justify-center">
        <img src="/section5-contents.png" alt="section5 contents" className="max-h-full w-[80%] object-contain" />
      </div>
    </SectionContainer>
  );
};
