import { useEffect, useState } from 'react';
import { City, Country, State } from 'country-state-city';

type Option = {
  label: string;
  value: string;
  isoCode?: string;
  countryCode?: string;
  stateCode?: string;
};

const useCountryStateCity = () => {
  const [countries, setCountries] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);

  useEffect(() => {
    const data = Country.getAllCountries();
    setCountries(data.map((c) => ({ label: c.name, value: c.isoCode, ...c })));
  }, []);

  const getStatesByCountry = async (countryCode: string) => {
    if (!countryCode) return;
    const data = State.getStatesOfCountry(countryCode);
    const formatted = data.map((s) => ({
      label: s.name,
      value: s.isoCode,
      ...s,
    }));
    setStates(formatted);
    setCities([]);
    return formatted;
  };

  const getCitiesByState = async (countryCode: string, stateCode: string) => {
    if (!countryCode || !stateCode) return;
    const data = City.getCitiesOfState(countryCode, stateCode);
    const formatted = data.map((c) => ({
      label: c.name,
      value: c.name,
      ...c,
    }));
    setCities(formatted);
    return formatted;
  };

  const findCountryMatch = (input: string) => {
    if (!input) return null;

    const searchTerm = input.toLowerCase().trim();

    return countries.find(
      (c: any) =>
        c.label.toLowerCase() === searchTerm ||
        c.isoCode.toLowerCase() === searchTerm ||
        c.iso3?.toLowerCase() === searchTerm,
    );
  };

  return {
    countries,
    states,
    cities,
    getStatesByCountry,
    getCitiesByState,
    findCountryMatch,
  };
};

export default useCountryStateCity;
