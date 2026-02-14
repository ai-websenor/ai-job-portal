"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiWifiOffLine, RiWifiLine } from "react-icons/ri";
import { Card, CardBody } from "@heroui/react";

const NoInternet = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      const timer = setTimeout(() => {
        setShowBackOnline(false);
      }, 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBackOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-xs pointer-events-none">
      <AnimatePresence mode="wait">
        {!isOnline && (
          <motion.div
            key="offline"
            initial={{ y: -100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <Card className="bg-danger/10 border-danger/20 border-1 backdrop-blur-md shadow-2xl">
              <CardBody className="py-3 px-4">
                <div className="flex items-center gap-4">
                  <div className="bg-danger/20 p-2.5 rounded-2xl">
                    <RiWifiOffLine className="text-2xl text-danger" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-danger-700">
                      No Connection
                    </span>
                    <span className="text-[11px] text-danger-600/80 font-medium">
                      Check your internet settings
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}

        {showBackOnline && (
          <motion.div
            key="online"
            initial={{ y: -100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <Card className="bg-success/10 border-success/20 border-1 backdrop-blur-md shadow-2xl">
              <CardBody className="py-3 px-4">
                <div className="flex items-center gap-4">
                  <div className="bg-success/20 p-2.5 rounded-2xl">
                    <RiWifiLine className="text-2xl text-success" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-success-700">
                      Back Online
                    </span>
                    <span className="text-[11px] text-success-600/80 font-medium">
                      Connection restored
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NoInternet;
