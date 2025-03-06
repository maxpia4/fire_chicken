"use client";

import {useState} from "react";
import {twMerge} from "tailwind-merge";

export const SectionMobile = () => {
  const sections = ["About", "HowToGet", "Tokenomics", "Roadmap"];
  const [activeSection, setActiveSection] = useState(0)
    return (
      <div className="w-full h-full">
        <div className="flex-1 relative">
          <img
            src={`/mobile/bg_${sections[activeSection]}.png`}
            className="flex-1"
          />
          <div className="absolute top-0 flex justify-between overflow-x-auto space-x-4 w-full px-4 py-8">
            {sections.map((section, index) => (
              <img
                onClick={() => setActiveSection(index)}
                key={section}
                src={`/mobile/btn_${section}.png`}
                className={twMerge("w-[139px] h-[29px]",
                  activeSection === index ? "opacity-100" : "opacity-50")}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
;
