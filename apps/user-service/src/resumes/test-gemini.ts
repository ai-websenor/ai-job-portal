import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function listModels() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error("GOOGLE_AI_API_KEY not found in .env");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Attempting to generate content with gemini-1.5-flash...");
    const result = await model.generateContent("Hello");
    console.log("Success:", result.response.text());
  } catch (error: any) {
    console.error("Error with gemini-1.5-flash:", error.message);
    
    // Attempt to list models (if the SDK supports it in this version)
    // Actually the SDK doesn't have a direct listModels on genAI instance usually, 
    // it's often a separate REST call or a different part of the API.
  }
}

listModels();
