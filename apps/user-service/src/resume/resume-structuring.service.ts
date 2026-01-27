import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

// Hugging Face NER entity types
interface NEREntity {
  entity_group: string; // PER, ORG, LOC, MISC
  score: number;
  word: string;
  start: number;
  end: number;
}

// Structured resume output format
export interface StructuredResumeData {
  filename: string;
  contentType: string;
  personalDetails: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    email?: string;
    state?: string;
    city?: string;
    country?: string;
  };
  educationalDetails: Array<{
    degree?: string;
    institutionName?: string;
    yearOfCompletion?: string;
  }>;
  skills: {
    technicalSkills: string[];
    softSkills: string[];
  };
  experienceDetails: Array<{
    jobTitle?: string;
    companyName?: string;
    designation?: string;
    duration?: string;
    description?: string[];
  }>;
  jobPreferences: {
    industryPreferences: string[];
    preferredLocation: string[];
  };
}

// Resume section types
interface ResumeSection {
  type: 'education' | 'experience' | 'skills' | 'personal' | 'unknown';
  startIndex: number;
  endIndex: number;
  content: string;
}

@Injectable()
export class ResumeStructuringService {
  private readonly logger = new Logger(ResumeStructuringService.name);
  private readonly httpClient: AxiosInstance;
  private readonly hfApiUrl: string;
  private readonly hfApiToken: string;

  constructor() {
    this.hfApiUrl =
      process.env.HF_NER_MODEL_URL ||
      'https://api-inference.huggingface.co/models/Babelscape/wikineural-multilingual-ner';
    this.hfApiToken = process.env.HF_API_TOKEN || '';

    this.httpClient = axios.create({
      timeout: 30000, // 30 seconds
      headers: {
        Authorization: `Bearer ${this.hfApiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Main entry point: Structure resume text into JSON
   */
  async structureResumeText(
    resumeText: string,
    filename: string,
    contentType: string,
  ): Promise<StructuredResumeData | null> {
    try {
      this.logger.log(`Starting resume structuring for: ${filename}`);

      // Step 1: Rule-based extraction (email, phone)
      const ruleBasedData = this.extractWithRegex(resumeText);

      // Step 2: Hugging Face NER extraction
      const nerEntities = await this.extractWithNER(resumeText);

      // Step 3: Choose extraction path based on NER results
      let structuredData: StructuredResumeData;

      if (nerEntities.length === 0) {
        // Use enhanced fallback when NER returns no entities
        structuredData = this.createFallbackStructure(filename, contentType, resumeText);
      } else {
        // Use NER-based extraction when entities are available
        const sections = this.detectSections(resumeText);
        structuredData = this.assembleStructuredData(
          ruleBasedData,
          nerEntities,
          sections,
          filename,
          contentType,
          resumeText,
        );
      }

      this.logger.log(`Successfully structured resume: ${filename}`);
      return structuredData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Resume structuring failed for ${filename}: ${errorMessage}`);

      // Return partial data on failure
      return this.createFallbackStructure(filename, contentType, resumeText);
    }
  }

  /**
   * Step 1: Extract email and phone using regex (deterministic)
   */
  private extractWithRegex(text: string): {
    email?: string;
    phoneNumber?: string;
  } {
    const result: { email?: string; phoneNumber?: string } = {};

    // Email regex - comprehensive pattern for various email formats
    // Handles: standard emails, emails with subdomains, various TLDs
    const emailPatterns = [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
      /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}/gi, // With spaces around @ and .
      /[a-zA-Z0-9._%+-]+\s*\[\s*at\s*\]\s*[a-zA-Z0-9.-]+\s*\[\s*dot\s*\]\s*[a-zA-Z]{2,}/gi, // [at] [dot] format
    ];

    for (const pattern of emailPatterns) {
      const match = text.match(pattern);
      if (match) {
        // Clean up the email (remove spaces, convert [at]/[dot])
        let email = match[0]
          .replace(/\s*\[\s*at\s*\]\s*/gi, '@')
          .replace(/\s*\[\s*dot\s*\]\s*/gi, '.')
          .replace(/\s+/g, '');
        result.email = email;
        break;
      }
    }

    // Phone regex - comprehensive patterns for international and local formats
    const phonePatterns = [
      /\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/, // +1 (123) 456-7890
      /\+?\d{1,3}[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}/, // +91 98765 43210
      /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/, // (123) 456-7890
      /\+?\d{10,13}/, // +919876543210
      /\d{3}[-.\s]\d{3}[-.\s]\d{4}/, // 123-456-7890
    ];

    for (const pattern of phonePatterns) {
      const match = text.match(pattern);
      if (match) {
        result.phoneNumber = match[0].replace(/\s+/g, ' ').trim();
        break;
      }
    }

    return result;
  }

