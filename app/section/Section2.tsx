import { twMerge } from "tailwind-merge";
import { SectionContainer } from "@/app/components/SectionContainer";

export const Section2 = () => (
  <SectionContainer sectionIdx={2}>
    <div className="flex flex-1 items-center justify-center px-10">
      <img
        className="max-w-[45%] h-auto"
        src="/section2-contents.png"
        alt="Section 2 Contents"
      />
    </div>
  </SectionContainer>
);
