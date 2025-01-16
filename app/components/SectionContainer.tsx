import Image from "next/image";

const needBG:number[] = [1,2,3,4,5];
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
          className={`text-[#F90C02] font-medium relative flex flex-col w-dvw lg:w-full lg:h-[calc(100dvh-4rem)] lg:snap-center ${sectionIdx > 10 ? "lg:overflow-y-scroll" : "lg:overflow-hidden"} ${className}`}
      >
        {children}
        {sectionIdx === 4 ? (
            <div className="bg-[#020417] absolute inset-0 -z-10 grid h-screen w-screen grid-cols-10 grid-rows-10">
                {Array.from({ length: 100 }).map((_, idx) => (
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
                        <video
                            autoPlay={true}
                            loop
                            muted
                            playsInline
                            className="absolute inset-0 -z-10 w-full hidden lg:block"
                        >
                            <source
                                src={`/section${sectionIdx}-bg_animation.mp4`}
                                type="video/mp4"
                            />
                        </video>
                    ) : (
                        <Image
                            className="absolute inset-0 -z-10 hidden lg:block"
                            src={`/section${sectionIdx}-bg.${sectionIdx === 5 ? "png" : "webp"}`}
                            alt={`background image for section ${sectionIdx}`}
                            style={{objectFit: "cover", objectPosition: "top"}}
                            fill
                            sizes="100dvw"
                        />
                    )}
                    <Image
                        className="absolute inset-0 -z-10 block lg:hidden"
                        src={`/section${sectionIdx}-bg-m.webp`}
                        alt={`background image for mobile section ${sectionIdx}`}
                        fill
                        style={{objectFit: "cover", objectPosition: "top"}}
                        sizes="100dvw"
                    />
                </>
            ) : (
                <div className="absolute inset-0 -z-10 bg-[#020417]"></div>
            )}
        </>)}
      </section>
  );
};
