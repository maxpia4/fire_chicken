"use client";

import { twMerge } from "tailwind-merge";
import React from "react";
import Image from 'next/image';

const Section1Contents = () => (
  <div className="absolute w-full top-[20%] flex items-center justify-center px-[16px] animate-fadeIn">
    <Image
      priority
      width="1031"
      height="3135"
      style={{width: "100%", height: "auto"}}
      src={`/mobile/About_contents.png`}
      alt={"About_contents"}/>
  </div>
);
const Section2Contents = () => (
  <div className="absolute w-full top-[20%] flex items-center justify-center px-[35px] animate-fadeIn">
    <Image
      priority
      width="927"
      height="3154"
      style={{width: "100%", height: "auto"}}
      src={`/mobile/HowToGet_contents.png`}
      alt={"HowToGet_contents"}/>
  </div>
);
const Section3Contents = (showTokenomics) => (
  <div className={twMerge("absolute w-full top-[calc(30%)] flex items-center justify-center",
    showTokenomics ? "animate-grow" : "hidden")}>
    <Image
      priority
      width="858"
      height="462"
      style={{width: "80%", height: "auto"}}
      src={`/mobile/Tokenomics_contents.png`}
      alt={"Tokenomics_contents"}/>
  </div>
);
const Section4Contents = (isLoadMapClicked,setIsLoadMapClicked):any => {

  const charChicken = () => (
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
  );
  const bgChicken1 = () => (
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
  );
  const bgChicken2 = () => (
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
  );

  const firstBox = () => (
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
  );
  const secondBox = () => (
    <div
      className={twMerge("absolute w-full h-screen top-[calc(30%)] animate-fadeIn",
        isLoadMapClicked ? "" : "hidden")}>
      <Image
        priority
        width="952"
        height="2682"
        style={{width: "auto", height: "115%"}}
        className="mx-auto"
        src={`/mobile/RoadMap02_contents.png`}
      />
    </div>
  );

  return (
    <div className="h-[140%] bg-black">
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

      {bgChicken1()}
      {firstBox()}
      {secondBox()}
      {charChicken()}
      {bgChicken2()}
    </div>
  )
};

export const SectionContents = ({
                                  sections,
                                  activeSection,
                                  showTokenomics,
                                  setIsLoadMapClicked,
                                  isLoadMapClicked,
                                }: any) => {

  return (
    <>
      {activeSection === sections.indexOf("About") && Section1Contents()}

      {activeSection === sections.indexOf("HowToGet") && Section2Contents()}

      {activeSection === sections.indexOf("Tokenomics") && Section3Contents(showTokenomics)}

      {activeSection === sections.indexOf("Roadmap") && Section4Contents(isLoadMapClicked,setIsLoadMapClicked)}
    </>
  );
};
