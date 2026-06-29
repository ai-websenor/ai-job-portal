'use client';

import { Button, Input } from '@heroui/react';
import { FiMapPin, FiSearch, FiX } from 'react-icons/fi';
import useCandidateSearchStore from '@/app/store/useCandidateSearchStore';

type Props = {
  onSearch: () => void;
};

const CandidateSearchHero = ({ onSearch }: Props) => {
  const { filters, setFilter, fetchSearch } = useCandidateSearchStore();

  const handleClearSearch = () => {
    setFilter('query', '');
    fetchSearch({ query: '', page: 1 });
  };

  const handleClearLocation = () => {
    setFilter('location', '');
    fetchSearch({ location: '', page: 1 });
  };

  return (
    <section
      className="relative overflow-hidden border-b border-primary/10 bg-secondary px-4 py-12 sm:py-14"
      style={{
        backgroundImage:
          'linear-gradient(rgba(128,112,239,0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(128,112,239,0.11) 1px, transparent 1px), radial-gradient(circle at 50% 20%, rgba(128,112,239,0.18), transparent 38%)',
        backgroundSize: '48px 48px, 48px 48px, 100% 100%',
      }}
    >
      <div className="absolute left-10 top-8 h-28 w-28 rounded-full bg-white/60 blur-3xl" />
      <div className="absolute right-16 bottom-0 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center">
        <p className="mb-3 rounded-full border border-primary/15 bg-white/70 px-4 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary shadow-sm">
          Employer candidate search
        </p>
        <h1 className="max-w-4xl text-4xl font-bold leading-tight text-gray-950 sm:text-5xl">
          Find your next <span className="text-primary">great hire</span> today
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
          Search public candidate profiles by role, skills, location, experience, salary, and
          availability.
        </p>

        <div className="mt-9 flex w-full max-w-4xl flex-col items-stretch rounded-2xl border border-white/70 bg-white p-2 shadow-2xl shadow-primary/10 md:flex-row md:items-center">
          <Input
            type="text"
            aria-label="Search candidates"
            placeholder="Search Candidates (Name, Skill, Job Title)"
            variant="flat"
            radius="none"
            value={filters.query}
            onValueChange={(value) => setFilter('query', value)}
            startContent={<FiSearch className="mr-2 shrink-0 text-xl text-primary" />}
            endContent={
              filters.query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={handleClearSearch}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  <FiX size={18} />
                </button>
              ) : null
            }
            classNames={{
              inputWrapper:
                'h-14 bg-transparent px-4 shadow-none hover:bg-transparent focus-within:bg-transparent md:border-r md:border-gray-100',
              input: 'text-sm',
            }}
          />
          <Input
            type="text"
            aria-label="Candidate location"
            placeholder="Location"
            variant="flat"
            radius="none"
            value={filters.location}
            onValueChange={(value) => setFilter('location', value)}
            startContent={<FiMapPin className="mr-2 shrink-0 text-xl text-primary" />}
            endContent={
              filters.location ? (
                <button
                  type="button"
                  aria-label="Clear location"
                  onClick={handleClearLocation}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  <FiX size={18} />
                </button>
              ) : null
            }
            classNames={{
              inputWrapper:
                'h-14 bg-transparent px-4 shadow-none hover:bg-transparent focus-within:bg-transparent',
              input: 'text-sm',
            }}
          />
          <Button
            color="primary"
            radius="lg"
            onPress={onSearch}
            className="mt-2 h-14 px-10 text-sm font-bold text-white shadow-lg shadow-primary/25 md:mt-0"
          >
            Search
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CandidateSearchHero;
