import BackButton from "@/app/components/lib/BackButton";
import SignupForm from "./SignupForm";

const page = () => {
  return (
    <div className="w-full">
      <BackButton showLabel />
      <h1 className="font-bold text-4xl my-3">Sign Up to start 👋</h1>
      <p className="text-gray-700 text-lg mb-7">
        Today is a new day. It's your day. You shape it. Sign up to start
        managing your jobs.
      </p>
      <SignupForm />
    </div>
  );
};

export default page;
