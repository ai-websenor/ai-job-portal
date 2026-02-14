"use client";

import { Button, Input } from "@heroui/react";
import { FiMapPin, FiSearch } from "react-icons/fi";

const CompanySearchHeader = () => {
  return (
    <div
      style={{
        backgroundImage: `url('/assets/images/hero-bg-2.png')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      className="relative min-h-[300px] flex items-center justify-center sm:px-20 px-5 py-12 overflow-hidden bg-secondary"
    >
      <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-grid-slate-200/[0.04]" />
      <div className="w-full max-w-5xl relative z-10 text-center">
        <h3 className="font-bold text-4xl sm:text-5xl text-gray-900 leading-tight">
          Find the Right <span className="text-primary">Company</span> for You
        </h3>
        <p className="text-gray-500 mt-4 text-lg max-w-2xl mx-auto">
          Explore organizations that value your skills, ambitions, and
          individuality. Start building your future with the perfect employer.
        </p>

        <div className="flex flex-col md:flex-row items-center bg-white p-2 rounded-2xl shadow-xl shadow-primary/5 border border-gray-100 mt-10 max-w-4xl mx-auto">
          <Input
            type="text"
            placeholder="Where do you want to work?"
            variant="flat"
            radius="none"
            startContent={
              <FiSearch className="text-primary text-xl shrink-0 mr-2" />
            }
            fullWidth
            className="w-full"
            name="query"
            classNames={{
              inputWrapper:
                "bg-transparent hover:bg-transparent focus-within:bg-transparent h-14 border-r-0 md:border-r border-gray-100 px-4",
              input: "text-base",
            }}
          />

          <Input
            type="text"
            fullWidth
            placeholder="Location"
            variant="flat"
            radius="none"
            startContent={
              <FiMapPin className="text-primary text-xl shrink-0 mr-2" />
            }
            className="w-full"
            classNames={{
              inputWrapper:
                "bg-transparent hover:bg-transparent focus-within:bg-transparent h-14 px-4",
              input: "text-base",
            }}
          />

          <Button
            color="primary"
            radius="lg"
            className="w-full md:w-auto h-14 px-10 font-bold text-white text-base shadow-lg shadow-primary/20 shrink-0 mt-2 md:mt-0"
          >
            Search
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompanySearchHeader;
