"use client";

import { twMerge } from "tailwind-merge";

export const FloatingBtn = ({
                              sections,
                              scrollContainerRef,
                              activeSection,
                              setActiveSection,
                              setIsFirstPlay,
                            } : any) => {

  return (
    <>
      {activeSection !== sections.indexOf("Home") && (
        <div ref={scrollContainerRef as any}
             className="absolute top-[-13px] flex justify-between overflow-x-auto space-x-4 w-full px-4 py-8">
          {sections.map((section:string, index:number) => {
            if (section === "Home") return null;
            return (
              <img
                onClick={() => {
                  setActiveSection(index);
                  setIsFirstPlay(true);
                }}
                key={section}
                src={`/mobile/btn_${section}.png`}
                className={twMerge(
                  "w-[139px] h-[29px]",
                  activeSection === index ? "opacity-100" : "opacity-50"
                )}
              />
            )
          })}
        </div>
      )}
    </>
  );
};
