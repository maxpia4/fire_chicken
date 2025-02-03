"use client";

import Image from "next/image";
import { useState } from "react";
import { Tooltip } from "react-tooltip";
import { twMerge } from "tailwind-merge";

const NAV_LIST = [
  { label: "HOME", url: "section-1" },
  { label: "ABOUT", url: "section-2" },
  { label: "HOW TO GET", url: "section-3" },
  { label: "TOKENOMICS", url: "section-4" },
  { label: "ROADMAP", url: "section-5" },
];

const MOBILE_MENU = [...NAV_LIST];

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const scrollToSection = (sectionId : string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {isMenuOpen && (
        <div className="mobile-menu fixed top-0 left-0 w-full h-screen bg-gray-800 bg-opacity-75 z-50 flex flex-col justify-center items-center">
          <nav className="text-white space-y-4">
            <ul>
              {MOBILE_MENU.map(({ label, url }, i) => (
                <li key={`mobile-nav-${i}-${label}`}>
                  <a
                    onClick={() => scrollToSection(url)}
                    className="text-xl"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
            <button
              className="absolute top-4 right-4 text-white text-2xl"
              onClick={toggleMenu}
            >
              X
            </button>
          </nav>
        </div>
      )}
      <header
        className={twMerge(
          "flex flex-row justify-between items-center bg-[#611111] backdrop-blur-xl text-white",
          "h-12 px-5 py-2",
          "lg:h-16 lg:px-64",
        )}
      >
        <a
          href={"/"}
          className="cursor-pointer flex-none w-16 h-full relative lg:w-[12.5rem]"
        >
          <Image
            objectFit={"contain"}
            src="/logo-header.png"
            alt="logo of fire chicken"
            fill
            unoptimized
          />
        </a>
        <nav className={twMerge("desktop", "flex-1")}>
          <ul className="flex flex-row justify-center gap-32">
            {NAV_LIST.map(({ label, url }, i) => (
              <li
                className={"hover:scale-125 transition-all duration-300 "}
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
        {/*<button*/}
        {/*  className={twMerge(*/}
        {/*    "desktop",*/}
        {/*    "px-8 py-2 border-[1px] border-white rounded-full font-medium",*/}
        {/*  )}*/}
        {/*>*/}
        {/*  Support*/}
        {/*</button>*/}
        {/*<button*/}
        {/*  onClick={toggleMenu}*/}
        {/*  className={twMerge("mobile", "flex-none w-5 h-5 relative")}*/}
        {/*>*/}
        {/*  <Image*/}
        {/*    src="/burger-menu-icon.png"*/}
        {/*    alt="burger menu for open navigation"*/}
        {/*    fill*/}
        {/*    sizes="2.5rem"*/}
        {/*  />*/}
        {/*</button>*/}

        <Tooltip anchorSelect=".coming-soon" content="Coming soon!" />
      </header>
    </>
  );
};
