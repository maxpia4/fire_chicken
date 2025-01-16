import { twMerge } from "tailwind-merge";
import {SectionContainer} from "@/app/components/SectionContainer";

export const Section4 = () => (
  <SectionContainer sectionIdx={4}>
    <div className="flex flex-1 items-center justify-center">
      <div className="p-8 rounded-lg shadow-xl bg-black bg-opacity-70 text-white font-bold text-center mx-auto">
        <h1 className="text-9xl font-extrabold mb-6">Tokenomics</h1>

        <div className="space-y-6">
          <div className="p-6 rounded-lg shadow-md">
            <p className="text-4xl">
              Total Supply: 10 billion tokens.
            </p>
          </div>
        </div>
      </div>
    </div>
  </SectionContainer>
);
