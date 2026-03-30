import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { DialogProps, IPlan, IPlanPreview } from '@/app/types/types';
import {
  Button,
  Card,
  CardBody,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Chip,
} from '@heroui/react';
import { useEffect, useState } from 'react';
import { FiArrowRight, FiCheckCircle, FiInfo } from 'react-icons/fi';
import dayjs from 'dayjs';

interface Props extends DialogProps {
  plan: IPlan;
  onConfirm?: () => void;
}

const PlanPreviewDialog = ({ isOpen, onClose, plan, onConfirm }: Props) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<IPlanPreview | null>(null);

  const getPreview = async () => {
    try {
      setLoading(true);
      const res = await http.post(ENDPOINTS.SUBSCRIPTIONS.PREVIEW, { planId: plan.id });
      setPreview(res?.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && plan?.id) {
      getPreview();
    }
  }, [isOpen, plan?.id]);

  const renderUsageCard = (
    title: string,
    resourceKey: keyof IPlanPreview['currentUsage'],
    usage: any,
    icon: React.ReactNode,
    carryForward?: number,
  ) => {
    if (!usage) return null;
    return (
      <Card shadow="sm" className="border-none bg-default-50/50">
        <CardBody className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
            <h4 className="font-semibold text-sm capitalize">{title}</h4>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center bg-default-100 p-2 rounded-md">
              <span className="text-default-500">Current Limit</span>
              <span className="font-medium">{usage.currentLimit}</span>
            </div>
            <div className="flex justify-between items-center bg-primary/5 p-2 rounded-md">
              <span className="text-primary-500">New Plan Addition</span>
              <span className="font-bold text-primary">+{usage.newLimit}</span>
            </div>
            {carryForward && carryForward > 0 ? (
              <div className="flex justify-between items-center bg-success/5 p-2 rounded-md">
                <span className="text-success-500 font-medium">Carry Forward</span>
                <span className="font-bold text-success">+{carryForward}</span>
              </div>
            ) : null}
            <Divider className="my-1" />
            <div className="flex justify-between items-center p-2">
              <span className="font-semibold text-default-700">Effective Limit</span>
              <span className="font-bold text-lg text-primary">{usage.effectiveLimit}</span>
            </div>
            <div className="flex justify-between items-center px-2">
              <span className="text-default-400">Current Usage</span>
              <span className="text-default-600 font-medium">{usage.used} consumed</span>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside" backdrop="blur">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 px-6 pt-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Review Your Subscription Plan
              </h2>
              <p className="text-sm font-normal text-default-500">
                Check what changes will apply when you switch to the {plan.name} plan.
              </p>
            </ModalHeader>
            <ModalBody className="px-6 py-4">
              {loading ? (
                <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
                  <Spinner size="lg" color="primary" />
                  <p className="text-default-500 animate-pulse">
                    Calculating your plan adjustments...
                  </p>
                </div>
              ) : preview ? (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
                    <div className="text-center md:text-left">
                      <p className="text-xs uppercase tracking-wider text-default-400 font-bold mb-1">
                        Current Plan
                      </p>
                      <h3 className="text-xl font-bold text-default-800">
                        {preview.currentPlan.name}
                      </h3>
                      <Chip size="sm" variant="flat" color="default" className="mt-1">
                        {preview.currentPlan.billingCycle}
                      </Chip>
                    </div>

                    <div className="flex items-center justify-center animate-pulse">
                      <div className="h-0.5 w-12 bg-primary/20" />
                      <div className="p-2 bg-primary/10 rounded-full">
                        <FiArrowRight className="text-primary text-xl" />
                      </div>
                      <div className="h-0.5 w-12 bg-primary/20" />
                    </div>

                    <div className="text-center md:text-left">
                      <p className="text-xs uppercase tracking-wider text-primary font-bold mb-1">
                        New Plan
                      </p>
                      <h3 className="text-2xl font-black text-primary">{preview.newPlan.name}</h3>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-lg font-bold">
                          {preview.newPlan.currency} {preview.newPlan.price}
                        </span>
                        <span className="text-xs text-default-500 capitalize">
                          / {preview.newPlan.billingCycle}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 p-4 rounded-xl flex gap-3">
                    <FiInfo className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-amber-800 dark:text-amber-400">
                        Activation Details
                      </p>
                      <p className="text-amber-700 dark:text-amber-300/80">
                        {preview.activationBehavior === 'immediate'
                          ? 'Your new plan will activate immediately. Remaining credits from your current plan will be handled as shown below.'
                          : 'Your new plan will be scheduled to start after your current billing cycle ends.'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 font-bold text-default-700">
                      <div className="w-1 h-6 bg-primary rounded-full" />
                      Resource & Credit Snapshot
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {renderUsageCard(
                        'Job Posting',
                        'jobPosting',
                        preview.currentUsage.jobPosting,
                        <FiCheckCircle />,
                        preview.carryForwardCredits.jobPosting,
                      )}
                      {renderUsageCard(
                        'Resume Access',
                        'resumeAccess',
                        preview.currentUsage.resumeAccess,
                        <FiCheckCircle />,
                        preview.carryForwardCredits.resumeAccess,
                      )}
                      {renderUsageCard(
                        'Featured Jobs',
                        'featuredJobs',
                        preview.currentUsage.featuredJobs,
                        <FiCheckCircle />,
                        preview.carryForwardCredits.featuredJobs,
                      )}
                      {renderUsageCard(
                        'Highlighted Jobs',
                        'highlightedJobs',
                        preview.currentUsage.highlightedJobs,
                        <FiCheckCircle />,
                        preview.carryForwardCredits.highlightedJobs,
                      )}
                    </div>
                  </div>

                  {/* Subscription Period */}
                  <div className="rounded-xl border border-default-200 p-4 bg-default-50">
                    <h4 className="text-sm font-semibold text-default-600 mb-3">
                      Subscription Period Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-default-400 text-xs">Current Period Starts</p>
                        <p className="font-medium">
                          {dayjs(preview.currentSubscription.startDate).format('MMM D, YYYY')}
                        </p>
                      </div>
                      <div>
                        <p className="text-default-400 text-xs">Current Period Ends</p>
                        <p className="font-medium text-danger">
                          {dayjs(preview.currentSubscription.endDate).format('MMM D, YYYY')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="min-h-[200px] flex flex-col items-center justify-center text-default-400">
                  <FiInfo size={40} className="mb-2 opacity-20" />
                  <p>Unable to load plan preview details.</p>
                </div>
              )}
            </ModalBody>
            <ModalFooter className="px-6 pb-6">
              <Button variant="light" onPress={onClose} isDisabled={loading}>
                Cancel
              </Button>
              <Button
                color="primary"
                endContent={<FiArrowRight />}
                onPress={() => {
                  onConfirm?.();
                  onClose();
                }}
                isDisabled={loading || !preview}
                className="font-bold shadow-lg shadow-primary/20 px-8"
              >
                Proceed to Payment
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default PlanPreviewDialog;
