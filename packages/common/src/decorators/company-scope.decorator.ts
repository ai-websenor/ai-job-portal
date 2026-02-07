import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to enforce company scoping on endpoints
 * When applied, the endpoint will automatically filter data by the user's assigned company
 *
 * @example
 * ```typescript
 * @Get('employers')
 * @CompanyScoped()
 * async listEmployers() {
 *   // Will only return employers from the admin's company
 * }
 * ```
 */
export const COMPANY_SCOPED_KEY = 'isCompanyScoped';
export const CompanyScoped = () => SetMetadata(COMPANY_SCOPED_KEY, true);
