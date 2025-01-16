"use client";

import {useEffect, useState} from "react";
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
      <div className="relative flex flex-col items-center h-screen px-10"
           onClick={handleNextStep}
      >
        {/* 텍스트 영역 */}
        {currentStep < 4 ? (<div
          className={twMerge(
            "w-full flex flex-col items-center justify-center text-center z-10 transition-all duration-500 ease-in-out",
            currentMarginTop
          )}
        >
          {currentStep === 0 && (<div
              className={twMerge(
                "relative bg-white text-black text-xl font-bold p-4 rounded-xl shadow-xl cursor-pointer w-max",
                isFading ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0" // 페이드 애니메이션
              )}
            >
              Ready for the roadmap? Click me!
              {/* 말풍선 꼬리 */}
              <div
                className="absolute bottom-[-12px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-t-white border-l-transparent border-r-transparent"/>
            </div>
          )}

          {currentStep > 0 && (
            <div
              className={twMerge(
                "w-2/3 p-8 rounded-lg shadow-xl bg-black bg-opacity-70 text-white font-bold transition-all duration-300 ease-in-out",
                isFading ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0" // 페이드 애니메이션
              )}
            >
              {currentStep === 1 && (
                <div className="space-y-8">
                  <div className="p-2 rounded-lg shadow-md">
                  <h2 className="text-3xl font-semibold mb-4">Phase 1: Airdrop Events</h2>
                    <p className="text-2xl">
                      Launch the <span className="font-semibold">🔥Spicy Challenge🔥</span> with free airdrops to
                      attract community interest.
                    </p>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-8">
                  <div className="p-2 rounded-lg shadow-md">
                    <h2 className="text-3xl font-semibold mb-4">Phase 2: Collaboration and Meme Events</h2>
                    <p className="text-2xl mb-4">
                      <span className="font-semibold">Spicy Meme Viral Campaign:</span> Users create spicy-themed
                      memes to earn rewards in FC Coin.
                    </p>
                    <div className="text-xl italic space-y-4">
                      <p>"🔥If you can handle the heat, you can achieve wealth!"</p>
                      <p>"🌶️Spiciness equals success!"</p>
                      <p>"The spicy coin, Firechicken, claims the throne!"</p>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-8">
                  <div className="p-2 rounded-lg shadow-md">
                    <h2 className="text-3xl font-semibold mb-4">Phase 3: Be the King</h2>
                    <p className="text-2xl">
                      Firechicken, with its expanded ecosystem, shows meme coins the true meaning of spiciness and
                      becomes the absolute king.
                    </p>
                  </div>
                </div>
              )}

                <button
                  className="mt-4 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                >
                  {currentStep < 3 ? "Next Phase" : "Beat up the King!"}
                </button>
            </div>
          )}
        </div>) : (
          <>
            <div
              className={twMerge(
                "bg-white text-black text-xl font-bold p-4 rounded-xl shadow-xl cursor-pointer w-max mt-44",
                isFading ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0" // 페이드 애니메이션
              )}
            >
              {currentStep === 4 ? "Ready for the King? Click me!":"Again?"}
              {/* 말풍선 꼬리 */}
              <div
                className="absolute bottom-[-12px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-t-white border-l-transparent border-r-transparent"/>
            </div>
            <div className="absolute top-1/4 flex justify-center gap-4">
              <img
                className={twMerge(
                  "w-[80px]",
                  isShaking && "animate-shake", // Shake 애니메이션 적용
                  isFlyingOut && "animate-flyOut1", // FlyOut 애니메이션 적용
                  !isShaking && !isFlyingOut && "opacity-100 transform scale-100 translate-y-0" // 기본 상태
                )}
                src="/othercoin/dodge.png"
                alt="Dodge Coin"
              />
              <img
                className={twMerge(
                  "w-[80px]",
                  isShaking && "animate-shake2", // Shake 애니메이션 적용
                  isFlyingOut && "animate-flyOut2", // FlyOut 애니메이션 적용
                  !isShaking && !isFlyingOut && "opacity-100 transform scale-100 translate-y-0" // 기본 상태
                )}
                src="/othercoin/fudgepeng.png"
                alt="Fudge Peng"
              />
              <img
                className={twMerge(
                  "w-[80px]",
                  isShaking && "animate-shake", // Shake 애니메이션 적용
                  isFlyingOut && "animate-flyOut3", // FlyOut 애니메이션 적용
                  !isShaking && !isFlyingOut && "opacity-100 transform scale-100 translate-y-0" // 기본 상태
                )}
                src="/othercoin/pepe.png"
                alt="Pepe Coin"
              />
              <img
                className={twMerge(
                  "w-[80px]",
                  isShaking && "animate-shake2", // Shake 애니메이션 적용
                  isFlyingOut && "animate-flyOut4", // FlyOut 애니메이션 적용
                  !isShaking && !isFlyingOut && "opacity-100 transform scale-100 translate-y-0" // 기본 상태
                )}
                src="/othercoin/shibainu.png"
                alt="Shiba Inu"
              />
            </div>
          </>

        )}

        {/* 이미지 영역 */}
        <div className="absolute bottom-0 left-0 w-full flex justify-center">
          <img
            className={twMerge("w-[500px]")}
            src="/fire_chicken_char2.png"
            alt="Fire Chicken"
          />
        </div>
      </div>
    </SectionContainer>
  );
};
