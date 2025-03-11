"use client";

import Image from "next/image";
import { useRef, useEffect } from "react";

const needBG: number[] = [1, 2, 3, 4, 5];
const needMBG: number[] = [];
const videoSection: number[] = [1];

export const SectionContainer = ({
  children,
  sectionIdx = 1,
  className,
}: {
  children: React.ReactNode;
  sectionIdx?: number;
  className?: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSection.includes(sectionIdx)) return;

    let isFirstPlay = true;

    const handleVideoEnd = () => {
      if (isFirstPlay) {
        // 처음 재생 후 5초로 이동
        video.currentTime = 3;
        video.play();
        isFirstPlay = false;
      }
    };

    const handleTimeUpdate = () => {
      if (!isFirstPlay && video.currentTime >= 10) {
        // 10초에 도달하면 5초로 되돌림
        video.currentTime = 3;
      }
    };

    video.addEventListener("ended", handleVideoEnd);
    video.addEventListener("timeupdate", handleTimeUpdate);

    // 컴포넌트 언마운트 시 이벤트 제거
    return () => {
      video.removeEventListener("ended", handleVideoEnd);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [sectionIdx]);

  return (
    <section
      id={`section-${sectionIdx}`}
      className={`text-[#F90C02] ${
        sectionIdx === 1 ? "h-auto" : "min-h-full"
      } font-medium relative flex flex-1 flex-col w-dvw lg:w-full lg:h-[calc(100dvh-3.9rem)] lg:snap-center ${
        sectionIdx > 10 ? "lg:overflow-y-scroll" : "lg:overflow-hidden"
      } ${className}`}
    >
      {children}
      {sectionIdx === 4 ? (
        <div className="bg-[#020417] absolute inset-0 -z-10 grid h-screen w-screen grid-cols-10 grid-rows-10">
          {Array.from({ length: 100 }).map((_, idx) => (
            <img key={idx} src="/fire_chicken_char.png" alt="Fire Chicken" />
          ))}
        </div>
      ) : (
        <>
          {sectionIdx && needBG.includes(sectionIdx) ? (
            <>
              {videoSection.includes(sectionIdx) ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="lg:absolute inset-0 -z-10 w-full lg:block"
                >
                  <source
                    src={`/section${sectionIdx}-bg_animation.mp4`}
                    type="video/mp4"
                  />
                </video>
              ) : (
                <>
                  <Image
                    className="absolute inset-0 -z-10 lg:block hidden"
                    src={`/section${sectionIdx}-bg.${
                      sectionIdx === 5 ? "png" : "webp"
                    }`}
                    alt={`background image for section ${sectionIdx}`}
                    style={{ objectFit: "cover", objectPosition: "top" }}
                    fill
                    sizes="100dvw"
                  />
                </>
              )}
            </>
          ) : (
            <div className="absolute inset-0 -z-10 bg-[#020417] block lg:hidden"></div>
          )}
        </>
      )}
    </section>
  );
};
