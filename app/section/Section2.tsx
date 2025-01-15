import { twMerge } from "tailwind-merge";
import {SectionContainer} from "@/app/components/SectionContainer";

export const Section2 = () => (
  <SectionContainer sectionIdx={2}>
    <div className="flex flex-1 flex-row items-center justify-center px-10">
      <img
          className={twMerge("w-[500px]")}
          src="/fire_chicken_char.png"
          alt="Fire Chicken"
      />
      <div className="flex-1 p-8 rounded-lg shadow-xl bg-black bg-opacity-70 text-white font-bold">
        <h1 className="text-5xl font-extrabold mb-6">About Firechicken Coin</h1>

        <p className="text-xl mb-6 leading-relaxed">
          In a world where the cryptocurrency market is flooded with coins, meme coins like PEPE Coin, Doge Coin, and
          Shiba Inu dominate the throne.
          However, investors are growing tired and uninspired. At this moment, Firechicken bursts onto the scene,
          boasting legendary spiciness to deliver a fiery hell to the market.
        </p>

        <h2 className="text-3xl font-bold mb-4">The Birth of Firechicken Coin</h2>
        <p className="text-xl mb-6 leading-relaxed">
          Firechicken, with its unique, intense spiciness, takes on the role of a fiery underworld king, ready to
          challenge the existing meme coins.
        </p>

        <h2 className="text-3xl font-bold mb-4">The Beginning of the Meme Coin War</h2>
        <p className="text-xl mb-6 leading-relaxed">
          Firechicken Coin ignites a spicy war against existing meme coins in the cryptocurrency market.
        </p>

        <div className="text-xl italic mb-8">
          <p>"PEPE is funny, but Firechicken is serious!"</p>
          <p>"DOGE is cute, but Firechicken is intense!"</p>
          <p>"SHIBA is plentiful, but Firechicken is blazing!"</p>
        </div>

        <h2 className="text-3xl font-bold mb-4">Features</h2>
        <p className="text-xl leading-relaxed mb-6">
          "You must endure the spiciness to become truly wealthy!" Those who withstand the heat of Firechicken Coin will
          find happiness in a bull market.
        </p>
      </div>
    </div>
  </SectionContainer>
);
