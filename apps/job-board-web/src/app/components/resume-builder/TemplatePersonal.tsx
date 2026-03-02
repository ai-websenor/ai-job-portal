import { ITemplateStructuredData } from '@/app/types/types';
import { Autocomplete, AutocompleteItem, Avatar, Input, Textarea } from '@heroui/react';
import PhoneNumberInput from '../form/PhoneNumberInput';
import useCountryStateCity from '@/app/hooks/useCountryStateCity';
import { useEffect } from 'react';

type Props = {
  form: ITemplateStructuredData | null;
  setForm: (val: ITemplateStructuredData) => void;
};

const TemplatePersonal = ({ form, setForm }: Props) => {
  const { countries, states, cities, getStatesByCountry, getCitiesByState } = useCountryStateCity();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    updatePersonalDetail(name, value);
  };

  const updatePersonalDetail = (key: string, value: any) => {
    if (!form) return;
    setForm({
      ...form,
      personalDetails: {
        ...form.personalDetails,
        [key]: value,
      },
    });
  };

  const getLocationLocationOptions = async () => {
    if (!form?.personalDetails) return;

    const country = countries?.find((c) => c?.label === form?.personalDetails?.country);
    if (country) {
      const states = await getStatesByCountry(Number(country?.value));

      const state = states?.find((s) => s?.label === form?.personalDetails?.state);

      if (state) {
        await getCitiesByState(Number(country?.value), Number(state?.value));
      }
    }
  };

  useEffect(() => {
    getLocationLocationOptions();
  }, [form?.personalDetails?.country, form?.personalDetails?.state, countries?.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updatePersonalDetail('profilePhoto', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="grid gap-5">
      <Avatar
        color="primary"
        isBordered
        className="w-36 h-36"
        src={form?.personalDetails?.profilePhoto!}
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <Input
          name="firstName"
          label="First Name"
          value={form?.personalDetails?.firstName}
          placeholder="First Name"
          onChange={handleChange}
        />

        <Input
          name="lastName"
          label="Last Name"
          value={form?.personalDetails?.lastName}
          placeholder="Last Name"
          onChange={handleChange}
        />

        <Input
          name="email"
          label="Email"
          value={form?.personalDetails?.email}
          placeholder="Email"
          onChange={handleChange}
        />

        <PhoneNumberInput
          value={form?.personalDetails?.phone}
          onChange={(value) =>
            setForm({ ...form, personalDetails: { ...form?.personalDetails, phone: value } } as any)
          }
          placeholder={'Enter mobile number'}
        />

        <Autocomplete
          label="Country"
          placeholder="Select country"
          selectedKey={form?.personalDetails?.country}
          onSelectionChange={(value) => {
            updatePersonalDetail('country', value);
            getLocationLocationOptions();
          }}
        >
          {countries?.map((country) => (
            <AutocompleteItem key={country.label}>{country.label}</AutocompleteItem>
          ))}
        </Autocomplete>

        <Autocomplete
          label="State"
          placeholder="Select state"
          selectedKey={form?.personalDetails?.state}
          onSelectionChange={(value) => {
            updatePersonalDetail('state', value);
            getLocationLocationOptions();
          }}
        >
          {states?.map((state) => (
            <AutocompleteItem key={state.label}>{state.label}</AutocompleteItem>
          ))}
        </Autocomplete>

        <Autocomplete
          label="City"
          placeholder="Select city"
          selectedKey={form?.personalDetails?.city}
          onSelectionChange={(value) => {
            updatePersonalDetail('city', value);
          }}
        >
          {cities?.map((city) => (
            <AutocompleteItem key={city.label}>{city.label}</AutocompleteItem>
          ))}
        </Autocomplete>

        <Input
          name="headline"
          label="Headline"
          value={form?.personalDetails?.headline}
          placeholder="Headline"
          onChange={handleChange}
        />
      </div>

      <div className="grid sm:grid-cols-2">
        <Textarea
          minRows={8}
          label="Professional Summary"
          name="professionalSummary"
          value={form?.personalDetails?.professionalSummary}
          placeholder="Professional Summary"
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

export default TemplatePersonal;
