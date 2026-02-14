"use client";

import { companyData } from "@/app/config/data";
import Image from "next/image";
import { motion } from "framer-motion";

const CompanySection = () => {
  const duplicatedData = [...companyData, ...companyData];

  return (
    <div className="py-20 overflow-hidden bg-white">
      <h2 className="text-3xl text-center mb-10">
        Join Most Well Known{" "}
        <span className="font-semibold text-primary">Companies</span> Around The
        World
      </h2>

      <div className="relative flex overflow-hidden">
        <motion.div
          className="flex gap-20 items-center whitespace-nowrap"
          animate={{
            x: ["0%", "-50%"],
          }}
          transition={{
            ease: "linear",
            duration: 20,
            repeat: Infinity,
          }}
        >
          {duplicatedData.map((company, index) => (
            <div key={index} className="flex-shrink-0">
              <Image
                src={company.src}
                alt={company.alt}
                width={150}
                height={50}
                className="object-contain transition-all"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default CompanySection;
