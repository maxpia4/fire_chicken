import { twMerge } from "tailwind-merge";
import {SectionContainer} from "@/app/components/SectionContainer";

export const Section4 = () => (
  <SectionContainer sectionIdx={4}>
    <div className="flex flex-1 flex-row items-center justify-center px-10">
      <img
          className={twMerge("w-[500px]")}
          src="/fire_chicken_char.png"
          alt="Fire Chicken"
      />
      <div className="flex-1  p-8 rounded-lg shadow-xl bg-black bg-opacity-70 text-white font-bold">
        <h1 className="text-4xl font-extrabold mb-6">Tokenomics</h1>

        <div className="space-y-6">
          <div className="p-6 rounded-lg shadow-md">
            <p className="text-xl">
              Total Supply: 10 billion tokens.
            </p>
          </div>
        </div>
      </div>
    </div>
  </SectionContainer>
);
