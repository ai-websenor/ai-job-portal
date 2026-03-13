/**
 * Normalizes incoming resume data to match the standard template data contract.
 *
 * Handles common field name variations so that templates receive a consistent shape
 * regardless of whether data comes from:
 *   - the structured profile (getTemplateDataForUser)
 *   - manual API input (generate-from-template)
 *   - parsed resume data
 *
 * Standard contract:
 *   personalDetails: { firstName, lastName, email, phone, city, state, country, headline, professionalSummary, profilePhoto }
 *   educationalDetails: [{ degree, institution, fieldOfStudy, startDate, endDate, grade, currentlyStudying }]
 *   experienceDetails: [{ jobTitle, companyName, designation, location, startDate, endDate, duration, isCurrent, description, achievements }]
 *   skills: [{ name, proficiencyLevel, yearsOfExperience }]
 *   certifications: [{ name, issuingOrganization, issueDate, expiryDate, credentialId, credentialUrl }]
 *   projects: [{ title, description, startDate, endDate, url, technologies, highlights }]
 *   languages: [{ name, proficiency }]
 */
export function normalizeResumeData(raw: Record<string, any>): Record<string, any> {
  const data = { ...raw };

  // ── personalDetails ──
  if (data.personalDetails) {
    const pd = { ...data.personalDetails };

    // phoneNumber → phone
    if (!pd.phone && pd.phoneNumber) {
      pd.phone = pd.phoneNumber;
    }

    // linkedinUrl / websiteUrl — keep as-is, templates can reference them
    data.personalDetails = pd;
  }

  // ── educationalDetails ──
  if (Array.isArray(data.educationalDetails)) {
    data.educationalDetails = data.educationalDetails.map((edu: any) => {
      const normalized: any = { ...edu };

      // institutionName → institution
      if (!normalized.institution && normalized.institutionName) {
        normalized.institution = normalized.institutionName;
      }

      // yearOfCompletion → endDate (if no endDate provided)
      if (!normalized.endDate && normalized.yearOfCompletion) {
        normalized.endDate = normalized.yearOfCompletion;
      }

      // yearOfStart → startDate
      if (!normalized.startDate && normalized.yearOfStart) {
        normalized.startDate = normalized.yearOfStart;
      }

      return normalized;
    });
  }

  // ── experienceDetails ──
  if (Array.isArray(data.experienceDetails)) {
    data.experienceDetails = data.experienceDetails.map((exp: any) => {
      const normalized: any = { ...exp };

      // Parse "duration" string like "01/2019 - Present" into startDate, endDate, isCurrent
      if (normalized.duration && typeof normalized.duration === 'string') {
        const parts = normalized.duration.split(/\s*[-–—]\s*/);
        if (parts.length >= 1 && !normalized.startDate) {
          normalized.startDate = parts[0].trim();
        }
        if (parts.length >= 2) {
          const endPart = parts[1].trim().toLowerCase();
          if (endPart === 'present' || endPart === 'current' || endPart === 'now') {
            normalized.isCurrent = true;
            if (!normalized.endDate) normalized.endDate = '';
          } else if (!normalized.endDate) {
            normalized.endDate = parts[1].trim();
          }
        }
      }

      // description: array of strings → join with newline/bullet for display
      if (Array.isArray(normalized.description)) {
        normalized.descriptionList = normalized.description;
        normalized.description = normalized.description.filter(Boolean).join('\n');
      }

      return normalized;
    });
  }

  // ── skills ──
  // Handle skills as object with categorized arrays: { technicalSkills: [], softSkills: [] }
  // Convert to standard array of { name } objects
  if (data.skills && !Array.isArray(data.skills)) {
    const skillsObj = data.skills;
    const flatSkills: { name: string; category?: string }[] = [];

    for (const [category, items] of Object.entries(skillsObj)) {
      if (Array.isArray(items)) {
        for (const item of items) {
          if (typeof item === 'string') {
            flatSkills.push({ name: item, category });
          } else if (item && typeof item === 'object' && item.name) {
            flatSkills.push({ ...item, category: item.category || category });
          }
        }
      }
    }

    data.skills = flatSkills;
  }

  // Handle skills as flat array of strings: ["JavaScript", "Python"]
  if (Array.isArray(data.skills)) {
    data.skills = data.skills.map((skill: any) => {
      if (typeof skill === 'string') {
        return { name: skill };
      }
      return skill;
    });
  }

  // ── certifications ──
  if (Array.isArray(data.certifications)) {
    data.certifications = data.certifications.map((cert: any) => {
      const normalized: any = { ...cert };
      // organizationName → issuingOrganization
      if (!normalized.issuingOrganization && normalized.organizationName) {
        normalized.issuingOrganization = normalized.organizationName;
      }
      return normalized;
    });
  }

  // ── languages ──
  // Handle flat array of strings: ["English", "Spanish"]
  if (Array.isArray(data.languages)) {
    data.languages = data.languages.map((lang: any) => {
      if (typeof lang === 'string') {
        return { name: lang };
      }
      return lang;
    });
  }

  return data;
}
