import { useEffect, useState } from "react";
import { GetCity, GetCountries, GetState } from "react-country-state-city";

type Option = {
  label: string;
  value: string;
};

const useCountryStateCity = () => {
  const [countries, setCountries] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);

  useEffect(() => {
    GetCountries().then((data: any) => {
      if (data) {
        setCountries(
          data?.map((c: any) => ({ label: c.name, value: c.id, ...c })),
        );
      }
    });
  }, []);

  const getStatesByCountry = async (countryId: number) => {
    if (!countryId) return;
    const data = await GetState(countryId);
    const formatted = data.map((s: any) => ({
      label: s.name,
      value: s.id,
      ...s,
    }));
    setStates(formatted as any);
    setCities([]);
    return formatted;
  };

  const getCitiesByState = async (countryId: number, stateId: number) => {
    if (!countryId || !stateId) return;
    const data = await GetCity(countryId, stateId);
    const formatted = data.map((c: any) => ({
      label: c.name,
      value: c.id,
      ...c,
    }));
    setCities(formatted as any);
    return formatted;
  };

  return {
    countries,
    states,
    cities,
    getStatesByCountry,
    getCitiesByState,
  };
};

export default useCountryStateCity;
