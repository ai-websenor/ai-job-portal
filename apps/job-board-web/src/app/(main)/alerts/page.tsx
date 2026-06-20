'use client';

import AlertCard from '@/app/components/alerts/AlertCard';
import withAuth from '@/app/hoc/withAuth';
import useAlerts from '@/app/hooks/useAlerts';
import useUserStore from '@/app/store/useUserStore';
import { Roles } from '@/app/types/enum';
import { Card, CardBody, Chip, Tab, Tabs } from '@heroui/react';
import { useState } from 'react';

const AlertListSkeleton = () => {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        >
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
      ))}
    </div>
  );
};

const EmptyState = ({ title, description }: { title: string; description: string }) => {
  return (
    <Card className="border border-dashed border-gray-200 bg-white shadow-none">
      <CardBody className="px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          <span className="text-2xl font-bold">!</span>
        </div>
        <h2 className="text-lg font-bold text-gray-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p>
      </CardBody>
    </Card>
  );
};

const AlertsPage = () => {
  const { user } = useUserStore();
  const {
    interviewAlerts,
    interviewCount,
    subscriptionAlerts,
    subscriptionCount,
    loading,
  } = useAlerts(null);
  const showSubscriptionAlerts =
    user?.role === Roles.employer || user?.role === Roles.super_employer;
  const [selectedTab, setSelectedTab] = useState<'interviews' | 'subscription'>('interviews');

  const interviewPanel = (
    <div className="grid gap-4 xl:grid-cols-2">
      {interviewAlerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  );

  const subscriptionPanel = (
    <div className="grid gap-4 xl:grid-cols-2">
      {subscriptionAlerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  );

  return (
    <>
      <title>Alerts</title>

      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 md:px-6">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-950">Alerts</h1>
              <p className="mt-1 text-sm text-gray-500">
                Review interview and subscription alerts in one place.
              </p>
            </div>

            <div className="flex gap-2">
              <Chip variant="flat" className="bg-secondary text-primary">
                Interviews {interviewCount}
              </Chip>
              {showSubscriptionAlerts ? (
                <Chip variant="flat" className="bg-amber-50 text-amber-700">
                  Subscription {subscriptionCount}
                </Chip>
              ) : null}
            </div>
          </div>

          {loading ? (
            <AlertListSkeleton />
          ) : showSubscriptionAlerts ? (
            <Tabs
              aria-label="Alert feeds"
              selectedKey={selectedTab}
              onSelectionChange={(key) => setSelectedTab(key as 'interviews' | 'subscription')}
              color="primary"
              variant="underlined"
              classNames={{
                tabList: 'gap-6',
              }}
            >
              <Tab key="interviews" title={`Interviews (${interviewCount})`}>
                <div className="mt-6">
                  {interviewAlerts.length > 0 ? (
                    interviewPanel
                  ) : (
                    <EmptyState
                      title="No interview alerts"
                      description="New interview reminders will appear here when they are available."
                    />
                  )}
                </div>
              </Tab>
              <Tab key="subscription" title={`Subscription (${subscriptionCount})`}>
                <div className="mt-6">
                  {subscriptionAlerts.length > 0 ? (
                    subscriptionPanel
                  ) : (
                    <EmptyState
                      title="No subscription alerts"
                      description="Low credit and expiring job reminders will appear here when available."
                    />
                  )}
                </div>
              </Tab>
            </Tabs>
          ) : interviewAlerts.length > 0 ? (
            interviewPanel
          ) : (
            <EmptyState
              title="No interview alerts"
              description="New interview reminders will appear here when they are available."
            />
          )}
        </div>
      </div>
    </>
  );
};

export default withAuth(AlertsPage);
