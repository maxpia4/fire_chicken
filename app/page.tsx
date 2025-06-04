import {Section1} from "@/app/section/Section1";
import {Section2} from "@/app/section/Section2";
import {Section3} from "@/app/section/Section3";
import {Section4} from "@/app/section/Section4";
import {Section5} from "@/app/section/Section5";
import {SectionMobile} from "@/app/section/SectionMobile";
import Section_story from "@/app/section/Section_story";
import Section_story2 from "@/app/section/Section_story2";
import Section_story3 from "@/app/section/Section_story3";
import React from "react";

export default function Home() {
  return (
    <>
      {/*pc*/}
      <main
        className="hidden sm:block h-screen lg:h-[calc(100dvh)] overflow-y-scroll overflow-x-hidden text-white snap-y snap-mandatory snap-always">
        <Section1/>
        <Section2/>
        <Section3 />
        <Section4 />
        <Section5 />
        <Section_story/>
        <Section_story2/>
        <Section_story3/>
      </main>

      {/*모바일*/}
      <main
        className="block sm:hidden h-screen overflow-x-hidden text-white">
        <SectionMobile/>
      </main>
    </>
  );
}
