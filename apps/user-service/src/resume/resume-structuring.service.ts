import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { TECHNICAL_KEYWORDS, SOFT_KEYWORDS } from './utils/resume-keywords.constant';

import {
  StructuredResumeDataDto,
  ResumeSectionDto,
  ProjectDetailDto,
  CertificationDetailDto,
} from './dto/resume.dto';

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
    location?: string;
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
    location?: string;
    skillsUsed?: string[];
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
   * Structure resume using custom AI model hosted at AI_MODEL_URL.
   * The AI service is async: POST /parse returns { job_id }, then we poll
   * GET /parse-status/{job_id} until status is "done" and result is available.
   */
  async structureResumeWithCustomModel(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<StructuredResumeDataDto | null> {
    const aiModelUrl =
      process.env.AI_MODEL_URL ||
      'http://ai-job-portal-dev-alb-1152570158.ap-south-1.elb.amazonaws.com/ai';

    try {
      this.logger.log(`Calling custom AI model for resume structuring: ${filename}`);

      // Step 1: Submit parse job
      const form = new FormData();
      form.append('file', buffer, {
        filename,
        contentType: mimeType,
      });

      const submitResponse = await axios.post(`${aiModelUrl}/parse`, form, {
        headers: form.getHeaders(),
        timeout: 30000,
      });

      const jobId = submitResponse.data?.job_id;
      if (!jobId) {
        this.logger.error(`AI model did not return a job_id for ${filename}`);
        return null;
      }

      this.logger.log(`AI parse job submitted: ${jobId} for ${filename}`);

      // Step 2: Poll for result
      const aiResponse = await this.pollParseResult(aiModelUrl, jobId);
      if (!aiResponse) {
        this.logger.error(`AI parse job ${jobId} failed or timed out for ${filename}`);
        return null;
      }

      this.logger.log(`AI parse result keys: ${JSON.stringify(Object.keys(aiResponse || {}))}`);

      return this.mapAIModelResponse(aiResponse, filename, mimeType);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        this.logger.error(`Custom AI model failed (${status}) for ${filename}: ${errorMessage}`);
      } else {
        this.logger.error(`Custom AI model failed for ${filename}: ${errorMessage}`);
      }
      return null;
    }
  }

  /**
   * Polls GET /parse-status/{jobId} until status is "done" or "error", or timeout.
   * Returns the parsed result object, or null on failure/timeout.
   */
  private async pollParseResult(aiModelUrl: string, jobId: string): Promise<any | null> {
    const maxAttempts = 60; // 60 polls × 2s = 120s max
    const pollIntervalMs = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.sleep(pollIntervalMs);

      try {
        const statusResponse = await axios.get(`${aiModelUrl}/parse-status/${jobId}`, {
          timeout: 10000,
        });

        const data = statusResponse.data;
        const status = data?.status;

        if (status === 'done') {
          this.logger.log(`AI parse job ${jobId} completed on attempt ${attempt}`);
          return data.result;
        }

        if (status === 'error') {
          this.logger.error(`AI parse job ${jobId} failed: ${data.error || 'Unknown error'}`);
          return null;
        }

        // Still processing — log progress if available
        if (attempt % 5 === 0) {
          this.logger.log(
            `AI parse job ${jobId} still processing (attempt ${attempt}/${maxAttempts}, progress: ${data.progress || 'unknown'})`,
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`AI parse poll attempt ${attempt} failed for ${jobId}: ${errorMessage}`);
        // Continue polling on transient errors
      }
    }

    this.logger.error(`AI parse job ${jobId} timed out after ${maxAttempts} attempts`);
    return null;
  }

  /**
   * Maps the custom AI model's ResumeOutput (ConfidenceField format) to StructuredResumeDataDto.
   *
   * AI model returns: { personal, experience[], education[], skills[], certifications[],
   *   projects[], achievements[], publications[], languages[], hobbies[] }
   * Each field uses ConfidenceField { value: string | null, confidence: number }
   */
  private mapAIModelResponse(
    aiResponse: any,
    filename: string,
    contentType: string,
  ): StructuredResumeDataDto {
    this.logger.log(`mapAIModelResponse - keys: ${JSON.stringify(Object.keys(aiResponse || {}))}`);
    this.logger.log(
      `mapAIModelResponse - personal keys: ${JSON.stringify(Object.keys(aiResponse?.personal || {}))}`,
    );
    this.logger.log(
      `mapAIModelResponse - experience count: ${(aiResponse?.experience || []).length}`,
    );
    this.logger.log(`mapAIModelResponse - skills count: ${(aiResponse?.skills || []).length}`);
    this.logger.log(
      `mapAIModelResponse - education count: ${(aiResponse?.education || []).length}`,
    );

    // Helper to extract .value from ConfidenceField { value, confidence }
    const cfv = (field: any): string | undefined => {
      if (!field) return undefined;
      // If the field has a .value property, use it (ConfidenceField format)
      if (typeof field === 'object' && 'value' in field) {
        return field.value || undefined;
      }
      // If the field is already a plain string, return it directly
      if (typeof field === 'string') return field || undefined;
      return undefined;
    };

    const personal = aiResponse.personal || {};

    // Derive first/last name — prefer first_name/last_name, fall back to splitting name
    let firstName = cfv(personal.first_name);
    let lastName = cfv(personal.last_name);
    if (!firstName && !lastName && cfv(personal.name)) {
      const nameParts = cfv(personal.name)!.trim().split(/\s+/);
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ') || undefined;
    }

    const personalDetails = {
      firstName,
      lastName,
      phoneNumber: cfv(personal.phone),
      email: cfv(personal.email),
      city: cfv(personal.city) || cfv(personal.address),
      state: cfv(personal.state),
      country: cfv(personal.country),
      profileSummary: cfv(personal.summary) || cfv(personal.headline),
      headline: cfv(personal.headline),
    };

    // Map education
    const educationalDetails = (aiResponse.education || []).map((edu: any) => {
      const degree = cfv(edu.degree);
      const field = cfv(edu.field);
      // Combine degree and field (e.g., "B.Tech, Computer Science")
      const combinedDegree = degree && field ? `${degree}, ${field}` : degree || field || undefined;

      return {
        degree: combinedDegree,
        institutionName: cfv(edu.institution),
        startDate: cfv(edu.start_date),
        endDate: cfv(edu.year) || cfv(edu.end_date),
      };
    });

    // Map skills — separate technical vs soft using keyword lists
    const allSkills: string[] = (aiResponse.skills || [])
      .map((s: any) => cfv(s))
      .filter(Boolean) as string[];

    const softSkillsLower = new Set(SOFT_KEYWORDS.map((s) => s.toLowerCase()));
    const technicalSkills: string[] = [];
    const softSkills: string[] = [];

    for (const skill of allSkills) {
      if (softSkillsLower.has(skill.toLowerCase())) {
        softSkills.push(skill);
      } else {
        technicalSkills.push(skill);
      }
    }

    // Helper to split a description string into an array of bullet points / lines
    const splitDescription = (desc: string | undefined): string[] => {
      if (!desc) return [];
      return desc
        .split(/\n|(?:^|\s)[•\-*]\s/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    };

    // Helper to extract skills_used from experience/project entries
    const extractSkillsUsed = (entry: any): string[] => {
      const raw = entry.skills_used || entry.skillsUsed;
      if (!raw) return [];
      // skills_used can be an array of ConfidenceFields or plain strings
      if (Array.isArray(raw)) {
        return raw.map((s: any) => cfv(s) || (typeof s === 'string' ? s : '')).filter(Boolean);
      }
      // Or a single ConfidenceField with comma-separated value
      const val = cfv(raw);
      if (val) {
        return val
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
      return [];
    };

    // Map experience — convert skills_used → skillsUsed
    const experienceDetails: Array<{
      jobTitle?: string;
      companyName?: string;
      designation?: string;
      startDate?: string;
      endDate?: string;
      description?: string[];
      skillsUsed?: string[];
    }> = (aiResponse.experience || []).map((exp: any) => ({
      jobTitle: cfv(exp.role) || cfv(exp.job_title) || cfv(exp.title),
      companyName: cfv(exp.company),
      designation: cfv(exp.designation),
      startDate: cfv(exp.start_date),
      endDate: cfv(exp.end_date),
      description: splitDescription(cfv(exp.description)),
      skillsUsed: extractSkillsUsed(exp),
    }));

    // Map projects as experience entries (for experienceDetails backward compat)
    const projectEntries = (aiResponse.projects || []).map((proj: any) => {
      // technologies can be a ConfidenceField string or an array
      const techVal = cfv(proj.technologies);
      const techSkills = techVal
        ? techVal
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : extractSkillsUsed(proj);

      return {
        jobTitle: cfv(proj.role) || 'Project',
        companyName: cfv(proj.name) || cfv(proj.client),
        designation: undefined,
        startDate: cfv(proj.start_date),
        endDate: cfv(proj.end_date),
        description: splitDescription(cfv(proj.description) || cfv(proj.responsibilities)),
        skillsUsed: techSkills,
      };
    });

    // Map projects as dedicated ProjectDetailDto array (new field)
    const projects: ProjectDetailDto[] = (aiResponse.projects || [])
      .map((proj: any) => {
        const techVal = cfv(proj.technologies);
        const technologies = techVal
          ? techVal
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [];
        const responsibilitiesVal = cfv(proj.responsibilities);
        const responsibilities = responsibilitiesVal ? splitDescription(responsibilitiesVal) : [];

        const mapped: ProjectDetailDto = {
          name: cfv(proj.name),
          client: cfv(proj.client),
          role: cfv(proj.role),
          description: cfv(proj.description),
          responsibilities: responsibilities.length > 0 ? responsibilities : undefined,
          technologies: technologies.length > 0 ? technologies : undefined,
          url: cfv(proj.url),
        };
        return mapped;
      })
      .filter((p: ProjectDetailDto) => p.name || p.description || p.role);

    // Map certifications
    const certifications: CertificationDetailDto[] = (aiResponse.certifications || [])
      .map((cert: any) => ({
        name: cfv(cert.name) || cfv(cert),
        issuer: cfv(cert.issuer) || cfv(cert.organization),
        date: cfv(cert.date) || cfv(cert.year),
      }))
      .filter((c: CertificationDetailDto) => c.name);

    // Map achievements — extract .value from each entry
    const achievements: string[] = (aiResponse.achievements || [])
      .map((a: any) => cfv(a))
      .filter(Boolean) as string[];

    // Map publications
    const publications: string[] = (aiResponse.publications || [])
      .map((p: any) => cfv(p))
      .filter(Boolean) as string[];

    // Map languages
    const languages: string[] = (aiResponse.languages || [])
      .map((l: any) => cfv(l))
      .filter(Boolean) as string[];

    // Map hobbies
    const hobbies: string[] = (aiResponse.hobbies || [])
      .map((h: any) => cfv(h))
      .filter(Boolean) as string[];

    // Build job preferences from location
    const locationParts = [
      personalDetails.city,
      personalDetails.state,
      personalDetails.country,
    ].filter(Boolean);
    const jobPreferences = {
      industryPreferences: [] as string[],
      preferredLocation: locationParts.length > 0 ? [locationParts.join(', ')] : [],
    };

    const rawData: Partial<StructuredResumeDataDto> = {
      personalDetails,
      educationalDetails,
      skills: { technicalSkills, softSkills },
      experienceDetails: [...experienceDetails, ...projectEntries],
      jobPreferences,
      // Include additional sections only when data exists
      ...(projects.length > 0 && { projects }),
      ...(certifications.length > 0 && { certifications }),
      ...(achievements.length > 0 && { achievements }),
      ...(publications.length > 0 && { publications }),
      ...(languages.length > 0 && { languages }),
      ...(hobbies.length > 0 && { hobbies }),
    };

    return this.normalizeStructuredResume(rawData, filename, contentType);
  }

  /**
   * Build system prompt for resume extraction
   */
  private buildSystemPrompt(): string {
    return `You are an expert resume parser that handles ALL resume formats (chronological, functional, combination, creative, two-column, academic CV). Extract information and return ONLY valid JSON. No explanations, no markdown, no text outside the JSON object.

Rules:

PERSONAL DETAILS:
- "firstName" and "lastName": Convert ALL CAPS names to Title Case (e.g., "JOHN DOE" → "John", "Doe"). Ignore prefixes (Mr./Mrs./Dr.) and suffixes (Jr./Sr./III).
- "phoneNumber": Extract exactly as written including country codes. Handle all formats: +1-234-567-8901, (234) 567-8901, +91 98765 43210, etc.
- "email": Extract exactly as written.
- "city" and "state": Extract from the contact/header section.
- "country": ALWAYS infer the country from city and state. Examples: "San Francisco, California" → "USA", "Mumbai, Maharashtra" → "India", "London" → "United Kingdom", "Toronto, Ontario" → "Canada", "Berlin" → "Germany", "Dubai" → "UAE", "Sydney, NSW" → "Australia", "Bangalore" or "Hyderabad" → "India", "New York" → "USA". If the city/state is not recognizable, leave empty.
- "profileSummary": Extract the candidate's summary/objective/about section verbatim. If none exists, generate a 2-3 sentence summary from their experience and skills.
- "headline": Extract or generate a concise professional headline (e.g., "Senior Full Stack Developer with 5+ years experience").

EDUCATION:
- "degree": Include full degree name WITH major/specialization (e.g., "M.S., Computer Science" not just "M.S.").
- "institutionName": Full university/college/school name.
- "location": City, state, or country of the institution if mentioned in the resume. Leave empty if not mentioned.
- "startDate" and "endDate": MM/YYYY format. If only a graduation year is shown (e.g., "2012"), set endDate to that year as-is and leave startDate empty. Do NOT invent or guess month values that are not in the resume.

SKILLS:
- "technicalSkills": Split grouped skills into INDIVIDUAL items. "JavaScript: ReactJS, AngularJS, NodeJS" → ["JavaScript", "ReactJS", "AngularJS", "NodeJS"]. "Databases: MongoDB, SQL" → ["MongoDB", "SQL"]. Remove category labels like "JavaScript:", "Mobile:", "Build/Deploy:" from skill names. Each skill must be a separate entry.
- "softSkills": Extract soft skills (communication, leadership, teamwork, problem-solving, etc.) if mentioned.

EXPERIENCE:
- Include BOTH work experience AND projects (personal, academic, freelance) in experienceDetails.
- "jobTitle": The role/position title exactly as written.
- "companyName": For employment, use the employer/organization name. For projects, use the PROJECT NAME itself (e.g., "PicoShell", "TagMe"), NOT link labels or URLs like "Code" or "App" or "GitHub".
- "startDate" and "endDate": MM/YYYY format. Use "Present" for current roles. If only years are given (e.g., "2011-2016"), use years as-is without fabricating months.
- "description": Extract EVERY bullet point, achievement, and responsibility under each role as a separate string. Include metrics and quantifiable results. NEVER return empty description arrays when the resume has bullet points or text under a role.
- "location": City, state, or country of the job/project if mentioned. Leave empty if not mentioned.
- "skillsUsed": Infer the specific technologies, tools, frameworks, and skills used in that particular role/project from its description and context. Each skill as a separate string (e.g., ["Java", "Spring", "SQL", "REST"]). Do NOT copy the entire skills section — only skills relevant to that specific role.

JOB PREFERENCES:
- "industryPreferences": Infer 1-3 industries from the candidate's experience (e.g., ["Technology", "E-commerce"]).
- "preferredLocation": Use candidate's city, state, country as separate entries.

IMPORTANT:
- NEVER fabricate information not present in the resume. Leave fields as empty string or empty array if data is missing.
- Handle garbled or poorly extracted PDF text by interpreting it as best as possible.
- Distinguish sections correctly: EXPERIENCE/EMPLOYMENT vs PROJECTS vs EDUCATION vs SKILLS vs CERTIFICATIONS.

Return exactly this JSON structure:
{"personalDetails":{"firstName":"","lastName":"","phoneNumber":"","email":"","city":"","state":"","country":"","profileSummary":"","headline":""},"educationalDetails":[{"degree":"","institutionName":"","location":"","startDate":"","endDate":""}],"skills":{"technicalSkills":[],"softSkills":[]},"experienceDetails":[{"jobTitle":"","companyName":"","startDate":"","endDate":"","description":[],"location":"","skillsUsed":[]}],"jobPreferences":{"industryPreferences":[],"preferredLocation":[]}}`;
  }

  /**
   * Build user prompt with resume text
   */
  private buildUserPrompt(resumeText: string): string {
    // Limit resume text to prevent token overflow
    const truncatedText = resumeText.slice(0, 6000);
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
          max_tokens: 3000,
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
        location: nullToUndefined(edu.location),
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
        location: nullToUndefined(exp.location),
        skillsUsed: Array.isArray(exp.skillsUsed) ? exp.skillsUsed : [],
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

    const result: StructuredResumeDataDto = {
      filename,
      contentType,
      personalDetails,
      educationalDetails,
      skills,
      experienceDetails,
      jobPreferences,
    };

    // Pass through optional sections if present
    if (data.projects && data.projects.length > 0) {
      result.projects = data.projects;
    }
    if (data.certifications && data.certifications.length > 0) {
      result.certifications = data.certifications;
    }
    if (data.achievements && data.achievements.length > 0) {
      result.achievements = data.achievements;
    }
    if (data.publications && data.publications.length > 0) {
      result.publications = data.publications;
    }
    if (data.languages && data.languages.length > 0) {
      result.languages = data.languages;
    }
    if (data.hobbies && data.hobbies.length > 0) {
      result.hobbies = data.hobbies;
    }

    return result;
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
