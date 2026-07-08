'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import ConfirmationDialog from '@/app/components/dialogs/ConfirmationDialog';
import JobAlertDialog from '@/app/components/job-alerts/JobAlertDialog';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import routePaths from '@/app/config/routePaths';
import withAuth from '@/app/hoc/withAuth';
import { ISavedSearch } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import {
  formatAlertChannels,
  formatSavedSearchCriteria,
  SAVED_SEARCH_LIMIT,
} from '@/app/utils/jobAlertUtils';
import { addToast, Button, Card, CardBody, Chip, Switch } from '@heroui/react';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  IoAddOutline,
  IoCreateOutline,
  IoNotificationsOutline,
  IoTrashOutline,
} from 'react-icons/io5';

const formatLastAlert = (lastAlertSent: string | null) => {
  if (!lastAlertSent) return 'No matches yet';
  return `Last match: ${dayjs(lastAlertSent).format('MMM D')}`;
};

const Page = () => {
  const router = useRouter();
  const [savedSearches, setSavedSearches] = useState<ISavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [editLoadingId, setEditLoadingId] = useState('');
  const [editingSavedSearch, setEditingSavedSearch] = useState<ISavedSearch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ISavedSearch | null>(null);

  const getSavedSearches = async () => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.SAVED_SEARCHES.LIST);
      setSavedSearches(response?.data ?? []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getSavedSearches();
  }, []);

  const handleToggleAlerts = async (savedSearch: ISavedSearch) => {
    const previousSavedSearches = savedSearches;

    try {
      setUpdatingId(savedSearch.id);
      setSavedSearches((currentSavedSearches) =>
        currentSavedSearches.map((item) =>
          item.id === savedSearch.id ? { ...item, alertEnabled: !item.alertEnabled } : item,
        ),
      );

      const response: any = await http.put(
        ENDPOINTS.SAVED_SEARCHES.TOGGLE_ALERTS(savedSearch.id),
      );

      setSavedSearches((currentSavedSearches) =>
        currentSavedSearches.map((item) =>
          item.id === savedSearch.id
            ? {
                ...item,
                alertEnabled: response?.data?.alertEnabled ?? !savedSearch.alertEnabled,
                updatedAt: response?.data?.updatedAt ?? item.updatedAt,
              }
            : item,
        ),
      );
    } catch (error) {
      console.log(error);
      setSavedSearches(previousSavedSearches);
    } finally {
      setUpdatingId('');
    }
  };

  const handleEdit = async (savedSearchId: string) => {
    try {
      setEditLoadingId(savedSearchId);
      const response: any = await http.get(ENDPOINTS.SAVED_SEARCHES.DETAILS(savedSearchId));
      setEditingSavedSearch(response?.data);
    } catch (error) {
      console.log(error);
    } finally {
      setEditLoadingId('');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setUpdatingId(deleteTarget.id);
      const response: any = await http.delete(ENDPOINTS.SAVED_SEARCHES.DETAILS(deleteTarget.id));
      addToast({
        color: 'success',
        title: 'Success',
        description: response?.message || 'Saved search deleted successfully',
      });
      setDeleteTarget(null);
      getSavedSearches();
    } catch (error) {
      console.log(error);
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <>
      <title>Job Alerts</title>

      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex flex-col gap-2">
              <BackButton showLabel />
              <h1 className="text-2xl font-bold text-gray-900">Job Alerts</h1>
              <p className="text-sm text-gray-500 mt-1">
                {savedSearches.length} / {SAVED_SEARCH_LIMIT} alerts used
              </p>
            </div>

            <Button
              color="primary"
              startContent={<IoAddOutline size={18} />}
              onPress={() => router.push(routePaths.jobs.search)}
              isDisabled={savedSearches.length >= SAVED_SEARCH_LIMIT}
              className="font-semibold"
            >
              Create from Search
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingProgress />
            </div>
          ) : savedSearches.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {savedSearches.map((savedSearch, index) => {
                const criteriaSummary = formatSavedSearchCriteria(savedSearch.searchCriteria);

                return (
                  <Card
                    key={savedSearch.id}
                    className="bg-white border border-gray-100 shadow-sm rounded-2xl"
                  >
                    <CardBody className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h2 className="font-bold text-lg text-gray-900 line-clamp-1">
                              {savedSearch.name}
                            </h2>
                            {!savedSearch.isActive && (
                              <Chip size="sm" color="danger" variant="flat">
                                Inactive
                              </Chip>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Alert {index + 1} of {SAVED_SEARCH_LIMIT}
                          </p>
                        </div>

                        <Switch
                          size="sm"
                          color="primary"
                          isSelected={savedSearch.alertEnabled}
                          isDisabled={updatingId === savedSearch.id}
                          onValueChange={() => handleToggleAlerts(savedSearch)}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        {criteriaSummary.map((item) => (
                          <Chip
                            key={item}
                            size="sm"
                            variant="flat"
                            className="bg-gray-100 text-gray-700"
                          >
                            {item}
                          </Chip>
                        ))}
                      </div>

                      <div className="grid gap-2 mt-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <IoNotificationsOutline className="text-primary shrink-0" />
                          <span>
                            {CommonUtils.keyIntoTitle(savedSearch.alertFrequency)} -{' '}
                            {formatAlertChannels(savedSearch.alertChannels)}
                          </span>
                        </div>
                        <div>
                          {savedSearch.alertCount ?? 0}{' '}
                          {(savedSearch.alertCount ?? 0) === 1 ? 'alert' : 'alerts'} sent -{' '}
                          {formatLastAlert(savedSearch.lastAlertSent)}
                        </div>
                        <div className="text-xs text-gray-400">
                          Updated {dayjs(savedSearch.updatedAt).format('MMM D, YYYY')}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-gray-100">
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          startContent={<IoCreateOutline size={16} />}
                          isLoading={editLoadingId === savedSearch.id}
                          onPress={() => handleEdit(savedSearch.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          color="danger"
                          startContent={<IoTrashOutline size={16} />}
                          isLoading={updatingId === savedSearch.id}
                          onPress={() => setDeleteTarget(savedSearch)}
                        >
                          Delete
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <IoNotificationsOutline size={28} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">No job alerts yet</h2>
              <p className="text-sm text-gray-500 mt-2">
                Save a filtered search to get email or push alerts when matching jobs are posted.
              </p>
              <Button
                color="primary"
                className="mt-5 font-semibold"
                onPress={() => router.push(routePaths.jobs.search)}
              >
                Search Jobs
              </Button>
            </div>
          )}
        </div>
      </div>

      {editingSavedSearch && (
        <JobAlertDialog
          mode="edit"
          isOpen={Boolean(editingSavedSearch)}
          savedSearch={editingSavedSearch}
          onClose={() => setEditingSavedSearch(null)}
          onSaved={getSavedSearches}
        />
      )}

      {deleteTarget && (
        <ConfirmationDialog
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="Delete Job Alert"
          color="danger"
          message="This will remove the saved search and free one alert slot."
          confirmLabel="Delete"
          onConfirm={handleDelete}
        />
      )}
    </>
  );
};

export default withAuth(Page);
