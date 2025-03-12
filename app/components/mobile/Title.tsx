"use client";

import { twMerge } from "tailwind-merge";
import {useEffect, useState} from "react";

export const Title = ({sections, activeSection, setActiveSection}:any) => {

  const [activeTop, setActiveTop] = useState<string>("top-[10%]")

  // 섹션별 설정 정의
  const sectionConfigs = [
    { name: "About", homeTop: "top-[100px]" },
    { name: "HowToGet", homeTop: "top-[200px]" },
    { name: "Tokenomics", homeTop: "top-[300px]" },
    { name: "Roadmap", homeTop: "top-[400px]" },
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
      <div className={twMerge(
        // "absolute",
        activeSection === sections.indexOf("Home")?"h-[10%]":"h-[10%]",
      )}/>
      {sectionConfigs.map((config,index) => (
        <div
          key={config.name}
          onClick={() => {
            setActiveSection(sections.indexOf(config.name));
          }}
          className={twMerge(`absolute z-30`,
            " w-full flex items-center justify-center transition-all duration-1000 ease-in-out",
            activeSection === sections.indexOf("Home")
              ? config.homeTop
              : activeSection === sections.indexOf(config.name)
                ? `${activeTop}`
                : "hidden"
          )}
        >
          <div
            className={twMerge(
              "flex items-center justify-center h-[61px] transition-all duration-1000 ease-in-out",
              activeSection === sections.indexOf("Home")
                ? "bg-[#990000] w-[70%] rounded-[4px]"
                : "bg-black w-full"
            )}
          >
            <img
              src={`/mobile/title_${config.name}.png`}
              className={twMerge("h-[32%]")}
            />
          </div>
        </div>
      ))}
    </>
  );
};
