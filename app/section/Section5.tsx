import { twMerge } from "tailwind-merge";
import {SectionContainer} from "@/app/components/SectionContainer";

export const Section5 = () => (
  <SectionContainer sectionIdx={5}>
    <div className="flex flex-1 flex-row items-center justify-center px-10">
      <div className="flex-1 p-8 rounded-lg shadow-xl bg-black bg-opacity-70 text-white font-bold">
        <h1 className="text-4xl font-extrabold mb-6">Roadmap: Firechicken Coin's Path to the Throne</h1>

        <div className="space-y-8">
          <div className="p-2 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Phase 1: Airdrop Events</h2>
            <p className="text-xl">
              Launch the <span className="font-semibold">🔥Spicy Challenge🔥</span> with free airdrops to
              attract community interest.
            </p>
          </div>

          <div className="p-2 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Phase 2: Collaboration and Meme Events</h2>
            <p className="text-xl mb-4">
              <span className="font-semibold">Spicy Meme Viral Campaign:</span> Users create spicy-themed
              memes to earn rewards in FC Coin.
            </p>
            <div className="text-xl italic space-y-4">
              <p>"🔥If you can handle the heat, you can achieve wealth!"</p>
              <p>"🌶️Spiciness equals success!"</p>
              <p>"The spicy coin, Firechicken, claims the throne!"</p>
            </div>
          </div>

          <div className="p-2 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Phase 3: Decentralization</h2>
            <p className="text-xl">
              Support Firechicken initiatives to expand the community globally and enable decentralization.
            </p>
          </div>
        </div>
      </div>
      <img
        className={twMerge("w-[500px]")}
          src="/fire_chicken_char.png"
          alt="Fire Chicken"
      />
    </div>
  </SectionContainer>
);
