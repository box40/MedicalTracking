import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Pill, LogEntry, PillTaken } from '../types';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Parses a natural language string to suggest a log entry.
 */
export const parseNaturalLanguageLog = async (
  input: string,
  availablePills: Pill[]
): Promise<{ pillsTaken: PillTaken[], notes: string, confidence: string } | null> => {
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
