'use client';

import BackButton from '@/app/components/lib/BackButton';
import SignupForm from './SignupForm';
import Link from 'next/link';
import routePaths from '@/app/config/routePaths';

const page = () => {
  return (
    <div className="w-full">
      <BackButton showLabel />
      <h1 className="font-bold text-4xl my-3">Sign Up to start 👋</h1>
      <p className="text-gray-700 text-lg mb-7">
        Today is a new day. It's your day. You shape it. Sign up to start managing your jobs.
      </p>

      <SignupForm />

      <p className="mt-4 text-sm text-center text-gray-500">
        By signing up, you agree to our{' '}
        <button
          onClick={() => window.open(routePaths.cms('terms-conditions'), '_blank')}
          className="text-primary"
        >
          Terms and Conditions
        </button>
      </p>

      <div className="mt-5 text-center">
        Already have an account?{' '}
        <Link href={routePaths.employee.auth.login} className="font-medium text-primary">
          Login
        </Link>
      </div>
    </div>
  );
};

export default page;
