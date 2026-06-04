import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  isRequired?: boolean;
};

const RequiredLabel = ({ children, isRequired }: Props) => (
  <span>
    {children}
    {isRequired ? <span className="ml-1 text-danger">*</span> : null}
  </span>
);

export default RequiredLabel;
