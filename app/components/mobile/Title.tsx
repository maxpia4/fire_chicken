"use client";

import { twMerge } from "tailwind-merge";
import {useEffect, useState} from "react";

export const Title = ({sections, activeSection, setActiveSection}:any) => {

  const [activeTop, setActiveTop] = useState<string>("top-[70px]")

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
        setActiveTop("sticky top-[90px]");
      }, 1000);
    } else {
      setActiveTop("top-[70px]");
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
        activeSection === sections.indexOf("Home")?"h-[70px]":"h-[70px]",
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
                ? "bg-[#990000] w-[297px] rounded-[4px]"
                : "bg-black w-full"
            )}
          >
            <img
              src={`/mobile/title_${config.name}.png`}
              className={twMerge("h-[19px]")}
            />
          </div>
        </div>
      ))}
    </>
  );
};
