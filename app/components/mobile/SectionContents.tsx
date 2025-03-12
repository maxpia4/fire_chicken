"use client";

import { twMerge } from "tailwind-merge";
import React from "react";

export const SectionContents = ({
                                  sections,
                                  activeSection,
                                  showTokenomics,
                                  setIsLoadMapClicked,
                                  isLoadMapClicked,
                                  videoRef,
}:any) => {

  return (
    <>
      {activeSection === sections.indexOf("About") && (
        <div className="absolute w-full top-[20%] flex items-center justify-center px-[16px] animate-fadeIn">
          <img
            src={`/mobile/About_contents.png`}
            // className={twMerge("flex-1")}
          />
        </div>
      )}

      {activeSection === sections.indexOf("HowToGet") && (
        <div className="absolute w-full top-[20%] flex items-center justify-center px-[35px] animate-fadeIn">
          <img
            src={`/mobile/HowToGet_contents.png`}
          />
        </div>
      )}

      {activeSection === sections.indexOf("Tokenomics") && (
        <div className={twMerge("absolute w-full top-[calc(30%)] flex items-center justify-center",
          showTokenomics ? "animate-grow" : "hidden")}>
          <img
            src={`/mobile/Tokenomics_contents.png`}
            className={twMerge("w-[286px] h-[154px]")}
          />
        </div>
      )}

      {activeSection === sections.indexOf("Roadmap") && (
        <div className="h-[145%] bg-black">
          {/*배경*/}
          <video
            loop
            autoPlay
            muted
            playsInline
            preload="auto"
            className="absolute top-[15%] inset-0 w-full h-full object-fill lg:block"
          >
            <source src={`/mobile/bg_Roadmap.mp4`} type="video/mp4"/>
          </video>
          {/*서브 닭*/}
          <div className={twMerge("transition-all duration-1000 ease-in-out",
            "absolute top-[65%] w-full h-[10%] flex items-center justify-center",
            isLoadMapClicked ? "opacity-0" : "")}>
              <video
                loop
                autoPlay
                muted
                playsInline
                preload="auto"
                className="w-full"
              >
                <source src={`/mobile/char_RoadMap4.webm`}/>
              </video>
          </div>

          {/*첫번째 박스*/}
          <div
            onClick={() => setIsLoadMapClicked(true)}
            className={twMerge("absolute w-full top-[25%] flex items-center justify-center animate-fadeIn",
              isLoadMapClicked ? "hidden" : ""
            )}
          >
            <img
              src={`/mobile/RoadMap01_contents.png`}
              className={twMerge("w-[90%] h-[90%]")}
            />
          </div>

          {/*두번째 박스*/}
          <div
            className={twMerge("absolute w-full top-[calc(28%)] flex items-center justify-center px-[29px] animate-fadeIn",
              isLoadMapClicked ? "" : "hidden"
            )}>
            <img
              src={`/mobile/RoadMap02_contents.png`}
            />
          </div>

          {/*메인 닭*/}
          <div
            className={twMerge(
              "absolute w-full h-full flex justify-center animate-fadeIn transition-all duration-1000 ease-in-out",
              !isLoadMapClicked ? "top-[58%]" : "top-[18%]"
            )}
          >
            <div
              onClick={() => setIsLoadMapClicked(true)}
              className={twMerge(
                "transition-all duration-1000 ease-in-out",
                !isLoadMapClicked ? "w-[100%]" : "w-[40%]")}
            >
              <video
                // ref={videoRef}
                loop
                autoPlay
                muted
                playsInline
                preload="auto"
                className="w-full"
              >
                <source src={`/mobile/char_RoadMap2.webm`}/>
              </video>
            </div>
          </div>
          {/*서브 닭*/}
          <div
            onClick={() => setIsLoadMapClicked(true)}
            className={twMerge("transition-all duration-1000 ease-in-out",
            "absolute top-[98%] w-full h-[10%] flex items-center justify-center",
            isLoadMapClicked ? "opacity-0" : "")}>
            <div className="w-full">
              <video
                loop
                autoPlay
                muted
                playsInline
                preload="auto"
                className="w-full"
              >
                <source src={`/mobile/char_RoadMap.webm`}/>
              </video>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
