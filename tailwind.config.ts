import type { Config } from "tailwindcss";

const config: {
  plugins: any[];
  theme: {
    extend: { colors: { background: string; foreground: string } };
    keyframes: {
      flyOut2: { "100%": { transform: string; opacity: number }; "0%": { transform: string; opacity: number } };
      flyOut1: { "100%": { transform: string; opacity: number }; "0%": { transform: string; opacity: number } };
      shake: {
        "25%": { transform: string };
        "100%": { transform: string };
        "0%": { transform: string };
        "75%": { transform: string };
        "50%": { transform: string }
      };
      shake2: {
        "25%": { transform: string };
        "100%": { transform: string };
        "0%": { transform: string };
        "75%": { transform: string };
        "50%": { transform: string }
      };
      flyOut4: { "100%": { transform: string; opacity: number }; "0%": { transform: string; opacity: number } };
      flyOut3: { "100%": { transform: string; opacity: number }; "0%": { transform: string; opacity: number } }
    };
    animation: { flyOut2: string; flyOut1: string; shake: string; shake2: string; flyOut4: string; flyOut3: string }
  };
  content: string[]
} = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
    keyframes : {
      flyOut1: {
        "0%": { transform: "translateY(0) translateX(0) rotate(0deg)", opacity: 1 },
        "100%": { transform: "translateY(-1000px) translateX(-1000px) rotate(720deg)", opacity: 0 },
      },
      flyOut2: {
        "0%": { transform: "translateY(0) translateX(0) rotate(0deg)", opacity: 1 },
        "100%": { transform: "translateY(-1000px) translateX(-500px) rotate(-720deg)", opacity: 0 },
      },
      flyOut3: {
        "0%": { transform: "translateY(0) translateX(0) rotate(0deg)", opacity: 1 },
        "100%": { transform: "translateY(-1000px) translateX(500px) rotate(720deg)", opacity: 0 },
      },
      flyOut4: {
        "0%": { transform: "translateY(0) translateX(0) rotate(0deg)", opacity: 1 },
        "100%": { transform: "translateY(-1000px) translateX(1000px) rotate(-720deg)", opacity: 0 },
      },
      shake: {
        "0%": { transform: "translateX(0)" },
        "25%": { transform: "translateX(-10px)" },
        "50%": { transform: "translateX(10px)" },
        "75%": { transform: "translateX(-10px)" },
        "100%": { transform: "translateX(0)" },
      },
      shake2: {
        "0%": { transform: "translateX(0)" },
        "25%": { transform: "translateX(10px)" },
        "50%": { transform: "translateX(-10px)" },
        "75%": { transform: "translateX(10px)" },
        "100%": { transform: "translateX(0)" },
      },
    },
    animation: {
      flyOut1: "flyOut1 0.3s linear 0.3s forwards",
      flyOut2: "flyOut2 0.3s linear 0.3s forwards",
      flyOut3: "flyOut3 0.3s linear 0.3s forwards",
      flyOut4: "flyOut4 0.3s linear 0.3s forwards",
      shake: "shake 0.2s ease-in-out infinite", // 0.3초 동안 반복되는 진동 효과
      shake2: "shake2 0.2s ease-in-out infinite", // 0.3초 동안 반복되는 진동 효과
    },
  },
  plugins: [],
};
export default config;
