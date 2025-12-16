import { GoogleGenAI } from "@google/genai";
import { Transaction, Budget, Goal, Insight } from '../types';

// Access the injected environment variable safely
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export interface AuditAdvice {
  score: number;
  message: string;
}

export const generateFinancialInsights = async (
  transactions: Transaction[],
  budgets: Budget[],
  goals: Goal[]
): Promise<Insight[]> => {
  if (!apiKey) return [];

  const prompt = `
    Analyze these financial records and provide 3-5 concise, actionable insights (opportunities to save, warnings, or debt management).
    Transactions: ${JSON.stringify(transactions.slice(0, 50))}
    Budgets: ${JSON.stringify(budgets)}
    Goals: ${JSON.stringify(goals)}
    
    Return ONLY a JSON array with objects matching this interface:
    {
      id: string;
      title: string;
      description: string;
      type: 'opportunity' | 'warning' | 'debt' | 'info';
      actionPlan: string[]; // 3 steps max
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
};

export const generateAuditAdvice = async (
    income: number, needs: number, wants: number, savings: number
): Promise<AuditAdvice> => {
    if(!apiKey) return { score: 0, message: "API Key missing" };

    const prompt = `
      Evaluate this 50/30/20 rule split:
      Income: ${income}
      Needs: ${needs} (${(needs/income*100).toFixed(1)}%)
      Wants: ${wants} (${(wants/income*100).toFixed(1)}%)
      Savings/Debt: ${savings} (${(savings/income*100).toFixed(1)}%)

      Return a JSON object: { "score": number (0-10), "message": "One sentence advice" }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return { score: 0, message: "Error generating advice" };
    }
};