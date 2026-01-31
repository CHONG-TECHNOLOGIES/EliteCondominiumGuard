import { GoogleGenAI } from "@google/genai";
import { logger, ErrorCategory } from '@/services/logger';

const API_KEY = process.env.API_KEY || ''; 

// Safe initialization that doesn't crash if key is missing (just fails on call)
let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

export const askConcierge = async (question: string, condoContext: string): Promise<string> => {
  if (!ai) return "Serviço de IA não configurado (Falta API Key).";

  try {
    const model = "gemini-2.5-flash";
    const systemInstruction = `
      Você é um Assistente de Portaria prestável para o 'Elite AccesControl'.
      O seu objetivo é ajudar o porteiro a esclarecer regras ou redigir mensagens educadas para os moradores.
      
      Contexto do Condomínio: ${condoContext}
      
      Mantenha as respostas curtas, profissionais e claras. O porteiro está a usar um tablet/kiosk.
      Responda sempre em Português de Portugal.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: question,
      config: {
        systemInstruction,
        maxOutputTokens: 150, // Keep it brief
      }
    });

    return response.text || "Desculpe, não consegui gerar uma resposta.";
  } catch (error) {
    logger.error('Gemini API error', error, ErrorCategory.NETWORK);
    return "Erro ao conectar com o assistente IA.";
  }
};