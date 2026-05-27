'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import useLocalStorage from '@/app/hooks/useLocalStorage';
import { AlertFrequency, DialogProps, ISavedSearch } from '@/app/types/types';
import {
  ALERT_CHANNELS,
  ALERT_FREQUENCIES,
  buildSearchCriteria,
  formatSavedSearchCriteria,
  generateAlertName,
  hasActiveSearchCriteria,
  JobAlertSearchFilters,
  parseAlertChannels,
  parseSavedSearchCriteria,
  SAVED_SEARCH_LIMIT,
} from '@/app/utils/jobAlertUtils';
import {
  addToast,
  Button,
  Checkbox,
  CheckboxGroup,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Radio,
  RadioGroup,
} from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { IoCloseOutline } from 'react-icons/io5';

interface Props extends DialogProps {
  mode: 'create' | 'edit';
  filters?: JobAlertSearchFilters;
  savedSearch?: ISavedSearch | null;
  savedSearchCount?: number;
  onSaved: () => void;
}

const JobAlertDialog = ({
  isOpen,
  onClose,
  mode,
  filters,
  savedSearch,
  savedSearchCount,
  onSaved,
}: Props) => {
  const router = useRouter();
  const { getLocalStorage } = useLocalStorage();
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<AlertFrequency>('instant');
  const [channels, setChannels] = useState<string[]>(['email', 'push']);
  const [saving, setSaving] = useState(false);
  const [countLoading, setCountLoading] = useState(false);
  const [currentCount, setCurrentCount] = useState<number | null>(savedSearchCount ?? null);

  const criteriaString = useMemo(() => {
    if (mode === 'edit') {
      return savedSearch?.searchCriteria || '{}';
    }

    return buildSearchCriteria(filters || {});
  }, [filters, mode, savedSearch]);

  const criteriaSummary = useMemo(
    () => formatSavedSearchCriteria(criteriaString),
    [criteriaString],
  );

  const hasCriteria = useMemo(() => {
    if (mode === 'edit') {
      return Object.keys(parseSavedSearchCriteria(criteriaString)).length > 0;
    }

    return hasActiveSearchCriteria(filters || {});
  }, [criteriaString, filters, mode]);

  const isAtLimit =
    mode === 'create' && currentCount !== null && currentCount >= SAVED_SEARCH_LIMIT;

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && savedSearch) {
      setName(savedSearch.name || '');
      setFrequency(savedSearch.alertFrequency || 'daily');
      setChannels(parseAlertChannels(savedSearch.alertChannels));
      return;
    }

    setName(generateAlertName(filters || {}));
    setFrequency('instant');
    setChannels(['email', 'push']);
  }, [filters, isOpen, mode, savedSearch]);

  useEffect(() => {
    if (savedSearchCount !== undefined) {
      setCurrentCount(savedSearchCount);
      return;
    }

    if (!isOpen || mode !== 'create') return;

    const getSavedSearchCount = async () => {
      try {
        setCountLoading(true);
        const response: any = await http.get(ENDPOINTS.SAVED_SEARCHES.LIST);
        setCurrentCount(response?.data?.length ?? 0);
      } catch (error) {
        console.log(error);
      } finally {
        setCountLoading(false);
      }
    };

    getSavedSearchCount();
  }, [isOpen, mode, savedSearchCount]);

  const handleSubmit = async () => {
    const token = getLocalStorage('token');
    if (!token) {
      onClose();
      router.push(routePaths.auth.login);
      return;
    }

    if (!name.trim() || channels.length === 0 || isAtLimit) return;

    try {
      setSaving(true);

      const body =
        mode === 'create'
          ? {
              name: name.trim(),
              searchCriteria: criteriaString,
              alertEnabled: true,
              alertFrequency: frequency,
              alertChannels: channels.join(','),
            }
          : {
              name: name.trim(),
              alertFrequency: frequency,
              alertChannels: channels.join(','),
            };

      const response: any =
        mode === 'create'
          ? await http.post(ENDPOINTS.SAVED_SEARCHES.LIST, body)
          : await http.put(ENDPOINTS.SAVED_SEARCHES.DETAILS(savedSearch?.id || ''), body);

      addToast({
        color: 'success',
        title: 'Success',
        description:
          mode === 'create'
            ? response?.message || 'Job alert saved!'
            : response?.message || 'Job alert updated',
      });

      onSaved();
      onClose();
    } catch (error) {
      const message = (error as { message?: string })?.message || '';

      if (message.toLowerCase().includes('maximum')) {
        addToast({
          color: 'danger',
          title: 'Alert limit reached',
          description: "You've reached the 5 alert limit. Delete one to add a new one.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} hideCloseButton size="lg" scrollBehavior="inside">
      <ModalContent className="rounded-[28px]">
        <ModalHeader className="flex justify-between items-center px-6 pt-6 pb-2">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'create' ? 'Save Job Alert' : 'Edit Job Alert'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {currentCount ?? 0} / {SAVED_SEARCH_LIMIT} alerts used
            </p>
          </div>
          <Button
            isIconOnly
            variant="light"
            onPress={onClose}
            className="text-gray-400 hover:text-gray-600 min-w-8 w-8 h-8"
          >
            <IoCloseOutline size={24} />
          </Button>
        </ModalHeader>

        <ModalBody className="px-6 py-4">
          <div className="flex flex-col gap-5">
            {isAtLimit && (
              <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                You've reached the 5 alert limit. Delete one to add a new one.
              </div>
            )}

            {!hasCriteria && (
              <div className="rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning-700">
                No filters are active, so this alert will match every job.
              </div>
            )}

            <Input
              label="Alert name"
              labelPlacement="outside"
              placeholder="Full Stack Remote"
              value={name}
              onChange={(event) => setName(event.target.value)}
              classNames={{
                inputWrapper: 'bg-gray-50 border-gray-200',
                label: 'font-semibold text-gray-700',
              }}
            />

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Current filters</p>
              <div className="flex flex-wrap gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
                {criteriaSummary.map((item) => (
                  <Chip key={item} size="sm" variant="flat" className="bg-white text-gray-700">
                    {item}
                  </Chip>
                ))}
              </div>
            </div>

            <RadioGroup
              label="Frequency"
              value={frequency}
              onValueChange={(value) => setFrequency(value as AlertFrequency)}
              color="primary"
              classNames={{
                label: 'font-semibold text-gray-700 text-sm',
                wrapper: 'gap-2',
              }}
            >
              {ALERT_FREQUENCIES.map((option) => (
                <Radio key={option.value} value={option.value}>
                  <span className="text-sm font-medium text-gray-800">{option.label}</span>
                  <span className="block text-xs text-gray-500">{option.description}</span>
                </Radio>
              ))}
            </RadioGroup>

            <CheckboxGroup
              label="Channels"
              value={channels}
              onValueChange={setChannels}
              color="primary"
              orientation="horizontal"
              classNames={{
                label: 'font-semibold text-gray-700 text-sm',
                wrapper: 'gap-4',
              }}
            >
              {ALERT_CHANNELS.map((option) => (
                <Checkbox key={option.value} value={option.value}>
                  {option.label}
                </Checkbox>
              ))}
            </CheckboxGroup>
          </div>
        </ModalBody>

        <ModalFooter className="px-6 pb-6 pt-2">
          <Button variant="flat" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={handleSubmit}
            isLoading={saving || countLoading}
            isDisabled={!name.trim() || channels.length === 0 || isAtLimit}
          >
            {mode === 'create' ? 'Save Alert' : 'Save Changes'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default JobAlertDialog;
