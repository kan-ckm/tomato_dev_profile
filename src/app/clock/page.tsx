import React from "react";
import type { Metadata } from "next";
import { CoreBlock3D } from "@/components/clock/CoreBlock3D";

export const metadata: Metadata = {
  title: "TOMATODEVS — CLOCK",
  description: "TOMATODEVS 3D Armillary Sphere & Clock",
  openGraph: {
    title: "TOMATODEVS — CLOCK",
    description: "TOMATODEVS 3D Armillary Sphere & Clock",
  },
  twitter: {
    title: "TOMATODEVS — CLOCK",
    description: "TOMATODEVS 3D Armillary Sphere & Clock",
  },
};

export default function ClockPage() {
  return (
    <div className="clock-page relative h-screen w-screen overflow-hidden">
      <CoreBlock3D />
    </div>
  );
}
