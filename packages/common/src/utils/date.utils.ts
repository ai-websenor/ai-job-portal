/**
 * Calculate duration between two dates in "X years Y months" format.
 * If end date is not provided, uses current date.
 * @param startDate The start date
 * @param endDate The end date (optional)
 * @returns Formatted duration string
 */
export const calculateDuration = (
  startDate: Date | string,
  endDate?: Date | string | null,
): string => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();

  if (isNaN(start.getTime())) {
    return '';
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  if (years === 0 && months === 0) {
    return 'Less than a month';
  }

  const yearString = years > 0 ? `${years} year${years > 1 ? 's' : ''}` : '';
  const monthString = months > 0 ? `${months} month${months > 1 ? 's' : ''}` : '';

  if (yearString && monthString) {
    return `${yearString} ${monthString}`;
  }

  return yearString || monthString;
};
