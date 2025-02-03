import Image from "next/image";

const needBG:number[] = [1,2,3,4,5];
const needMBG:number[] = [];
const videoSection:number[] = [1];
export const SectionContainer = ({
  children,
  sectionIdx = 1,
  className,
}: {
  children: React.ReactNode;
  sectionIdx?: number;
  className?: string;
}) => {
  return (
    <section
      id={`section-${sectionIdx}`}
      className={`text-[#F90C02] ${sectionIdx === 1 ? "h-auto" : "min-h-full" } font-medium relative flex flex-1 flex-col w-dvw lg:w-full lg:h-[calc(100dvh-3.9rem)] lg:snap-center ${sectionIdx > 10 ? "lg:overflow-y-scroll" : "lg:overflow-hidden"} ${className}`}
    >
      <div
        className="absolute inset-0 -z-10 block"
        style={{
          backgroundImage: `url('/section1.png')`,
          backgroundRepeat: "repeat",
          backgroundSize: "contain",
          backgroundPosition: "top",
          width: "100%",
          // height: "100vh",
      }}/>
      {children}
      {sectionIdx === 4 ? (
        <div className="bg-[#020417] absolute inset-0 -z-10 grid h-screen w-screen grid-cols-10 grid-rows-10">
          {Array.from({length: 100}).map((_, idx) => (
            <img
              src="/fire_chicken_char.png"
              alt="Fire Chicken"
            />
          ))}
        </div>
      ) : (
        <>
          {sectionIdx && needBG.includes(sectionIdx) ? (
            <>
              {videoSection.includes(sectionIdx) ? (
                <>
                  <video
                    autoPlay={true}
                    loop
                    muted
                    playsInline
                    className="lg:absolute inset-0 -z-10 w-full lg:block"
                  >
                    <source
                      src={`/section${sectionIdx}-bg_animation.mp4`}
                      type="video/mp4"
                    />
                  </video>
                </>
              ) : (
                <>
                  <Image
                    className="absolute inset-0 -z-10 lg:block hidden"
                    src={`/section${sectionIdx}-bg.${sectionIdx === 5 ? "png" : "webp"}`}
                    alt={`background image for section ${sectionIdx}`}
                    style={{objectFit: "cover", objectPosition: "top"}}
                    fill
                    sizes="100dvw"
                  />
                  {/*<Image*/}
                  {/*  className="absolute inset-0 -z-10 block lg:hidden"*/}
                  {/*  src={`/section1-bg-m.png`}*/}
                  {/*  alt={`background image for mobile section ${sectionIdx}`}*/}
                  {/*  fill*/}
                  {/*  style={{objectFit: "contain", objectPosition: "top"}}*/}
                  {/*  // sizes="auto"*/}
                  {/*/>*/}
                </>
              )}
            </>
          ) : (
            <div className="absolute inset-0 -z-10 bg-[#020417] block lg:hidden"></div>
          )}
        </>)}
    </section>
  );
};
