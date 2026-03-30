'use client';

import ForgotPasswordForm from '@/app/(auth)/auth/forgot-password/ForgotPasswordForm';
import routePaths from '@/app/config/routePaths';
import withoutAuth from '@/app/hoc/withoutAuth';
import { Roles } from '@/app/types/enum';
import Link from 'next/link';

const page = () => {
  return (
    <div className="w-full">
      <h1 className="font-bold text-4xl my-3">Forgot Password</h1>
      <p className="text-gray-500 text-sm font-medium">
        Go back to{' '}
        <Link href={routePaths.employee.auth.login} className="text-primary">
          Sign In
        </Link>
      </p>
      <p className="text-gray-500 text-sm font-medium mt-1 mb-5">
        Don't have an account{' '}
        <Link href={routePaths.employee.auth.signup} className="text-primary">
          Create Account
        </Link>
      </p>

      <ForgotPasswordForm role={Roles.employer} />
    </div>
  );
};

export default withoutAuth(page);
