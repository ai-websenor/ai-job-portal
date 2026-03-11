'use client';

import withAuth from '@/app/hoc/withAuth';

const page = () => {
  return <div>page</div>;
};

export default withAuth(page);
