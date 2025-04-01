"use client";

import { twMerge } from "tailwind-merge";
import React, {useEffect, useState} from "react";
import {InfiniteVideo} from "@/app/components/mobile/InfiniteVideo";

export const Title = ({sections, activeSection, setActiveSection, videoRef, setIsFirstPlay}:any) => {

  const [activeTop, setActiveTop] = useState<string>("top-[10%]")

  // 섹션별 설정 정의
  const sectionConfigs = [
    { name: "About", homeTop: "top-[40%]" },
    { name: "HowToGet", homeTop: "top-[52%]" },
    { name: "Tokenomics", homeTop: "top-[64%]" },
    { name: "Roadmap", homeTop: "top-[76%]" },
  ];

  useEffect(() => {
    let timer: any;
    if(activeSection !== sections.indexOf("Home")) {
      timer = setTimeout(() => {
        setActiveTop("sticky top-[10%]");
      }, 1000);
    } else {
      setActiveTop("top-[10%]");
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }, [activeSection]);

  return (
    <>
      <div className={twMerge("h-[10%] relative",
        activeSection === sections.indexOf("Home") && "hidden"
      )}/>
      <div className={twMerge("absolute left-[-10%] w-[120%] h-[37%] flex items-center justify-center",
        activeSection !== sections.indexOf("Home") && "hidden")}>
        <video
          loop
          autoPlay
          muted
          playsInline
          preload="auto"
        >
          <source src="/mobile/banner_mobile_main.webm" type="video/webm"/>
        </video>
      </div>
      {
        sectionConfigs.map((config, index) => (
          <div
            key={config.name}
          onClick={() => {
            setActiveSection(sections.indexOf(config.name));
          }}
          className={twMerge("absolute z-30 w-full flex items-center justify-center transition-all duration-1000 ease-in-out",
            activeSection === sections.indexOf("Home")
              ? config.homeTop
              : activeSection === sections.indexOf(config.name)
                ? `${activeTop}`
                : "hidden"
          )}
        >
          <div className="flex items-center justify-center h-[61px] w-full">
            <div className={twMerge("flex justify-center items-center transition-all duration-1000 ease-in-out",
              activeSection === sections.indexOf("Home") ? "bg-[linear-gradient(to_right,#110F0F,#FF0000,#990000)] rounded-[4px] w-[70%] h-[75%]" : "bg-black rounded-[0px] w-full h-full"
            )}>
              <img
                src={`/mobile/title_${config.name}.png`}
                className="h-[32%]"
              />
            </div>
            <InfiniteVideo
              src={`/mobile/effect_fire.webm`}
              type={"video/webm"}
              loopTime={3}
              activeSection={activeSection}
              className={`absolute z-10 w-[80%] h-full object-fill lg:block duration-1000 ease-in-out
                ${activeSection !== sections.indexOf("Home") && "w-full opacity-0"}`
              }
            />
          </div>
        </div>
      ))}
    </>
  );
};
