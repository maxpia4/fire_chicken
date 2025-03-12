"use client";

import React from "react";

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
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 -z-10 w-full h-full object-fill lg:block"
      >
        <source src={`/mobile/bg_Tokenomics.mp4`} type="video/mp4" />
      </video>
    ),
    Roadmap: (
      <></>
    ),
    default: (
      <img
        src={`/mobile/bg_basic.png`}
        className="flex-1 absolute"
      />
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
