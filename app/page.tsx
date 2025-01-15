import Image from "next/image";
import {Section1} from "@/app/section/Section1";
import {Section2} from "@/app/section/Section2";
import {Section3} from "@/app/section/Section3";
import {Section4} from "@/app/section/Section4";
import {Section5} from "@/app/section/Section5";

export default function Home() {
  return (
      <main className="h-screen lg:h-[calc(100dvh-4rem)] overflow-y-scroll overflow-x-hidden text-white snap-y snap-mandatory snap-always">
        <Section1 />
        <Section2 />
        <Section3 />
        <Section4 />
        <Section5 />
      </main>
  );
}
