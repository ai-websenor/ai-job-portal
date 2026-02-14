"use client";

import Image from "next/image";
import { Button } from "@heroui/react";
import { FiSearch, FiMapPin } from "react-icons/fi";
import { useRouter } from "next/navigation";
import routePaths from "@/app/config/routePaths";
import APP_CONFIG from "@/app/config/config";

const HeroSection = () => {
  const router = useRouter();

  return (
    <section className="relative w-full pt-14 overflow-hidden bg-[#F1F3FF]">
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `linear-gradient(#B8BFFF 1.5px, transparent 1.5px), linear-gradient(90deg, #B8BFFF 1.5px, transparent 1.5px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="container relative z-10 px-4 mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-[#111827] leading-[1.15]">
          Discover the Perfect{" "}
          <span className="text-primary">{APP_CONFIG.APP_NAME}</span> for{" "}
          <br className="hidden md:block" /> Your Career or Hiring Needs
        </h1>

        <p className="max-w-3xl mx-auto mt-8 text-lg md:text-xl text-gray-500 font-medium leading-relaxed">
          Find You New Job Today! New Job Postings Everyday just for you, browse
          the job you want and apply wherever you want
        </p>

        <div
          onClick={() => router.push(routePaths.jobs.search)}
          className="max-w-4xl mx-auto mt-12 bg-white p-2 rounded-md sm:rounded-full shadow-[0_20px_50px_rgba(128,112,239,0.15)] flex flex-col md:flex-row items-center gap-2 border border-secondary"
        >
          <div className="flex items-center flex-1 w-full px-5 gap-3 md:border-r border-gray-100">
            <FiSearch className="text-primary text-2xl flex-shrink-0" />
            <input
              type="text"
              placeholder="Job title or keyword"
              className="w-full py-4 text-gray-700 outline-none text-base bg-transparent font-medium placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center flex-1 w-full px-5 gap-3">
            <FiMapPin className="text-primary text-2xl flex-shrink-0" />
            <input
              type="text"
              placeholder="Bandung, Indonesia"
              className="w-full py-4 text-gray-700 outline-none text-base bg-transparent font-medium placeholder:text-gray-400"
            />
          </div>
          <Button
            color="primary"
            size="lg"
            className="w-full md:w-auto h-14 px-10 text-lg font-bold rounded-full shadow-lg shadow-primary/20"
          >
            Search
          </Button>
        </div>

        <div className="mt-8">
          <Button className="h-14 px-10 text-lg font-bold rounded-full bg-primary text-white shadow-xl shadow-primary/30 hover:scale-105 transition-transform">
            Find relevant posted jobs
          </Button>
        </div>

        <div className="relative max-w-6xl mx-auto mt-12 md:mt-16 flex justify-center items-end">
          <div className="absolute left-0 bottom-[40%] z-20 hidden lg:block transform -translate-x-1/2 md:translate-x-0">
            <Image
              src="/assets/images/hero-1.png"
              alt="Stats Card"
              width={200}
              height={120}
              className="object-contain drop-shadow-2xl animate-soft-bounce"
            />
          </div>

          <div className="relative z-10 w-full max-w-4xl mx-auto">
            <Image
              src="/assets/images/experts.png"
              alt="Professional Experts"
              width={1000}
              height={600}
              priority
              className="mx-auto select-none"
            />
          </div>

          <div className="absolute right-0 bottom-[40%] z-20 hidden lg:block transform translate-x-1/2 md:translate-x-0">
            <Image
              src="/assets/images/hero-2.png"
              alt="Process Card"
              width={200}
              height={120}
              className="object-contain drop-shadow-2xl animate-soft-bounce-delayed"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
