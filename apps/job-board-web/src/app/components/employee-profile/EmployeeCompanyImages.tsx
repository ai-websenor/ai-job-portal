import FileUploader from '../form/FileUploader';

const EmployeeCompanyImages = () => {
  return (
    <div className="bg-white p-5 sm:p-10 rounded-lg w-full ">
      <h3 className="font-medium text-xl mb-5">Images</h3>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="font-medium mb-3">GST Document</h3>
          <FileUploader accept="image/*" onChange={(v) => {}} />
        </div>

        <div>
          <h3 className="font-medium mb-3">Company Logo</h3>
          <FileUploader accept="image/*" onChange={(v) => {}} />
        </div>
      </div>

      <div className="mt-5">
        <h3 className="font-medium mb-3">Company Banner</h3>
        <FileUploader accept="image/*" onChange={(v) => {}} />
      </div>
    </div>
  );
};

export default EmployeeCompanyImages;
