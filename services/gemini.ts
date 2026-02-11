
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const askAIAssistant = async (prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `
        You are an expert AI assistant specialized in document processing and data conversion.
        User Question: ${prompt}
        
        Context: The user is using an online tool to convert PDFs to Excel/Word. 
        Help them with questions about formatting, data extraction, or how to get the best results from their PDF documents.
        
        Provide a concise, helpful answer.
      `,
      config: {
        thinkingConfig: { thinkingBudget: 2000 }
      }
    });
    
    return response.text;
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return "I apologize, but I'm having trouble processing that request right now. Please try again.";
  }
};
