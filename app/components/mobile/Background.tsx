"use client";

import React from "react";
import {InfiniteVideo} from "@/app/components/mobile/InfiniteVideo";
import Image from 'next/image';

interface BackgroundProps {
  activeSection: number;
  sections: string[];
  videoRef: React.RefObject<HTMLVideoElement>;
}

const BackgroundComponent = ({ activeSection, sections, videoRef }: BackgroundProps) => {
  const backgroundMap: any = {
    Home: (
      <></>
    ),
    Tokenomics: (
      <>
        <InfiniteVideo
          src={`/mobile/bg_Tokenomics.webm`}
          // src={`/mobile/bg_Test2.mp4`}
          type={"video/mp4"}
          loopTime = {10}
          activeSection = {activeSection}
          className ="absolute inset-0 -z-10 w-full h-full object-fill lg:block"
        />
      </>
    ),
    Roadmap: (
      <></>
    ),
    default: (
      <Image
        priority
        width={"1125"}
        height={"3678"}
        style={{objectFit: "cover", position: "absolute", width: "100%", height: "auto"}}
        src={`/mobile/bg_basic.png`}
        alt={"bg_basic"}/>
    ),
  };

  const sectionKey = sections[activeSection];
  return (
    <>
      <div className="absolute w-full h-full bg-black -z-20"/>
      {backgroundMap[sectionKey] || backgroundMap.default}
    </>
  );
};

// React.memo로 감싸기
export const Background = React.memo(BackgroundComponent as React.FC<BackgroundProps>);
