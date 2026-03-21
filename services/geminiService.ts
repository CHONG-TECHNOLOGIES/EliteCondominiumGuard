/// <reference types="vite/client" />
import { GoogleGenAI } from "@google/genai";
import * as XLSX from 'xlsx';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const client = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export interface ParsedResident {
  name: string;
  email?: string;
  phone?: string;
  unit_number?: string;
  unit_block?: string;
  type?: 'OWNER' | 'TENANT';
  confidence?: number;
}

export const GeminiService = {
  async analyzeResidentFile(file: File): Promise<ParsedResident[]> {
    if (!client) {
      throw new Error("VITE_GEMINI_API_KEY não configurada no ficheiro .env.local");
    }

    let content: any;

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      content = `Conteúdo do Excel (CSV):\n${csv}`;
    } else if (file.name.endsWith('.csv')) {
      content = await file.text();
    } else {
      content = await this.fileToDataPart(file);
    }

    const prompt = `
      Analise este ficheiro de residentes de um condomínio e extraia a informação para um formato JSON.
      O ficheiro pode ser um PDF, Excel (convertido para CSV) ou CSV.
      
      Extraia os seguintes campos:
      - name (Nome completo)
      - email (Email, se existir)
      - phone (Telefone/Telemóvel, se existir)
      - unit_number (Número da porta/unidade)
      - unit_block (Bloco ou edifício, se existir)
      - type (Se é Proprietário ou Inquilino. Use apenas 'OWNER' para proprietário e 'TENANT' para inquilino. Se não souber, assuma 'OWNER')

      Responda APENAS com um array JSON válido, sem markdown ou explicações.
      Exemplo de formato:
      [
        {
          "name": "João Silva",
          "email": "joao@email.com",
          "phone": "912345678",
          "unit_number": "1A",
          "unit_block": "Bloco 2",
          "type": "OWNER"
        }
      ]
    `;

    try {
      const result = await client.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }, typeof content === 'string' ? { text: content } : content] }]
      });
      
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Clean up potential markdown formatting
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : text;
      
      try {
        return JSON.parse(jsonString) as ParsedResident[];
      } catch (parseError) {
        console.error("JSON parse error:", text);
        throw new Error("O Gemini retornou um formato inválido. Tente novamente.");
      }
    } catch (error) {
      console.error("Gemini analysis error:", error);
      throw new Error("Falha ao analisar o ficheiro com Gemini. Verifique a chave da API ou o formato do ficheiro.");
    }
  },

  async fileToDataPart(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve({
          inlineData: {
            data: base64,
            mimeType: file.type || 'application/octet-stream'
          }
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};

export async function askConcierge(query: string, context: string): Promise<string> {
  if (!client) {
    return "Serviço de IA não disponível.";
  }

  try {
    const result = await client.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{
        role: 'user',
        parts: [
          { text: `Você é o concierge virtual do Elite Condomínio Guard. Responda à pergunta do staff baseando-se no contexto abaixo.\n\nContexto:\n${context}` },
          { text: `Pergunta: ${query}` }
        ]
      }]
    });

    return result.candidates?.[0]?.content?.parts?.[0]?.text || "Não consegui processar a resposta.";
  } catch (error) {
    console.error("AskConcierge error:", error);
    return "Desculpe, ocorreu um erro ao contactar a IA.";
  }
}