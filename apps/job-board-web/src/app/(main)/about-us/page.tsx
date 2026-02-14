"use client";

import {
  Button,
  Card,
  CardBody,
  Image,
  Avatar,
  AvatarGroup,
} from "@heroui/react";
import { HiArrowTrendingUp } from "react-icons/hi2";
import { motion } from "framer-motion";

const page = () => {
  return (
    <>
      <title>About Us</title>
      <section className="py-16 bg-[#FAFAFA] overflow-hidden min-h-screen flex items-center">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-32 items-center">
            <div className="relative flex flex-col sm:flex-row gap-8 items-center lg:items-start justify-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex flex-col gap-8 w-full sm:w-1/2 relative"
              >
                <div className="relative z-10">
                  <Image
                    alt="Team collaboration"
                    className="object-cover rounded-[3rem] shadow-2xl w-full border-8 border-white"
                    src="/assets/images/contact-1.png"
                  />
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="absolute -bottom-10 -left-10 z-30 hidden sm:block w-72"
                >
                  <div className="p-1 bg-white rounded-[2rem] shadow-3xl">
                    <Image
                      src="/assets/images/contact-2.png"
                      alt="Best Ratings"
                      className="rounded-[1.8rem]"
                    />
                  </div>
                </motion.div>

                <div className="sm:hidden w-full px-4 mt-4">
                  <Image
                    src="/assets/images/contact-2.png"
                    alt="Best Ratings"
                    className="shadow-2xl rounded-2xl w-full"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="flex flex-col gap-8 w-full sm:w-1/2 sm:mt-20"
              >
                <Card className="shadow-2xl border-none rounded-[3rem] bg-white p-2">
                  <CardBody className="p-10">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-5xl font-black text-slate-900 tracking-tighter italic">
                        30,000+
                      </h3>
                      <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-500">
                        <HiArrowTrendingUp size={32} />
                      </div>
                    </div>
                    <p className="text-md text-gray-400 font-medium leading-relaxed mb-8 max-w-[220px]">
                      Sales in July 2021 with 5 star ratings and happy clients.
                    </p>

                    <div className="h-[2px] w-full bg-slate-50 mb-8" />

                    <div className="flex items-center gap-0">
                      <AvatarGroup
                        isBordered
                        max={5}
                        size="md"
                        total={129}
                        className="justify-start ml-2"
                      >
                        <Avatar src="https://i.pravatar.cc/150?u=a042581f4e29026024d" />
                        <Avatar src="https://i.pravatar.cc/150?u=a042581f4e29026704d" />
                        <Avatar src="https://i.pravatar.cc/150?u=a04258114e29026702d" />
                        <Avatar src="https://i.pravatar.cc/150?u=a048581f4e29026701d" />
                        <Avatar src="https://i.pravatar.cc/150?u=a092581d4ef9026700d" />
                      </AvatarGroup>
                    </div>
                  </CardBody>
                </Card>

                <div className="relative group z-10">
                  <Image
                    alt="Workspace"
                    className="object-cover rounded-[3rem] shadow-2xl w-full border-8 border-white"
                    src="/assets/images/contact-3.png"
                  />
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col gap-10 lg:pl-12"
            >
              <div>
                <span className="text-sm font-black tracking-[0.4em] text-[#7C69EF] uppercase flex items-center gap-4">
                  <span className="h-[2px] w-10 bg-[#7C69EF]"></span>A Bit
                </span>
                <h1 className="text-6xl md:text-8xl font-black text-slate-900 mt-6 tracking-tight leading-[0.9]">
                  ABOUT US
                </h1>
              </div>

              <p className="text-xl text-gray-500/90 leading-relaxed max-w-xl font-medium">
                From they fine john he give of rich he. They age and draw mrs
                like. Improving end distrusts may instantly was household
                applauded incommode. Why kept very ever home mrs. Considered
                sympathize ten uncommonly occasional assistance sufficient not.
              </p>

              <div className="mt-4">
                <Button
                  size="lg"
                  className="bg-[#7C69EF] text-white font-black px-14 py-10 rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(124,105,239,0.5)] hover:shadow-[0_30px_60px_-12px_rgba(124,105,239,0.6)] transition-all duration-500 transform hover:-translate-y-2 active:scale-95"
                >
                  EXPLORE MORE
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default page;
