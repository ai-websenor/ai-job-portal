"use client";

import { Alert, Card, CardBody } from "@heroui/react";
import { LuLightbulb } from "react-icons/lu";
import { IoCheckmarkCircleOutline } from "react-icons/io5";
import APP_CONFIG from "../config/config";

const FooterSection = () => {
  return (
    <>
      <div className="w-full max-w-[800px]">
        <Alert
          variant="flat"
          color="warning"
          title="Video Requirements"
          description={APP_CONFIG.RESUME_VIDEO_CONFIGS.ALERT}
        />
      </div>

      <Card className="bg-secondary shadow-sm py-4 px-6 border border-primary/20">
        <CardBody>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-white rounded-full shadow-sm">
              <LuLightbulb className="text-primary text-2xl" />
            </div>
            <h2 className="text-2xl font-bold text-primary">
              Video Recording Tips
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {tips.map((tip, index) => (
              <div key={index} className="flex gap-3">
                <div className="mt-1">
                  <IoCheckmarkCircleOutline className="text-primary text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 leading-tight">
                    {tip.title}
                  </h3>
                  <p className="text-slate-500 mt-1 text-sm leading-relaxed">
                    {tip.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </>
  );
};

export default FooterSection;

const tips = [
  {
    title: "Dress professionally",
    description:
      "Wear what you would wear to an actual interview to make the best impression.",
  },
  {
    title: "Find a quiet space",
    description:
      "Choose a location without background noise or distractions for clear audio.",
  },
  {
    title: "Keep eye contact",
    description:
      "Look directly at the camera lens, not the screen, to simulate eye contact.",
  },
  {
    title: "Speak clearly and naturally",
    description:
      "Be yourself! Talk at a moderate pace and let your personality shine through.",
  },
];
