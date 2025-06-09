"use client";

import Image from "next/image";
import { twMerge } from "tailwind-merge";

const NAV_LIST = [
  { label: "HOME", url: "section-1" },
  { label: "ABOUT", url: "section-2" },
  { label: "HOW TO GET", url: "section-3" },
  { label: "TOKENOMICS", url: "section-4" },
  { label: "ROADMAP", url: "section-5" },
];

export const Header = ({activeSection, setActiveSection}:any) => {
  const scrollToSection = (sectionId : string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };


  return (
    <>
      <header
        className={twMerge(
          // 모바일
          "h-[10%] w-full absolute z-50 bg-[#9C0404] transition-all duration-1000 ease-in-out",
          // pc
          "flex flex-row justify-center items-center text-white text-2xl font-extrabold",
          "sm:mx-20 sm:w-auto sm:h-[90px] sm:relative sm:justify-between sm:bg-transparent",
        )}
      >
        <a
          onClick={() => {
            activeSection ? setActiveSection(0) : window.location.href = "/";
          }}
          className="cursor-pointer h-full relative w-[187px] sm:hover:scale-125 transition-all duration-300"
        >
          <Image
            className="block"
            objectFit={"contain"}
            src="/mobile/logo-mobile.png"
            alt="logo of fire chicken"
            fill
            unoptimized
          />
        </a>
        <nav className={twMerge("sm:block", "flex-1", "hidden")}>
          <ul className="flex justify-end gap-32">
            {NAV_LIST.map(({ label, url }, i) => (
              <li
                className={"hover:scale-125 transition-all duration-300"}
                key={`header-nav-${i}-${label}`}
              >
                <a
                  // href={url}
                  onClick={() => scrollToSection(url)}
                  className={twMerge(
                    url ? "cursor-pointer" : "cursor-default coming-soon",
                  )}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
    </>
  );
};
