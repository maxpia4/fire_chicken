"use client";

import {useState, useRef, useEffect} from "react";
import {Background} from "@/app/components/mobile/Background";
import {Header} from "@/app/components/Header";
import {Title} from "@/app/components/mobile/Title";
import {FloatingBtn} from "@/app/components/mobile/FloatingBtn";
import {SectionContents} from "@/app/components/mobile/SectionContents";
import Head from "next/head";
import {twMerge} from "tailwind-merge";

export const SectionMobile = () => {
  const sections = ["Home", "About", "HowToGet", "Tokenomics", "Roadmap"];
  const [activeSection, setActiveSection] = useState(0);
  const [isFirstPlay, setIsFirstPlay] = useState(true); // 첫 재생 여부 추적
  const videoRef = useRef<HTMLVideoElement | null>(null); // 비디오 요소 참조
  const scrollContainerRef = useRef<HTMLDivElement | null>(null); // 스크롤 컨테이너 참조
  const [showTokenomics, setShowTokenomics] = useState(false);
  const [isLoadMapClicked, setIsLoadMapClicked] = useState(false);
  const [isFirstRendering, setIsFirstRendering] = useState(true)

  // 상단 버튼 중앙 정렬
  useEffect(() => {
    let timer: NodeJS.Timeout | number | undefined;

    // 버튼 클릭 시 중앙 정렬 함수
    const scrollToCenter = (index: number) => {
      const container = scrollContainerRef.current;
      const visibleSections = sections.filter(section => section !== "Home");
      const adjustedIndex = visibleSections.indexOf(sections[index]);
      const button = container?.children[adjustedIndex] as HTMLElement;

      if (container && button) {
        const containerWidth = container.offsetWidth;
        const buttonWidth = button.offsetWidth;
        const buttonLeft = button.offsetLeft;

        // 버튼을 중앙에 맞추기 위한 스크롤 위치 계산
        const scrollPosition =
          buttonLeft - containerWidth / 2 + buttonWidth / 2;

        container.scrollTo({
          left: scrollPosition,
          behavior: "smooth", // 부드러운 스크롤 효과
        });
      }
    };

    if(activeSection !== sections.indexOf("Home")) {
      setIsFirstRendering(false);
      timer = setTimeout(() => {
        scrollToCenter(activeSection);
      }, isFirstRendering? 500 : 10);
    }
    setIsLoadMapClicked(false);
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [activeSection]);

  // Tokenomics 섹션에서만 Tokenomics 이미지 보이기
  useEffect(() => {
    let timer: NodeJS.Timeout | number | undefined;
    if(activeSection === sections.indexOf("Tokenomics")) {
      timer = setTimeout(() => {
        return setShowTokenomics(true);
      }, 1200);
    } else {
      setShowTokenomics(false);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [activeSection]);

  // 비디오 재생 제어
  useEffect(() => {
    const video = videoRef.current;

    if (
      !video ||
      !(activeSection === sections.indexOf("Tokenomics") || activeSection === sections.indexOf("Roadmap"))
    ) return; // Tokenomics 섹션이 아니면 실행 안 함

    const capTime =  activeSection === sections.indexOf("Tokenomics") ? 10 : 2.3;

    const handleEnded = () => {
      if (isFirstPlay) {
        // 첫 재생 후 상태 변경
        setIsFirstPlay(false);
      }
      // 중간부터 재생 시작
      video.currentTime = capTime;
      video.play();
    };

    // 첫 재생이면 0초부터, 이후는 10초부터 시작
    video.currentTime = isFirstPlay ? 0 : capTime;
    video.play();

    // 이벤트 리스너 추가
    video.addEventListener("ended", handleEnded);

    // 클린업: 이벤트 리스너 제거
    return () => {
      video.removeEventListener("ended", handleEnded);
    };
  }, [activeSection, isFirstPlay]); // activeSection 또는 isFirstPlay 변경 시 실행

  return (
    <>
      <Head>
        <link rel="preload" href="/mobile/bg_Tokenomics.mp4" as="video" type="video/mp4"/>
        <link rel="preload" href="/mobile/char_RoadMap.webm" as="video" type="video/webm"/>
        <link rel="preload" href="/mobile/bg_basic.png" as="image"/>
      </Head>
      <div className="w-full h-full">
        <Header activeSection={sections[activeSection]} setActiveSection={setActiveSection}/>
        <div className="h-[90px]"/>
        <div className={twMerge(
          activeSection !== sections.indexOf("Tokenomics") ? "bg-black" : "",
          "relative h-[calc(100%-90px)]"
          )}
        >
          {/*배경*/}
          <Background activeSection={activeSection} sections={sections} videoRef={videoRef as any} />

          {/*상단 메뉴버튼*/}
          <FloatingBtn
            setActiveSection={setActiveSection}
            activeSection={activeSection}
            sections={sections}
            scrollContainerRef={scrollContainerRef}
            setIsFirstPlay={setIsFirstPlay}
          />

          {/*섹션 별 컨텐츠*/}
          <Title
            sections={sections}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
          />
          <SectionContents
            sections={sections}
            activeSection={activeSection}
            showTokenomics={showTokenomics}
            setIsLoadMapClicked={setIsLoadMapClicked}
            isLoadMapClicked={isLoadMapClicked}
            videoRef={videoRef}
          />
        </div>
      </div>
    </>

  );
};
