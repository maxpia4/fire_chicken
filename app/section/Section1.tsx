"use client";

import {SectionContainer} from "@/app/components/SectionContainer";
import {Header} from "@/app/components/Header";
import React from "react";

export const Section1 = () => {
  return (
    <SectionContainer sectionIdx={1}>
      <Header />
      <div className="flex-1 h-full"></div>
    </SectionContainer>
  );
}
