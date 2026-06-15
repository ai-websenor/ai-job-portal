'use client';

import { Button } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { FiHeadphones, FiShield, FiUsers } from 'react-icons/fi';
import AlertsCarousel from '@/app/components/alerts/AlertsCarousel';
import AlertsCarouselSkeleton from '@/app/components/alerts/AlertsCarouselSkeleton';
import useAlerts from '@/app/hooks/useAlerts';
import routePaths from '@/app/config/routePaths';

const cards = [
  {
    title: 'Manage Company Profile',
    description: 'Keep company details, brand images, and hiring identity current.',
    icon: FiShield,
    cta: 'Manage Profile',
    href: routePaths.employee.profile,
    secondaryCta: null,
  },
  {
    title: 'Manage Members',
    description: 'Add recruiters and assign access for a cleaner hiring workflow.',
    icon: FiUsers,
    cta: 'Manage Members',
    href: routePaths.employee.members.list,
    secondaryCta: 'View Members',
  },
  {
    title: 'Need Help?',
    description: 'Contact support if candidate access, profile data, or shortlist actions fail.',
    icon: FiHeadphones,
    cta: 'Contact Support',
    href: routePaths.contactUs,
    secondaryCta: null,
  },
];

const CandidateSearchRightRail = () => {
  const router = useRouter();
  const { alerts, loading } = useAlerts();

  return (
    <aside className="grid gap-5">
      {loading && !alerts.length ? <AlertsCarouselSkeleton /> : null}
      {!loading && alerts.length > 0 ? (
        <AlertsCarousel alerts={alerts} slidesPerView={1} intervalMs={6000} />
      ) : null}
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-2xl text-primary">
              <Icon />
            </div>
            <h3 className="text-lg font-bold leading-7 text-gray-950">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">{card.description}</p>
            <Button
              color="primary"
              radius="lg"
              onPress={() => router.push(card.href)}
              className="mt-5 w-full font-bold"
            >
              {card.cta}
            </Button>
            {card.secondaryCta && (
              <Button
                variant="light"
                color="primary"
                onPress={() => router.push(card.href)}
                className="mt-2 w-full font-bold"
              >
                {card.secondaryCta}
              </Button>
            )}
          </div>
        );
      })}
    </aside>
  );
};

export default CandidateSearchRightRail;
