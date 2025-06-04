import type { Config } from "tailwindcss";

const config: {
  plugins: any[];
  theme: {
    extend: { colors: { background: string; foreground: string } };
    keyframes: {
      fadeIn: { "0%": { opacity: string; transform: string }; "100%": { opacity: string; transform: string } };
      grow: {
        '0%': { transform: string };
        '80%': { transform: string };
        '100%': { transform: string };
      };
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
      flyOut3: { "100%": { transform: string; opacity: number }; "0%": { transform: string; opacity: number } };
      contentShow: {
        "0%": { opacity: string; transform: string };
        "80%": { opacity: string; transform: string };
        "100%": { opacity: string; transform: string };
      };
      contentHide: {
        "0%": { opacity: string; transform: string };
        "100%": { opacity: string; transform: string };
      };
    };
    animation: { grow:string; flyOut2: string; flyOut1: string; shake: string; shake2: string; flyOut4: string; flyOut3: string; fadeIn: string; contentShow: string; contentHide: string; };
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
      fadeIn: {
        "0%": { opacity: "0", transform: "translateY(-20px)" },
        "100%": { opacity: "1", transform: "translateY(0)" },
      },
      grow: {
        '0%': { transform: 'scale(0.1)' }, // 아주 작은 상태에서 시작
        '80%': { transform: 'scale(1.2)' }, // 원래 크기로 커짐
        '100%': { transform: 'scale(1)' }, // 원래 크기로 커짐
      },
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
      contentShow: {
        "0%": { opacity: "0", transform: "scale(0)" },
        "80%": { opacity: "1", transform: "scale(1.2)" },
        "100%": { opacity: "1", transform: "scale(1)" },
      },
      contentHide: {
        "0%": { opacity: "1", transform: "scale(1)" },
        "100%": { opacity: "0", transform: "scale(0)" },
      },
    },
    animation: {
      fadeIn: "fadeIn 1s ease-in-out",
      grow: 'grow 1s ease-in-out forwards', // 1초 동안 실행, 끝난 후 상태 유지
      flyOut1: "flyOut1 0.3s linear 0.3s forwards",
      flyOut2: "flyOut2 0.3s linear 0.3s forwards",
      flyOut3: "flyOut3 0.3s linear 0.3s forwards",
      flyOut4: "flyOut4 0.3s linear 0.3s forwards",
      shake: "shake 0.2s ease-in-out infinite", // 0.3초 동안 반복되는 진동 효과
      shake2: "shake2 0.2s ease-in-out infinite", // 0.3초 동안 반복되는 진동 효과
      contentShow: "contentShow 0.5s ease-out forwards",
      contentHide: "contentHide 0.5s ease-out forwards",
    },
  },
  plugins: [],
};
export default config;
