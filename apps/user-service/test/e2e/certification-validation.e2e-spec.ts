import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCertificationDto } from '../../src/certification/dto';

describe('Certification DTO validation', () => {
  it('allows empty issueDate and expiryDate values', async () => {
    const dto = plainToInstance(CreateCertificationDto, {
      name: 'Amazon Web Services',
      issuingOrganization: 'Amazon',
      issueDate: '',
      expiryDate: '',
      credentialId: '',
      credentialUrl: null,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('still rejects invalid issueDate when a non-date value is provided', async () => {
    const dto = plainToInstance(CreateCertificationDto, {
      name: 'Amazon Web Services',
      issuingOrganization: 'Amazon',
      issueDate: 'not-a-date',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('issueDate');
    expect(errors[0]?.constraints).toHaveProperty('isDateString');
  });
});
