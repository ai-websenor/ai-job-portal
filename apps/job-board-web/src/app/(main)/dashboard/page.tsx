import DashboardLeftSection from "./DashboardLeftSection";
import DashboardMainSection from "./DashboardMainSection";
import DashboardRightSection from "./DashboardRightSection";

const page = () => {
  return (
    <>
      <title>Dashboard</title>
      <div className="container mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 py-8 px-4 md:px-6">
        <DashboardLeftSection />
        <div className="lg:col-span-2">
          <DashboardMainSection />
        </div>
        <DashboardRightSection />
      </div>
    </>
  );
};

export default page;
