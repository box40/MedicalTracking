import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Pill, LogEntry, PillTaken } from '../types';

const isAIConfigured = !!process.env.API_KEY && process.env.API_KEY !== "undefined" && process.env.API_KEY !== "";

const getAI = () => {
  if (!isAIConfigured) {
    throw new Error("GEMINI_API_KEY is not configured. Please add it to your environment variables.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY! });
};

export const isGeminiEnabled = () => isAIConfigured;

/**
 * Parses a natural language string to suggest a log entry.
 */
export const parseNaturalLanguageLog = async (
  input: string,
  availablePills: Pill[]
): Promise<{ pillsTaken: PillTaken[], notes: string, confidence: string } | null> => {
  if (!isAIConfigured) {
    // Basic mock logic for common patterns if AI is disabled
    const lowerInput = input.toLowerCase();
    const foundPills: PillTaken[] = [];
    
    availablePills.forEach(p => {
      if (lowerInput.includes(p.name.toLowerCase())) {
        // Try to find quantity
        const words = lowerInput.split(' ');
        const pillIndex = words.findIndex(w => w.includes(p.name.toLowerCase()));
        let quantity = 1;
        if (pillIndex > 0) {
          const prevWord = words[pillIndex - 1];
          const num = parseFloat(prevWord);
          if (!isNaN(num)) quantity = num;
        }
        foundPills.push({ pillId: p.id, quantity });
      }
    });

    if (foundPills.length > 0) {
      return { pillsTaken: foundPills, notes: input, confidence: "LOW" };
    }
    return null;
  }

  const ai = getAI();
  
  const pillMap = availablePills.map(p => ({ id: p.id, name: p.name })).map(p => `${p.name} (ID: ${p.id})`).join(', ');

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      pillsTaken: {
        type: Type.ARRAY,
        items: { 
            type: Type.OBJECT,
            properties: {
                pillId: { type: Type.STRING },
                quantity: { type: Type.NUMBER, description: "Amount taken, e.g. 1, 2, 0.5" }
            },
            required: ["pillId", "quantity"]
        },
        description: "List of Pills extracted from text."
      },
      notes: {
        type: Type.STRING,
        description: "Any extra context mentioned (e.g., 'after dinner', 'headache')."
      },
      confidence: {
        type: Type.STRING,
        enum: ["HIGH", "LOW"],
        description: "Confidence level of the match."
      }
    },
    required: ["pillsTaken", "confidence"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `User Input: "${input}". 
      Available Pills: [${pillMap}].
      Task: Extract the pills taken. If a pill name roughly matches an available pill, include its ID and the quantity mentioned (default to 1 if not specified). Max 5 pills.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (e) {
    console.error("AI Parse Error", e);
    return null;
  }
};

/**
 * Answers questions about the user's log history.
 */
export const analyzeHistory = async (
  query: string,
  logs: LogEntry[],
  pills: Pill[]
): Promise<string> => {
  if (!isAIConfigured) {
    return "AI analysis is currently disabled because the GEMINI_API_KEY is not set. You can still view your logs in the Diary tab.";
  }
  const ai = getAI();

  // Create a minified text representation of the data to fit context
  const pillLookup = new Map(pills.map(p => [p.id, p]));
  
  const historyText = logs.slice(0, 50).map(log => { // Last 50 logs for context
    const items = log.pillsTaken?.map(item => {
        const p = pillLookup.get(item.pillId);
        return p ? `${item.quantity}x ${p.name}` : `${item.quantity}x Unknown`;
    }).join(", ");
    
    // Fallback for migration if pillsTaken is missing but pillIds exists in older runtime memory
    const legacyItems = !log.pillsTaken && log.pillIds ? log.pillIds.map(id => pillLookup.get(id)?.name).join(", ") : "";

    return `[${new Date(log.timestamp).toLocaleString()}] Took: ${items || legacyItems}. Notes: ${log.notes || ''}`;
  }).join("\n");

  const prompt = `
    You are a helpful medical diary assistant.
    User Query: "${query}"
    
    Here is the recent medication log (User's local time):
    ${historyText}
    
    Ingredient details for reference:
    ${pills.map(p => `${p.name}: ${p.ingredients.map(i => `${i.name} ${i.dosageMg}mg`).join(', ')}`).join('\n')}
    
    Answer the user's question based on this data. Be concise. Do not give medical advice.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "I couldn't analyze the data at this moment.";
  } catch (e) {
    console.error("AI Analysis Error", e);
    return "Sorry, I encountered an error analyzing your logs.";
  }
};
