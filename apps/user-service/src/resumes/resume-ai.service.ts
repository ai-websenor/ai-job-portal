import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

/**
 * Final structured resume interface
 */
export interface StructuredResume {
  personalDetails: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    state: string;
    city: string;
    country: string;
  };
  educationalDetails: {
    degree: string;
    institutionName: string;
    yearOfCompletion: string;
  }[];
  skills: {
    technicalSkills: string[];
    softSkills: string[];
  };
  experienceDetails: {
    jobTitle: string;
    companyName: string;
    designation: string;
    duration: string;
    description: string[];
  }[];
  jobPreferences: {
    industryPreferences: string[];
    preferredLocation: string[];
  };
}

@Injectable()
export class ResumeAiService {
  private readonly logger = new Logger(ResumeAiService.name);
  private openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("OPENAI_API_KEY");

    if (!apiKey) {
      this.logger.error("OPENAI_API_KEY is missing");
      return;
    }

    this.openai = new OpenAI({ apiKey });
  }

  async extractStructuredData(
    resumeText: string,
  ): Promise<StructuredResume> {
    if (!this.openai) {
      throw new InternalServerErrorException("OpenAI not configured");
    }

    const prompt = `
You are a resume parser.

Convert the resume text into VALID JSON ONLY.

STRICT JSON SCHEMA (do not add extra fields):

{
  "personalDetails": {
    "firstName": "",
    "lastName": "",
    "phoneNumber": "",
    "email": "",
    "state": "",
    "city": "",
    "country": ""
  },
  "educationalDetails": [
    {
      "degree": "",
      "institutionName": "",
      "yearOfCompletion": ""
    }
  ],
  "skills": {
    "technicalSkills": [],
    "softSkills": []
  },
  "experienceDetails": [
    {
      "jobTitle": "",
      "companyName": "",
      "designation": "",
      "duration": "",
      "description": []
    }
  ],
  "jobPreferences": {
    "industryPreferences": [],
    "preferredLocation": []
    
  }
}

RULES:
- Return ONLY valid JSON
- Do NOT explain anything
- If data is missing, keep empty string or empty array
- If multiple degrees exist, add multiple objects
- Split full name into firstName and lastName if possible

Resume Text:
"""
${resumeText}
"""
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You extract structured resume data.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;

      // ✅ Parse JSON string into object
      return JSON.parse(content) as StructuredResume;
    } catch (error: any) {
      this.logger.error("Resume parsing failed", error);
      throw new InternalServerErrorException(
        "AI resume extraction failed",
      );
    }
  }
}
