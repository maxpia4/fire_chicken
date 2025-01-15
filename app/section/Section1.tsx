import { twMerge } from "tailwind-merge";
import {SectionContainer} from "@/app/components/SectionContainer";

export const Section1 = () => (
  <SectionContainer sectionIdx={1}>
    <div className="flex h-screen flex-col items-center justify-center px-10">
      <div className="text-center">
      </div>
    </div>
  </SectionContainer>
);
