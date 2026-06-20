'use client';

import { Button, Chip } from '@heroui/react';
import { useRouter } from 'next/navigation';
import AlertsCarousel from './AlertsCarousel';
import AlertsCarouselSkeleton from './AlertsCarouselSkeleton';
import type { Alert } from '@/app/types/alerts';

type Props = {
  title: string;
  alerts: Alert[];
  count: number;
  loading: boolean;
  viewAllHref?: string;
  emptyMessage: string;
  actionLabel?: string;
};

const AlertsFeedPreview = ({
  title,
  alerts,
  count,
  loading,
  viewAllHref,
  emptyMessage,
  actionLabel = 'View all',
}: Props) => {
  const router = useRouter();

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-start justify-between border-b pb-2 gap-3">
        <div className="min-w-0">
          <h3 className="text-md font-bold text-gray-950">{title}</h3>
          {/* <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            {count} total
          </p> */}
        </div>

        <Chip size="sm" variant="flat" className="bg-secondary text-primary">
          {count}
        </Chip>
      </div>

      {loading && !alerts.length ? (
        <AlertsCarouselSkeleton />
      ) : alerts.length > 0 ? (
        <AlertsCarousel alerts={alerts} slidesPerView={1} intervalMs={3000} />
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm leading-6 text-gray-500">
          {emptyMessage}
        </div>
      )}

      {!loading && viewAllHref ? (
        <Button
          color="primary"
          variant="flat"
          radius="lg"
          onPress={() => router.push(viewAllHref)}
          className="mt-4 w-full font-semibold"
        >
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
};

export default AlertsFeedPreview;
