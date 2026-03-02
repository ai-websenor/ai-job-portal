import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { TECHNICAL_KEYWORDS, SOFT_KEYWORDS } from './utils/resume-keywords.constant';

import { StructuredResumeDataDto, ResumeSectionDto } from './dto/resume.dto';

/**
 * Interface for AI-extracted resume data from FLAN-T5
 */
interface AIExtractedResumeData {
  personalDetails?: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    email?: string;
    city?: string;
    state?: string;
    country?: string;
    profileSummary?: string;
    headline?: string;
  };
  educationalDetails?: Array<{
    degree?: string;
    institutionName?: string;
    startDate?: string;
    endDate?: string;
  }>;
  skills?: {
    technicalSkills?: string[] | string;
    softSkills?: string[] | string;
  };
  experienceDetails?: Array<{
    jobTitle?: string;
    companyName?: string;
    designation?: string;
    startDate?: string;
    endDate?: string;
    description?: string[];
  }>;
  jobPreferences?: {
    industryPreferences?: string[];
    preferredLocation?: string[];
  };
}

@Injectable()
export class ResumeStructuringService {
  private readonly logger = new Logger(ResumeStructuringService.name);
  private readonly httpClient: AxiosInstance;
  private readonly hfRouterUrl: string;
  private readonly hfApiToken: string;
  // Models to try in order (free tier compatible)
  private readonly models = [
    'Qwen/Qwen2.5-7B-Instruct:cheapest', // Most reliable, good JSON output
    'meta-llama/Llama-3.2-3B-Instruct:cheapest', // Small, fast fallback
    'mistralai/Mistral-7B-Instruct-v0.3:cheapest', // Alternative fallback
  ];

