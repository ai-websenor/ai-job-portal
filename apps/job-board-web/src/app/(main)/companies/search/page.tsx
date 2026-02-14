"use client";

import CompanyFilterSection from "@/app/components/company-search/CompanyFilterSection";
import CompanySearchHeader from "@/app/components/company-search/CompanySearchHeader";
import CompanySection from "@/app/components/company-search/CompanySection";
import JobSearchRightSection from "@/app/components/job-search/JobSearchRightSection";
import { Button, Drawer, DrawerBody, DrawerContent } from "@heroui/react";
import { useState } from "react";
import { HiFilter } from "react-icons/hi";

const page = () => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <>
      <title>Company Search</title>
      <div className="h-full">
        <CompanySearchHeader />
        <div className="container mx-auto my-8 px-4 flex flex-col lg:flex-row gap-8 relative items-start">
          <div className="hidden lg:block w-[320px] flex-shrink-0">
            <CompanyFilterSection />
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between mb-5">
              <p>Showing 3177 results</p>
              <Button
                className="lg:hidden"
                variant="flat"
                color="primary"
                startContent={<HiFilter size={18} />}
                onPress={() => setIsFilterOpen(true)}
              >
                Filters
              </Button>
            </div>

            <div className="flex flex-col gap-6">
              <CompanySection />
            </div>
          </div>
          <div className="hidden xl:block w-[300px] flex-shrink-0">
            <JobSearchRightSection />
          </div>
        </div>

        <Drawer
          isOpen={isFilterOpen}
          onOpenChange={setIsFilterOpen}
          placement="left"
          size="xs"
        >
          <DrawerContent>
            {() => (
              <DrawerBody className="p-0 overflow-y-auto">
                <CompanyFilterSection />
              </DrawerBody>
            )}
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
};

export default page;
