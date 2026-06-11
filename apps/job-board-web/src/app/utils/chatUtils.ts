export const formatJobShortCode = (jobId?: string | null) => {
  if (!jobId) return '';

  return jobId.replace(/-/g, '').slice(-12).toUpperCase();
};

export const formatJobLabel = (jobTitle?: string | null, jobId?: string | null) => {
  if (!jobTitle?.trim() && !jobId) return '';

  const title = jobTitle?.trim() || 'Job';
  const shortCode = formatJobShortCode(jobId);

  return shortCode ? `${title} #${shortCode}` : title;
};
