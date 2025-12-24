import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import * as mammoth from "mammoth";

@Injectable()
export class ResumeTextService {
  private readonly logger = new Logger(ResumeTextService.name);

  async extractText(file: Buffer, contentType: string): Promise<string> {
    try {
      if (contentType === "application/pdf") {
        return await this.parsePdf(file);
      }

      if (
        contentType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        contentType === "application/msword"
      ) {
        return await this.parseDocx(file);
      }

      throw new BadRequestException(`Unsupported file type: ${contentType}`);
    } catch (error: any) {
      this.logger.error(
        `Error extracting resume text: ${error?.message || "Unknown error"}`
      );
      return "";
    }
  }

  private async parsePdf(file: Buffer): Promise<string> {
    // Dynamic import to handle potential issues with pdf-parse in some environments
    const pdfParse = (await import("pdf-parse")) as any;
    const data = await pdfParse.default(file);
    return data.text;
  }

  private async parseDocx(file: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer: file });
    return result.value;
  }
}
