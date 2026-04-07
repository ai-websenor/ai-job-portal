import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateJobPreferenceDto } from '../../src/preference/dto';

describe('Job Preference DTO validation', () => {
  it('allows partial updates when only preferredLocations is provided', async () => {
    const dto = plainToInstance(UpdateJobPreferenceDto, {
      preferredLocations: '',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('still rejects invalid jobTypes types when provided', async () => {
    const dto = plainToInstance(UpdateJobPreferenceDto, {
      jobTypes: 123,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('jobTypes');
    expect(errors[0]?.constraints).toHaveProperty('isString');
  });
});
