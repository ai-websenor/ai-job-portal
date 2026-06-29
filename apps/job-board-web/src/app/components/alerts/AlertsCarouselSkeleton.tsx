'use client';

const AlertsCarouselSkeleton = () => {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="animate-pulse">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 shrink-0 rounded-2xl bg-gray-100" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="h-5 w-40 rounded-full bg-gray-100" />
              <div className="h-6 w-16 rounded-full bg-gray-100" />
            </div>
            <div className="mt-3 h-4 w-full rounded-full bg-gray-100" />
            <div className="mt-2 h-4 w-5/6 rounded-full bg-gray-100" />
            <div className="mt-5 h-11 w-full rounded-xl bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertsCarouselSkeleton;
