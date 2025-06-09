"use client";

import Image from "next/image";
import { useRef, useEffect } from "react";

const needBG: number[] = [1, 2, 3, 5];
const needMBG: number[] = [];
const videoSection: number[] = [1, 3, 5];

export const SectionContainer = ({
  children,
  sectionIdx,
  className,
}: {
  children: React.ReactNode;
  sectionIdx?: number;
  className?: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSection.includes(sectionIdx ?? 0)) return;

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
      } font-medium relative flex flex-1 flex-col w-dvw sm:w-full sm:h-[calc(100dvh)] sm:snap-center ${
        (sectionIdx ?? 0) > 10 ? "sm:overflow-y-scroll" : "sm:overflow-hidden"
      } ${className}`}
    >
      {children}
        <>
          {sectionIdx && needBG.includes(sectionIdx) ? (
            <>
              {videoSection.includes(sectionIdx) ? (
                <video
                  loop
                  autoPlay
                  muted
                  playsInline
                  className="sm:absolute inset-0 w-full h-full object-cover -z-10"
                >
                  <source
                    src={`/section${sectionIdx}-bg_animation.webm`}
                    type="video/webm"
                  />
                </video>
              ) : (
                <>
                  <Image
                    className="absolute inset-0 -z-10 sm:block hidden"
                    src={`/section${sectionIdx}-bg.${
                      sectionIdx === 5 || sectionIdx === 2 ? "png" : "webp"
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
    </section>
  );
};
