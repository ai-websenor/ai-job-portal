import { Injectable, Logger, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface StructuredResume {
  personalDetails: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    [key: string]: any;
  };
  skills: string[];
}

@Injectable()
export class ResumeAiService {
  private readonly logger = new Logger(ResumeAiService.name);
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("GOOGLE_AI_API_KEY");

    console.log("api-key>>>>>>>>>>>>>>", apiKey);
    if (!apiKey) {
      this.logger.warn("GOOGLE_AI_API_KEY is not set. AI parsing will fail.");
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async extractStructuredData(text: string): Promise<StructuredResume> {
    if (!this.genAI) {
      throw new InternalServerErrorException("Gemini AI is not configured");
    }

    try {
      let model;
      try {
        model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        this.logger.log("Using gemini-1.5-flash for extraction");
      } catch (e) {
        this.logger.warn("gemini-1.5-flash failed to initialize, falling back to gemini-pro");
        model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      }

      const prompt = `
        You are an expert resume parser. Extract the following information from the resume text provided below in JSON format.
        
        Fields to extract:
        1. personalDetails: { name, email, phone, address, age (if available) }
        2. skills: [list of skills as strings]

        Resume Text:
        """
        ${text}
        """

        Return ONLY the JSON object. Do not include any markdown formatting like \`\`\`json.
      `;

      let result;
      try {
        result = await model.generateContent(prompt);
      } catch (error: any) {
        if (error.message?.includes("404") || error.message?.includes("not found")) {
          this.logger.warn(`Model not found, trying gemini-pro fallback...`);
          model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
          result = await model.generateContent(prompt);
        } else {
          throw error;
        }
      }

      const response = await result.response;
      let responseText = response.text().trim();

      // Clean up potential markdown code blocks if the model ignored instructions
      responseText = responseText.replace(/```json\n?/, "").replace(/\n?```/, "");

      console.log("<<<<<<<<<<<<<<<<<<<<<responseText>>>>>>>>>>>>>>", responseText);

      try {
        return JSON.parse(responseText) as StructuredResume;
      } catch (parseError) {
        this.logger.error("Failed to parse Gemini response as JSON", responseText);
        throw new InternalServerErrorException("Failed to structure resume data");
      }
    } catch (error: any) {
      this.logger.error(`Error in Gemini AI extraction: ${error.message}`);
      throw new InternalServerErrorException("AI resume extraction failed");
    }
  }
}
