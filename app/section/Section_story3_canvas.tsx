"use client";
import React, { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Plane } from "@react-three/drei";
import { EffectComposer, WaterEffect } from "@react-three/postprocessing";

function VideoPlane({ src, visible }: { src: string; visible: boolean }) {
  const meshRef = useRef<any>(null);
  const [video] = useState(() => {
    if (typeof window === "undefined") return null;
    const vid = document.createElement("video");
    vid.src = src;
    vid.crossOrigin = "Anonymous";
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.autoplay = true;
    vid.play();
    return vid;
  });

  React.useEffect(() => {
    if (video && visible) video.play();
    else if (video) video.pause();
  }, [visible, video]);

  if (!video) return null;

  return (
    <Plane ref={meshRef} args={[4, 2.25]} visible={visible}>
      {/* @ts-ignore */}
      <meshBasicMaterial attach="material" map={new (window as any).THREE.VideoTexture(video)} toneMapped={false} />
    </Plane>
  );
}

const WaterTransition = ({ showSecond }: { showSecond: boolean }) => {
  const [waterStrength, setWaterStrength] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  React.useEffect(() => {
    if (showSecond) {
      setTransitioning(true);
      let frame = 0;
      const totalFrames = 60;
      const animate = () => {
        frame++;
        setWaterStrength(Math.min(1, frame / totalFrames));
        if (frame < totalFrames) {
          requestAnimationFrame(animate);
        } else {
          setTransitioning(false);
        }
      };
      animate();
    } else {
      setWaterStrength(0);
    }
  }, [showSecond]);

  return (
    <>
      <VideoPlane src="/story_4.webm" visible={!showSecond || transitioning} />
      <VideoPlane src="/story_5-1.webm" visible={showSecond} />
      <EffectComposer>
        <WaterEffect factor={waterStrength} />
      </EffectComposer>
    </>
  );
};

const Story3Canvas = () => {
  const [showSecond, setShowSecond] = useState(false);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black relative">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <WaterTransition showSecond={showSecond} />
      </Canvas>
      {!showSecond && (
        <div
          onClick={() => setShowSecond(true)}
          className="absolute right-10 top-1/2 transform -translate-y-1/2 cursor-pointer z-20"
        >
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group hover:bg-white/30 transition-all">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-white animate-pulse group-hover:animate-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default Story3Canvas; 