  /**
   * Extract candidate name from resume header (fallback, no NER)
   */
  private extractNameFallback(text: string): {
    firstName?: string;
    lastName?: string;
  } {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Skip patterns - lines that are clearly not names
    const skipPatterns =
      /^(email|phone|address|linkedin|github|portfolio|objective|summary|experience|education|skills|contact|resume|cv|profile|references|projects|certifications|awards|languages|interests|hobbies|\d|@|http|www\.)/i;

    // Look at first 10 lines for name
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];

      // Skip lines with common keywords or patterns
      if (skipPatterns.test(line)) {
        continue;
      }

      // Skip lines that look like contact info
      if (line.includes('@') || line.includes('http') || /\d{3}.*\d{3}.*\d{4}/.test(line)) {
        continue;
      }

      // Skip lines that are too long (likely descriptions)
      if (line.length > 40) {
        continue;
      }

      // Normalize the line for name extraction
      const normalizedLine = line.replace(/[,.|]/g, ' ').trim();
      const words = normalizedLine.split(/\s+/).filter((w) => w.length > 1);

      // Name heuristic: 2-4 words, reasonable length
      if (words.length >= 2 && words.length <= 4) {
        // Check if words look like names (start with capital or are all caps)
        const looksLikeName = words.every(
          (w) => /^[A-Z]/.test(w) || /^[A-Z]+$/.test(w), // Starts with capital OR all caps
        );

        if (looksLikeName) {
          // Convert to proper case if all caps
          const toProperCase = (s: string) => {
            if (/^[A-Z]+$/.test(s)) {
              return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
            }
            return s;
          };

          return {
            firstName: toProperCase(words[0]),
            lastName: words.slice(1).map(toProperCase).join(' '),
          };
        }
      }