  constructor() {
    // Hugging Face Inference Providers Router (new unified API)
    this.hfRouterUrl =
      process.env.HF_ROUTER_URL || 'https://router.huggingface.co/v1/chat/completions';

    this.hfApiToken = process.env.HF_API_TOKEN || '';

    this.httpClient = axios.create({
      timeout: 90000, // 90 seconds for LLM inference
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
  ): Promise<StructuredResumeDataDto | null> {
    try {
      this.logger.log(`Starting resume structuring for: ${filename}`);

      // Step 1: Rule-based extraction (email, phone) - always reliable
      const ruleBasedData = this.extractWithRegex(resumeText);
      console.log('ruleBasedData>>>', ruleBasedData);

      // Step 2: AI extraction using FLAN-T5 instruction model
      const aiExtractedData = await this.extractWithFlanT5(resumeText);
      console.log('aiExtractedData>>>', aiExtractedData);

      // Step 3: Assemble structured data
      let structuredData: StructuredResumeDataDto;

      if (aiExtractedData) {
        // AI extraction succeeded - merge with rule-based data
        structuredData = this.assembleFromAIExtraction(
          aiExtractedData,
          ruleBasedData,
          filename,
          contentType,
          resumeText,
        );
      } else {
        // AI extraction failed - use enhanced fallback
        structuredData = this.createFallbackStructure(filename, contentType, resumeText);
        console.log('ai-extraction-failed-FallbackStructuredData>>>', structuredData);
      }

      this.logger.log(`Successfully structured resume: ${filename}`);
      console.log('structuredData>>>!!!', structuredData);
      return structuredData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Resume structuring failed for ${filename}: ${errorMessage}`);

      // Return partial data on failure
      return this.createFallbackStructure(filename, contentType, resumeText);
    }
  }

  /**
   * Build system prompt for resume extraction
   */
  private buildSystemPrompt(): string {
    return `You are a resume parser. Extract information from resumes and return ONLY valid JSON.
Do not include any explanations, markdown formatting, or text outside the JSON object.
Rules:
- "profileSummary": Extract the candidate's professional summary or objective statement from the resume. If none exists, generate a brief 2-3 sentence summary based on their experience and skills.
- "headline": Extract or generate a short professional headline (e.g. "Senior Full Stack Developer" or "Data Scientist with 5+ years experience").
- "startDate" and "endDate" in educationalDetails: Parse the enrollment period into separate start and end dates in MM/YYYY format.
- "startDate" and "endDate" in experienceDetails: Parse duration into separate start and end dates in MM/YYYY format. Use "Present" for current roles.
- "preferredLocation" in jobPreferences: Use the candidate's city/state/country as their preferred location.
Return exactly this JSON structure with extracted values:
{"personalDetails":{"firstName":"","lastName":"","phoneNumber":"","email":"","city":"","state":"","country":"","profileSummary":"","headline":""},"educationalDetails":[{"degree":"","institutionName":"","startDate":"","endDate":""}],"skills":{"technicalSkills":[],"softSkills":[]},"experienceDetails":[{"jobTitle":"","companyName":"","startDate":"","endDate":"","description":[]}],"jobPreferences":{"industryPreferences":[],"preferredLocation":[]}}`;
  }

  /**
   * Build user prompt with resume text
   */
  private buildUserPrompt(resumeText: string): string {
    // Limit resume text to prevent token overflow
    const truncatedText = resumeText.slice(0, 4000);
    return `Parse this resume and return ONLY the JSON object:\n\n${truncatedText}`;
  }

  /**
   * Extract resume data using Hugging Face Inference Providers (chat completions)
   */
  private async extractWithFlanT5(resumeText: string): Promise<AIExtractedResumeData | null> {
    // Try each model in order until one succeeds
    for (const model of this.models) {
      const response = await this.callChatCompletionAPI(model, resumeText);
      if (response) {
        const parsed = this.parseAIResponse(response);
        if (parsed) {
          return parsed;
        }
      }
      this.logger.warn(`Model ${model} failed, trying next...`);
    }

    this.logger.warn('All models failed, will use fallback extraction');
    return null;
  }

  /**
   * Call Hugging Face Inference Providers chat completion API
   */
  private async callChatCompletionAPI(model: string, resumeText: string): Promise<string | null> {
    const maxRetries = 2;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        this.logger.log(`Calling HF Inference Provider with model: ${model}`);

        const response = await this.httpClient.post<{
          choices: Array<{ message: { content: string } }>;
        }>(this.hfRouterUrl, {
          model: model,
          messages: [
            { role: 'system', content: this.buildSystemPrompt() },
            { role: 'user', content: this.buildUserPrompt(resumeText) },
          ],
          max_tokens: 1500,
          temperature: 0.1, // Low temperature for consistent JSON output
        });

        // Extract content from chat completion response
        const content = response.data?.choices?.[0]?.message?.content;
        if (content) {
          this.logger.log(`HF Inference Provider generated ${content.length} characters`);
          return content;
        }

        this.logger.warn('Empty response from HF Inference Provider');
        return null;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const errorData = error.response?.data;

          // Handle 503 (Model Loading) - retry with backoff
          if (status === 503) {
            attempt++;
            if (attempt < maxRetries) {
              this.logger.warn(`Model loading (503), retry ${attempt}/${maxRetries}`);
              await this.sleep(5000 * attempt);
              continue;
            }
          }

          // Handle rate limiting
          if (status === 429) {
            attempt++;
            if (attempt < maxRetries) {
              this.logger.warn(`Rate limited (429), retry ${attempt}/${maxRetries}`);
              await this.sleep(3000 * attempt);
              continue;
            }
          }

          // Handle 422 (Model not available) - try next model immediately
          if (status === 422) {
            this.logger.warn(`Model not available (422): ${JSON.stringify(errorData)}`);
            return null;
          }

          this.logger.error(`HF API error: ${status} - ${error.message}`);
        } else {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`HF API error: ${errorMessage}`);
        }

        return null;
      }
    }

    return null;
  }

  /**
   * Parse AI response text into structured resume data
   */
  private parseAIResponse(responseText: string): AIExtractedResumeData | null {
    try {
      // Clean up the response - extract JSON from potential surrounding text
      let jsonText = responseText.trim();

      // Try to find JSON object in the response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      // Parse the JSON
      const parsed = JSON.parse(jsonText) as AIExtractedResumeData;

      this.logger.log('Successfully parsed AI response to JSON');
      return parsed;
    } catch (parseError) {
      this.logger.warn(`Failed to parse AI response as JSON: ${parseError}`);

      // Try to extract partial data using regex patterns
      return this.extractPartialDataFromText(responseText);
    }
  }

  /**
   * Extract partial data from AI response when JSON parsing fails
   */
  private extractPartialDataFromText(text: string): AIExtractedResumeData | null {
    try {
      const data: AIExtractedResumeData = {};

      // Try to extract name
      const nameMatch = text.match(/firstName["\s:]+([^",}]+)/i);
      const lastNameMatch = text.match(/lastName["\s:]+([^",}]+)/i);
      if (nameMatch || lastNameMatch) {
        data.personalDetails = {
          firstName: nameMatch?.[1]?.trim(),
          lastName: lastNameMatch?.[1]?.trim(),
        };
      }

      // Try to extract skills array
      const techSkillsMatch = text.match(/technicalSkills["\s:]+\[([^\]]+)\]/i);
      if (techSkillsMatch) {
        const skills = techSkillsMatch[1]
          .split(',')
          .map((s) => s.replace(/["\s]/g, '').trim())
          .filter((s) => s.length > 0);
        data.skills = { technicalSkills: skills, softSkills: [] };
      }

      // Return null if no useful data extracted
      if (Object.keys(data).length === 0) {
        return null;
      }

      this.logger.log('Extracted partial data from malformed AI response');
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Assemble structured data from AI extraction + rule-based data
   */
  private assembleFromAIExtraction(
    aiData: AIExtractedResumeData,
    ruleBasedData: { email?: string; phoneNumber?: string },
    filename: string,
    contentType: string,
    resumeText: string,
  ): StructuredResumeDataDto {
    // Convert comma-separated skills to arrays if needed
    const normalizeSkillsArray = (skills: string[] | string | undefined): string[] => {
      if (!skills) return [];
      if (Array.isArray(skills)) return skills.filter((s) => s && s.trim().length > 0);
      // Handle comma-separated string
      return skills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    };

    // AI-extracted skills + keyword matching fallback
    let technicalSkills = normalizeSkillsArray(aiData.skills?.technicalSkills);
    let softSkills = normalizeSkillsArray(aiData.skills?.softSkills);

    // Supplement with keyword matching if AI returned few skills
    if (technicalSkills.length < 3) {
      const keywordSkills = this.extractSkillsFromText(resumeText);
      technicalSkills = [...new Set([...technicalSkills, ...keywordSkills.technicalSkills])];
      softSkills = [...new Set([...softSkills, ...keywordSkills.softSkills])];
    }

    // Build preferredLocation from candidate's location if AI didn't extract it
    let preferredLocation = aiData.jobPreferences?.preferredLocation || [];
    if (preferredLocation.length === 0) {
      const locationParts = [
        aiData.personalDetails?.city,
        aiData.personalDetails?.state,
        aiData.personalDetails?.country,
      ].filter(Boolean);
      if (locationParts.length > 0) {
        preferredLocation = [locationParts.join(', ')];
      }
    }

    const rawData: Partial<StructuredResumeDataDto> = {
      personalDetails: {
        firstName: aiData.personalDetails?.firstName,
        lastName: aiData.personalDetails?.lastName,
        // Prefer rule-based extraction for email/phone (more reliable)
        phoneNumber: ruleBasedData.phoneNumber || aiData.personalDetails?.phoneNumber,
        email: ruleBasedData.email || aiData.personalDetails?.email,
        city: aiData.personalDetails?.city,
        state: aiData.personalDetails?.state,
        country: aiData.personalDetails?.country,
        profileSummary: aiData.personalDetails?.profileSummary,
        headline: aiData.personalDetails?.headline,
      },
      educationalDetails: aiData.educationalDetails || [],
      skills: {
        technicalSkills,
        softSkills,
      },
      experienceDetails: aiData.experienceDetails || [],
      jobPreferences: {
        industryPreferences: aiData.jobPreferences?.industryPreferences || [],
        preferredLocation,
      },
    };

    return this.normalizeStructuredResume(rawData, filename, contentType);
  }

  /**
   * Extract skills from text using keyword matching (fallback/supplement)
   */
  private extractSkillsFromText(text: string): {
    technicalSkills: string[];
    softSkills: string[];
  } {
    const lowerText = text.toLowerCase();

    const technicalSkills = TECHNICAL_KEYWORDS.filter((skill) =>
      lowerText.includes(skill.toLowerCase()),
    );

    const softSkills = SOFT_KEYWORDS.filter((skill) => lowerText.includes(skill.toLowerCase()));

    return { technicalSkills, softSkills };
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
   * Detect resume sections using keywords
   */
  private detectSections(text: string): ResumeSectionDto[] {
    const sections: ResumeSectionDto[] = [];
    const lines = text.split('\n');

    const sectionKeywords = {
      education: /education|academic|qualification|degree|university|college|school/i,
      experience: /experience|employment|work history|professional|career/i,
      skills: /skills|technical skills|competencies|expertise|proficiencies/i,
      personal: /personal|contact|profile|summary|objective/i,
    };

    let currentSection: ResumeSectionDto | null = null;
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
   * Extract education details from section (pattern-based)
   */
  private extractEducationFallback(
    section: ResumeSectionDto | undefined,
  ): Array<{ degree?: string; institutionName?: string; startDate?: string; endDate?: string }> {
    if (!section) return [];

    const educationRecords: Array<{
      degree?: string;
      institutionName?: string;
      startDate?: string;
      endDate?: string;
    }> = [];

    // Extract date ranges (e.g. "01/2010 - 01/2012") and individual years
    const dateRangeRegex =
      /(\d{2}\/\d{4}|\d{4})\s*[-–—]\s*(\d{2}\/\d{4}|\d{4}|Present|Current|Now|Ongoing)/gi;
    const dateRanges: Array<{ startDate: string; endDate: string }> = [];
    let rangeMatch;
    while ((rangeMatch = dateRangeRegex.exec(section.content)) !== null) {
      dateRanges.push({ startDate: rangeMatch[1], endDate: rangeMatch[2] });
    }

    // Fallback: extract individual years if no date ranges found
    const yearRegex = /\b(19|20)\d{2}\b/g;
    const years =
      dateRanges.length === 0
        ? (section.content.match(yearRegex) || []).sort((a, b) => parseInt(b) - parseInt(a))
        : [];

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

    // Institution patterns
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

    // Extract institutions using patterns
    let institutions: string[] = [];
    for (const pattern of institutionPatterns) {
      const matches = section.content.match(pattern);
      if (matches) {
        institutions.push(...matches.map((m) => m.trim()));
      }
    }
    // Remove duplicates and clean up
    institutions = [...new Set(institutions)].filter((inst) => inst.length > 3);

    // Create education records
    const maxRecords = Math.max(
      institutions.length,
      uniqueDegrees.length,
      dateRanges.length,
      years.length > 0 ? 1 : 0,
    );
    for (let i = 0; i < maxRecords; i++) {
      const record: {
        degree?: string;
        institutionName?: string;
        startDate?: string;
        endDate?: string;
      } = {};

      if (institutions[i]) record.institutionName = institutions[i];
      if (uniqueDegrees[i]) record.degree = uniqueDegrees[i];
      if (dateRanges[i]) {
        record.startDate = dateRanges[i].startDate;
        record.endDate = dateRanges[i].endDate;
      } else if (years[i]) {
        record.endDate = years[i];
      }

      // Only add if at least one field is populated
      if (record.institutionName || record.degree || record.startDate || record.endDate) {
        educationRecords.push(record);
      }
    }

    return educationRecords;
  }

  /**
   * Extract experience details (pattern-based fallback mode)
   */
  private extractExperienceFallback(section: ResumeSectionDto | undefined): Array<{
    jobTitle?: string;
    companyName?: string;
    designation?: string;
    startDate?: string;
    endDate?: string;
    description?: string[];
  }> {
    if (!section) return [];

    const experienceRecords: Array<{
      jobTitle?: string;
      companyName?: string;
      designation?: string;
      startDate?: string;
      endDate?: string;
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
      startDate?: string;
      endDate?: string;
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

        // Parse duration into startDate and endDate
        const { startDate: parsedStart, endDate: parsedEnd } =
          this.parseDurationToStartEnd(foundDuration);

        // Start new record
        currentRecord = {
          jobTitle: foundJobTitle,
          startDate: parsedStart,
          endDate: parsedEnd,
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
    section: ResumeSectionDto | undefined,
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

    const lowerText = searchText.toLowerCase();

    const technicalSkills = TECHNICAL_KEYWORDS.filter((skill) =>
      lowerText.includes(skill.toLowerCase()),
    );

    const softSkills = SOFT_KEYWORDS.filter((skill) => lowerText.includes(skill.toLowerCase()));

    return { technicalSkills, softSkills };
  }

  /**
   * Create fallback structure when AI extraction fails
   */
  private createFallbackStructure(
    filename: string,
    contentType: string,
    resumeText: string,
  ): StructuredResumeDataDto {
    this.logger.log('AI extraction unavailable — using pattern-based fallback extraction');

    // Extract using regex and section detection
    const ruleBasedData = this.extractWithRegex(resumeText);
    const sections = this.detectSections(resumeText);
    const name = this.extractNameFallback(resumeText);

    // Use pattern-based extraction methods
    const educationalDetails = this.extractEducationFallback(
      sections.find((s) => s.type === 'education'),
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

    const rawData: Partial<StructuredResumeDataDto> = {
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
    data: Partial<StructuredResumeDataDto>,
    filename: string,
    contentType: string,
  ): StructuredResumeDataDto {
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
      profileSummary: nullToUndefined(data.personalDetails?.profileSummary),
      headline: nullToUndefined(data.personalDetails?.headline),
    };

    // Normalize educational details - filter out empty objects
    const rawEducation = data.educationalDetails ?? [];
    const educationalDetails = rawEducation
      .map((edu) => ({
        degree: nullToUndefined(edu.degree),
        institutionName: nullToUndefined(edu.institutionName),
        startDate: nullToUndefined(edu.startDate),
        endDate: nullToUndefined(edu.endDate),
      }))
      .filter(
        (edu) =>
          edu.degree !== undefined ||
          edu.institutionName !== undefined ||
          edu.startDate !== undefined ||
          edu.endDate !== undefined,
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
        startDate: nullToUndefined(exp.startDate),
        endDate: nullToUndefined(exp.endDate),
        description: Array.isArray(exp.description) ? exp.description : [],
      }))
      .filter(
        (exp) =>
          exp.jobTitle !== undefined ||
          exp.companyName !== undefined ||
          exp.designation !== undefined ||
          exp.startDate !== undefined ||
          exp.endDate !== undefined ||
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
   * Parse a duration string (e.g. "Jan 2019 - Present") into startDate and endDate
   */
  private parseDurationToStartEnd(duration?: string): {
    startDate?: string;
    endDate?: string;
  } {
    if (!duration) return {};

    // Split on common separators: -, –, —, "to"
    const parts = duration.split(/\s*[-–—]\s*|\s+to\s+/i).map((p) => p.trim());
    if (parts.length >= 2) {
      return {
        startDate: parts[0],
        endDate: parts[1],
      };
    }

    // Single date - treat as endDate
    return { endDate: parts[0] };
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
