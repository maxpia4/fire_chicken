import { twMerge } from "tailwind-merge";
import {SectionContainer} from "@/app/components/SectionContainer";

export const Section3 = () => (
  <SectionContainer sectionIdx={3}>
    <div className="flex flex-1 flex-row items-center justify-center px-10">
      <div className="flex-1 p-8 rounded-lg shadow-lg bg-black bg-opacity-70 text-white font-bold">
        <h1 className="text-5xl font-extrabold mb-6">How to Get Firechicken Coin (How to Buy)</h1>

        <div className="space-y-8">
          <div className="p-2 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Step 1: Create a Phantom Wallet</h2>
            <p className="text-xl leading-relaxed">
              Firechicken Coin is a Solana-based token, so you need to create a Solana-compatible wallet.
            </p>
          </div>

          <div className="p-2 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Step 2: Buy Solana (SOL)</h2>
            <p className="text-xl leading-relaxed">
              Purchase Solana from a cryptocurrency exchange.
            </p>
          </div>

          <div className="p-2 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Step 3: Visit Raydium</h2>
            <p className="text-xl leading-relaxed">
              Head to <a href="https://raydium.io" className="hover:underline text-red-600">https://raydium.io</a> and
              search for Firechicken Token.
            </p>
          </div>

          <div className="p-2 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Step 4: Swap SOL for Firechicken Coin</h2>
            <p className="text-xl leading-relaxed">
              Register your Phantom Wallet on Raydium and perform the token swap.
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