      // Also try single word names (just first name)
      if (words.length === 1 && /^[A-Z]/.test(words[0]) && words[0].length > 2) {
        const toProperCase = (s: string) => {
          if (/^[A-Z]+$/.test(s)) {
            return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
          }
          return s;
        };
        return {
          firstName: toProperCase(words[0]),
        };
      }
    }

    return {};
  }

  /**
   * Step 2: Call Hugging Face NER API with retry logic
   */
  private async extractWithNER(text: string): Promise<NEREntity[]> {
    const maxRetries = 2; // Reduced from 3 for faster fallback
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Normalize and limit text (MANDATORY for Inference API)
        const safeText = text
          .replace(/\s+/g, ' ') // Replace multiple spaces/newlines with single space
          .trim()
          .slice(0, 2500); // Limit to 2500 characters

        // Send ONLY plain text as inputs (no parameters object)
        const response = await this.httpClient.post<NEREntity[]>(this.hfApiUrl, {
          inputs: safeText,
        });

        if (Array.isArray(response.data)) {
          if (response.data.length === 0) {
            this.logger.log('NER returned 0 entities — fallback extraction will be used');
          } else {
            this.logger.log(
              `NER extracted ${response.data.length} entities from ${safeText.length} characters`,
            );
          }
          return response.data;
        }

        return [];
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;

          // Handle 410 (Gone) - model deprecated/unavailable
          if (status === 410) {
            this.logger.warn(
              `HF model unavailable (410 Gone). Model may be deprecated. Falling back to regex extraction.`,
            );
            return []; // Don't retry, return empty array
          }

          // Handle 503 (Model Loading) - retry with backoff
          if (status === 503) {
            attempt++;
            if (attempt < maxRetries) {
              this.logger.warn(`HF model loading (503), retry ${attempt}/${maxRetries}`);
              await this.sleep(3000 * attempt); // 3s, 6s backoff
              continue;
            } else {
              this.logger.warn(`HF model still loading after ${maxRetries} retries. Falling back.`);
              return [];
            }
          }

          // Other errors
          this.logger.error(`HF API error: ${status} - ${error.message}`);
        }

        // Don't throw - return empty array to allow fallback
        return [];
      }
    }

    return [];
  }

  /**
   * Step 3: Detect resume sections using keywords
   */
  private detectSections(text: string): ResumeSection[] {
    const sections: ResumeSection[] = [];
    const lines = text.split('\n');

    const sectionKeywords = {
      education: /education|academic|qualification|degree|university|college|school/i,
      experience: /experience|employment|work history|professional|career/i,
      skills: /skills|technical skills|competencies|expertise|proficiencies/i,
      personal: /personal|contact|profile|summary|objective/i,
    };

    let currentSection: ResumeSection | null = null;
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      currentIndex += lines[i].length + 1; // +1 for newline

      // Check if line is a section header
      for (const [type, regex] of Object.entries(sectionKeywords)) {
        if (regex.test(line) && line.length < 50) {
          // Save previous section
          if (currentSection) {
            currentSection.endIndex = currentIndex;
            sections.push(currentSection);
          }

          // Start new section
          currentSection = {
            type: type as any,
            startIndex: currentIndex,
            endIndex: text.length,
            content: '',
          };
          break;
        }
      }
    }

    // Add final section
    if (currentSection) {
      currentSection.endIndex = text.length;
      sections.push(currentSection);
    }

    // Extract content for each section
    sections.forEach((section) => {
      section.content = text.slice(section.startIndex, section.endIndex);
    });

    return sections;
  }

  /**
   * Step 4: Assemble structured data from all sources
   */
  private assembleStructuredData(
    ruleBasedData: { email?: string; phoneNumber?: string },
    nerEntities: NEREntity[],
    sections: ResumeSection[],
    filename: string,
    contentType: string,
    resumeText: string,
  ): StructuredResumeData {
    // Group entities by type
    const personEntities = nerEntities.filter((e) => e.entity_group === 'PER');
    const orgEntities = nerEntities.filter((e) => e.entity_group === 'ORG');
    const locEntities = nerEntities.filter((e) => e.entity_group === 'LOC');

    // Extract name from first PER entity
    const firstName = personEntities[0]?.word.split(' ')[0];
    const lastName = personEntities[0]?.word.split(' ').slice(1).join(' ');

    // Extract locations
    const locations = locEntities.map((e) => e.word);
    const city = locations[0];
    const state = locations[1];
    const country = locations[2];

    // Map organizations to education/experience based on section context
    const educationSection = sections.find((s) => s.type === 'education');
    const experienceSection = sections.find((s) => s.type === 'experience');

    const educationalDetails = this.extractEducation(educationSection, orgEntities);
    const experienceDetails = this.extractExperience(experienceSection, orgEntities);
    // Pass full text for skills search if no skills section found
    const skillsSection = sections.find((s) => s.type === 'skills');
    const skills = this.extractSkills(skillsSection, skillsSection ? undefined : resumeText);

    const rawData: Partial<StructuredResumeData> = {
      personalDetails: {
        firstName,
        lastName,
        phoneNumber: ruleBasedData.phoneNumber,
        email: ruleBasedData.email,
        city,
        state,
        country,
      },
      educationalDetails,
      skills,
      experienceDetails,
      jobPreferences: {
        industryPreferences: [],
        preferredLocation: [],
      },
    };

    return this.normalizeStructuredResume(rawData, filename, contentType);
  }

  /**
   * Extract education details from section
   */
  private extractEducation(
    section: ResumeSection | undefined,
    orgEntities: NEREntity[],
  ): Array<{ degree?: string; institutionName?: string; yearOfCompletion?: string }> {
    if (!section) return [];

    const educationRecords: Array<{
      degree?: string;
      institutionName?: string;
      yearOfCompletion?: string;
    }> = [];

    // Extract organizations mentioned in education section (from NER)
    const nerInstitutions = orgEntities
      .filter((org) => org.start >= section.startIndex && org.end <= section.endIndex)
      .map((org) => org.word);

    // Extract years (4-digit numbers, prefer later years as completion)
    const yearRegex = /\b(19|20)\d{2}\b/g;
    const years = (section.content.match(yearRegex) || []).sort(
      (a, b) => parseInt(b) - parseInt(a),
    );

    // Comprehensive degree patterns
    const degreePatterns = [
      // Full degree names
      /Bachelor(?:'s)?\s+(?:of\s+)?(?:Science|Arts|Engineering|Business|Technology|Commerce|Law|Medicine)/gi,
      /Master(?:'s)?\s+(?:of\s+)?(?:Science|Arts|Engineering|Business|Technology|Commerce|Law|Medicine)/gi,
      /Doctor(?:ate)?\s+(?:of\s+)?(?:Philosophy|Science|Engineering|Medicine|Law)/gi,
      /Associate(?:'s)?\s+(?:of\s+)?(?:Science|Arts|Applied Science)/gi,
      // Abbreviated degrees
      /\b(?:B\.?S\.?|B\.?A\.?|B\.?E\.?|B\.?Tech|B\.?Com|B\.?Sc)\b/gi,
      /\b(?:M\.?S\.?|M\.?A\.?|M\.?E\.?|M\.?Tech|M\.?Com|M\.?Sc|M\.?B\.?A\.?)\b/gi,
      /\b(?:Ph\.?D\.?|D\.?Phil|Ed\.?D|M\.?D\.?|J\.?D\.?|LL\.?B|LL\.?M)\b/gi,
      // Other certifications and diplomas
      /\b(?:Diploma|Certificate|Certification|High School|GED|Associate)\b/gi,
      /\bB\.?B\.?A\.?\b/gi,
      /\bB\.?C\.?A\.?\b/gi,
      /\bM\.?C\.?A\.?\b/gi,
      /\bPGDM\b/gi,
      /\bPGDBA\b/gi,
    ];

    // Extract degrees using patterns
    const degrees: string[] = [];
    for (const pattern of degreePatterns) {
      const matches = section.content.match(pattern);
      if (matches) {
        degrees.push(...matches);
      }
    }
    // Remove duplicates
    const uniqueDegrees = [...new Set(degrees.map((d) => d.trim()))];

    // Institution patterns (fallback when NER doesn't work)
    const institutionPatterns = [
      /University\s+of\s+[\w\s]+/gi,
      /[\w\s]+\s+University/gi,
      /[\w\s]+\s+Institute\s+of\s+Technology/gi,
      /[\w\s]+\s+College/gi,
      /[\w\s]+\s+School\s+of\s+[\w\s]+/gi,
      /I\.?I\.?T\.?\s*[\w]*/gi, // IIT
      /I\.?I\.?M\.?\s*[\w]*/gi, // IIM
      /N\.?I\.?T\.?\s*[\w]*/gi, // NIT
      /[\w\s]+\s+Academy/gi,
    ];

    // Extract institutions using patterns if NER didn't find any
    let institutions = nerInstitutions;
    if (institutions.length === 0) {
      for (const pattern of institutionPatterns) {
        const matches = section.content.match(pattern);
        if (matches) {
          institutions.push(...matches.map((m) => m.trim()));
        }
      }
      // Remove duplicates and clean up
      institutions = [...new Set(institutions)].filter((inst) => inst.length > 3);
    }

    // Create education records
    const maxRecords = Math.max(
      institutions.length,
      uniqueDegrees.length,
      years.length > 0 ? 1 : 0,
    );
    for (let i = 0; i < maxRecords; i++) {
      const record: { degree?: string; institutionName?: string; yearOfCompletion?: string } = {};

      if (institutions[i]) record.institutionName = institutions[i];
      if (uniqueDegrees[i]) record.degree = uniqueDegrees[i];
      if (years[i]) record.yearOfCompletion = years[i];

      // Only add if at least one field is populated
      if (record.institutionName || record.degree || record.yearOfCompletion) {
        educationRecords.push(record);
      }
    }

    return educationRecords;
  }

  /**
   * Extract experience details from section
   */
  private extractExperience(
    section: ResumeSection | undefined,
    orgEntities: NEREntity[],
  ): Array<{
    jobTitle?: string;
    companyName?: string;
    designation?: string;
    duration?: string;
    description?: string[];
  }> {
    if (!section) return [];

    const experienceRecords: Array<{
      jobTitle?: string;
      companyName?: string;
      designation?: string;
      duration?: string;
      description?: string[];
    }> = [];

    // Extract companies mentioned in experience section
    const companies = orgEntities.filter(
      (org) => org.start >= section.startIndex && org.end <= section.endIndex,
    );

    // Extract duration patterns (e.g., "2020-2023", "Jan 2020 - Dec 2023")
    const durationRegex = /(\d{4})\s*[-–]\s*(\d{4}|Present)/gi;
    const durations = section.content.match(durationRegex) || [];

    // Create experience records
    companies.forEach((company, index) => {
      experienceRecords.push({
        companyName: company.word,
        duration: durations[index],
        description: [],
      });
    });

    return experienceRecords;
  }

  /**
   * Extract experience details without NER (fallback mode)
   */
  private extractExperienceFallback(section: ResumeSection | undefined): Array<{
    jobTitle?: string;
    companyName?: string;
    designation?: string;
    duration?: string;
    description?: string[];
  }> {
    if (!section) return [];

    const experienceRecords: Array<{
      jobTitle?: string;
      companyName?: string;
      designation?: string;
      duration?: string;
      description?: string[];
    }> = [];

    const lines = section.content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Common job title patterns
    const jobTitlePatterns = [
      /\b(Senior|Junior|Lead|Principal|Staff|Chief|Head|Director|Manager|Associate|Assistant)?\s*(Software|Data|Product|Project|Program|Engineering|Marketing|Sales|Business|Operations|Finance|HR|Human Resources|IT|DevOps|Frontend|Backend|Full[\s-]?Stack|Mobile|Cloud|Security|QA|Quality|Test|Research|Design|UX|UI)?\s*(Engineer|Developer|Scientist|Analyst|Manager|Director|Consultant|Specialist|Architect|Administrator|Coordinator|Executive|Officer|Lead|Designer|Researcher|Intern)\b/gi,
      /\b(CEO|CTO|CFO|COO|CIO|VP|SVP|EVP|AVP)\b/gi,
      /\b(Intern|Trainee|Apprentice|Fellow)\b/gi,
    ];

    // Duration patterns
    const durationPatterns = [
      /(\d{4})\s*[-–—to]+\s*(\d{4}|Present|Current|Now|Ongoing)/gi,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}\s*[-–—to]+\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}/gi,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}\s*[-–—to]+\s*(Present|Current|Now|Ongoing)/gi,
    ];

    // Try to identify experience blocks (lines with job info)
    let currentRecord: {
      jobTitle?: string;
      companyName?: string;
      designation?: string;
      duration?: string;
      description: string[];
    } | null = null;

    for (const line of lines) {
      // Check if line contains a duration (likely start of new experience)
      let foundDuration: string | undefined;
      for (const pattern of durationPatterns) {
        const match = line.match(pattern);
        if (match) {
          foundDuration = match[0];
          break;
        }
      }

      // Check if line contains a job title
      let foundJobTitle: string | undefined;
      for (const pattern of jobTitlePatterns) {
        const match = line.match(pattern);
        if (match && match[0].length > 3) {
          foundJobTitle = match[0].trim();
          break;
        }
      }

      // If we found a duration or job title, this might be a new experience entry
      if (foundDuration || foundJobTitle) {
        // Save previous record if exists
        if (currentRecord && (currentRecord.jobTitle || currentRecord.description.length > 0)) {
          experienceRecords.push(currentRecord);
        }

        // Start new record
        currentRecord = {
          jobTitle: foundJobTitle,
          duration: foundDuration,
          description: [],
        };

        // Try to extract company name from the same line or nearby
        // Company names often appear on the same line as job title or duration
        const lineWithoutMatch = line
          .replace(foundDuration || '', '')
          .replace(foundJobTitle || '', '')
          .trim();

        // Look for company indicators
        const companyMatch = lineWithoutMatch.match(
          /(?:at|@|,)\s*([A-Z][A-Za-z0-9\s&.,]+?)(?:\s*[-–|,]|$)/,
        );
        if (companyMatch) {
          currentRecord.companyName = companyMatch[1].trim();
        } else if (lineWithoutMatch.length > 2 && lineWithoutMatch.length < 50) {
          // If remaining text is short, it might be company name
          const cleaned = lineWithoutMatch.replace(/^[-–|,\s]+|[-–|,\s]+$/g, '').trim();
          if (cleaned.length > 2 && /^[A-Z]/.test(cleaned)) {
            currentRecord.companyName = cleaned;
          }
        }
      } else if (currentRecord) {
        // This line is part of current experience description
        const cleanedLine = line.replace(/^[•\-*–]\s*/, '').trim();

        if (cleanedLine.length > 10) {
          currentRecord.description.push(cleanedLine);
        }
      } else {
        // No current record, check if this line could start one
        // Sometimes job title is on its own line
        for (const pattern of jobTitlePatterns) {
          const match = line.match(pattern);
          if (match && match[0].length > 5 && line.length < 60) {
            currentRecord = {
              jobTitle: match[0].trim(),
              description: [],
            };
            break;
          }
        }
      }
    }

    // Add last record
    if (currentRecord && (currentRecord.jobTitle || currentRecord.description.length > 0)) {
      experienceRecords.push(currentRecord);
    }

    // If no structured records found, fall back to bullet point extraction
    if (experienceRecords.length === 0) {
      const bulletPoints = lines.filter(
        (line) => line.startsWith('•') || line.startsWith('-') || line.startsWith('*'),
      );

      if (bulletPoints.length > 0) {
        experienceRecords.push({
          description: bulletPoints.map((bp) => bp.replace(/^[•\-*]\s*/, '').trim()),
        });
      } else if (lines.length > 0) {
        experienceRecords.push({
          description: lines.slice(0, 10),
        });
      }
    }

    return experienceRecords;
  }

  /**
   * Extract skills from section or entire text
   */
  private extractSkills(
    section: ResumeSection | undefined,
    fullText?: string,
  ): {
    technicalSkills: string[];
    softSkills: string[];
  } {
    // Use section content if available, otherwise use full text
    const searchText = section?.content || fullText || '';

    if (!searchText) {
      return { technicalSkills: [], softSkills: [] };
    }

    // Comprehensive technical skills list
    const technicalKeywords = [
      // Programming Languages
      'JavaScript',
      'TypeScript',
      'Python',
      'Java',
      'C++',
      'C#',
      'Ruby',
      'Go',
      'Golang',
      'Rust',
      'PHP',
      'Swift',
      'Kotlin',
      'Scala',
      'R',
      'MATLAB',
      'Perl',
      'Shell',
      'Bash',
      'PowerShell',
      // Frontend
      'React',
      'React.js',
      'ReactJS',
      'Angular',
      'Vue',
      'Vue.js',
      'VueJS',
      'Next.js',
      'NextJS',
      'Nuxt',
      'Svelte',
      'jQuery',
      'HTML',
      'HTML5',
      'CSS',
      'CSS3',
      'SASS',
      'SCSS',
      'LESS',
      'Tailwind',
      'Bootstrap',
      'Material UI',
      'Redux',
      'MobX',
      'Webpack',
      'Vite',
      // Backend
      'Node.js',
      'NodeJS',
      'Express',
      'Express.js',
      'NestJS',
      'Django',
      'Flask',
      'FastAPI',
      'Spring',
      'Spring Boot',
      '.NET',
      'ASP.NET',
      'Ruby on Rails',
      'Rails',
      'Laravel',
      'Symfony',
      // Databases
      'SQL',
      'MySQL',
      'PostgreSQL',
      'MongoDB',
      'Redis',
      'Elasticsearch',
      'DynamoDB',
      'Cassandra',
      'Oracle',
      'SQL Server',
      'SQLite',
      'Firebase',
      'Supabase',
      'GraphQL',
      'Prisma',
      'Sequelize',
      'TypeORM',
      // Cloud & DevOps
      'AWS',
      'Amazon Web Services',
      'Azure',
      'GCP',
      'Google Cloud',
      'Docker',
      'Kubernetes',
      'K8s',
      'Jenkins',
      'CircleCI',
      'GitHub Actions',
      'GitLab CI',
      'Terraform',
      'Ansible',
      'Nginx',
      'Apache',
      'Linux',
      'Unix',
      // Data Science & ML
      'Machine Learning',
      'Deep Learning',
      'TensorFlow',
      'PyTorch',
      'Keras',
      'Scikit-learn',
      'Pandas',
      'NumPy',
      'Data Analysis',
      'Data Science',
      'Data Engineering',
      'Big Data',
      'Hadoop',
      'Spark',
      'Apache Spark',
      'Tableau',
      'Power BI',
      'Excel',
      'Statistics',
      'NLP',
      'Computer Vision',
      'AI',
      'Artificial Intelligence',
      // Mobile
      'iOS',
      'Android',
      'React Native',
      'Flutter',
      'Xamarin',
      'Mobile Development',
      // Tools & Others
      'Git',
      'GitHub',
      'GitLab',
      'Bitbucket',
      'Jira',
      'Confluence',
      'Agile',
      'Scrum',
      'REST',
      'RESTful',
      'API',
      'APIs',
      'Microservices',
      'CI/CD',
      'TDD',
      'Unit Testing',
      'Jest',
      'Mocha',
      'Cypress',
      'Selenium',
      'Postman',
      'VS Code',
      'IntelliJ',
      'Figma',
      'Sketch',
      'Adobe',
      'Photoshop',
      'Illustrator',
      'SAP',
      'Salesforce',
      'CRM',
      'ERP',
      'Blockchain',
      'Web3',
      'Solidity',
    ];

    // Comprehensive soft skills list
    const softKeywords = [
      'Leadership',
      'Communication',
      'Teamwork',
      'Team Player',
      'Collaboration',
      'Problem Solving',
      'Problem-Solving',
      'Analytical',
      'Analysis',
      'Time Management',
      'Critical Thinking',
      'Decision Making',
      'Project Management',
      'Strategic Planning',
      'Strategic Thinking',
      'Creativity',
      'Creative',
      'Innovation',
      'Innovative',
      'Adaptability',
      'Flexibility',
      'Attention to Detail',
      'Detail-Oriented',
      'Organization',
      'Organizational',
      'Presentation',
      'Public Speaking',
      'Negotiation',
      'Conflict Resolution',
      'Customer Service',
      'Client Relations',
      'Interpersonal',
      'Mentoring',
      'Coaching',
      'Training',
      'Research',
      'Writing',
      'Technical Writing',
      'Documentation',
      'Self-Motivated',
      'Initiative',
      'Multitasking',
      'Prioritization',
      'Stakeholder Management',
    ];

    const lowerText = searchText.toLowerCase();

    const technicalSkills = technicalKeywords.filter((skill) =>
      lowerText.includes(skill.toLowerCase()),
    );

    const softSkills = softKeywords.filter((skill) => lowerText.includes(skill.toLowerCase()));

    return { technicalSkills, softSkills };
  }

  /**
   * Create fallback structure when NER fails
   */
  private createFallbackStructure(
    filename: string,
    contentType: string,
    resumeText: string,
  ): StructuredResumeData {
    this.logger.log('NER returned 0 entities — using fallback extraction');

    // Extract using regex and section detection
    const ruleBasedData = this.extractWithRegex(resumeText);
    const sections = this.detectSections(resumeText);
    const name = this.extractNameFallback(resumeText);

    // Reuse existing extraction methods (they work without NER entities)
    const educationalDetails = this.extractEducation(
      sections.find((s) => s.type === 'education'),
      [], // No NER entities
    );
    const experienceDetails = this.extractExperienceFallback(
      sections.find((s) => s.type === 'experience'),
    );
    // Pass full text for skills search if no skills section found
    const skillsSection = sections.find((s) => s.type === 'skills');
    const skills = this.extractSkills(skillsSection, skillsSection ? undefined : resumeText);

    // Count populated field groups for logging
    const fieldsPopulated = [
      ruleBasedData.email ? 'email' : null,
      ruleBasedData.phoneNumber ? 'phone' : null,
      name.firstName ? 'name' : null,
      skills.technicalSkills.length > 0 ? 'skills' : null,
      experienceDetails.length > 0 ? 'experience' : null,
      educationalDetails.length > 0 ? 'education' : null,
    ].filter(Boolean).length;

    this.logger.log(`Fallback extraction populated ${fieldsPopulated} field groups`);

    const rawData: Partial<StructuredResumeData> = {
      personalDetails: {
        firstName: name.firstName,
        lastName: name.lastName,
        email: ruleBasedData.email,
        phoneNumber: ruleBasedData.phoneNumber,
      },
      educationalDetails,
      skills,
      experienceDetails,
      jobPreferences: {
        industryPreferences: [],
        preferredLocation: [],
      },
    };

    return this.normalizeStructuredResume(rawData, filename, contentType);
  }

  /**
   * Normalize structured resume data to guarantee schema compliance.
   * This method ensures:
   * - All top-level keys exist
   * - Arrays are never null/undefined (empty array if no data)
   * - Objects always exist with proper structure
   * - Null values are converted to undefined
   * - Skills are deduplicated (case-insensitive for technical skills)
   * - Empty education/experience objects are filtered out
   */
  private normalizeStructuredResume(
    data: Partial<StructuredResumeData>,
    filename: string,
    contentType: string,
  ): StructuredResumeData {
    // Helper to convert null to undefined
    const nullToUndefined = <T>(value: T | null | undefined): T | undefined => {
      return value === null ? undefined : value;
    };

    // Helper to deduplicate array (case-insensitive)
    const deduplicateCaseInsensitive = (arr: string[]): string[] => {
      const seen = new Set<string>();
      return arr.filter((item) => {
        const lower = item.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      });
    };

    // Helper to deduplicate array (case-sensitive)
    const deduplicate = (arr: string[]): string[] => {
      return [...new Set(arr)];
    };

    // Normalize personal details
    const personalDetails = {
      firstName: nullToUndefined(data.personalDetails?.firstName),
      lastName: nullToUndefined(data.personalDetails?.lastName),
      phoneNumber: nullToUndefined(data.personalDetails?.phoneNumber),
      email: nullToUndefined(data.personalDetails?.email),
      state: nullToUndefined(data.personalDetails?.state),
      city: nullToUndefined(data.personalDetails?.city),
      country: nullToUndefined(data.personalDetails?.country),
    };

    // Normalize educational details - filter out empty objects
    const rawEducation = data.educationalDetails ?? [];
    const educationalDetails = rawEducation
      .map((edu) => ({
        degree: nullToUndefined(edu.degree),
        institutionName: nullToUndefined(edu.institutionName),
        yearOfCompletion: nullToUndefined(edu.yearOfCompletion),
      }))
      .filter(
        (edu) =>
          edu.degree !== undefined ||
          edu.institutionName !== undefined ||
          edu.yearOfCompletion !== undefined,
      );

    // Normalize skills - deduplicate
    const rawSkills = data.skills ?? { technicalSkills: [], softSkills: [] };
    const skills = {
      technicalSkills: deduplicateCaseInsensitive(rawSkills.technicalSkills ?? []),
      softSkills: deduplicate(rawSkills.softSkills ?? []),
    };

    // Normalize experience details - filter out empty objects, ensure description is array
    const rawExperience = data.experienceDetails ?? [];
    const experienceDetails = rawExperience
      .map((exp) => ({
        jobTitle: nullToUndefined(exp.jobTitle),
        companyName: nullToUndefined(exp.companyName),
        designation: nullToUndefined(exp.designation),
        duration: nullToUndefined(exp.duration),
        description: Array.isArray(exp.description) ? exp.description : [],
      }))
      .filter(
        (exp) =>
          exp.jobTitle !== undefined ||
          exp.companyName !== undefined ||
          exp.designation !== undefined ||
          exp.duration !== undefined ||
          exp.description.length > 0,
      );

    // Normalize job preferences - always exist with arrays
    const jobPreferences = {
      industryPreferences: data.jobPreferences?.industryPreferences ?? [],
      preferredLocation: data.jobPreferences?.preferredLocation ?? [],
    };

    return {
      filename,
      contentType,
      personalDetails,
      educationalDetails,
      skills,
      experienceDetails,
      jobPreferences,
    };
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
