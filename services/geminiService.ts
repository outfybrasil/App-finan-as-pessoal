import { GoogleGenAI } from "@google/genai";
import { Transaction, Budget, Goal, Insight } from '../types';

// Initialize Gemini client
// Note: process.env.API_KEY is assumed to be available as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateFinancialInsights = async (
  transactions: Transaction[],
  budgets: Budget[],
  goals: Goal[]
): Promise<Insight[]> => {
  const modelId = 'gemini-2.5-flash';

  // Prepare data context for the AI
  const recentTransactions = transactions.slice(0, 20); // Last 20 for context
  const context = JSON.stringify({
    transactions: recentTransactions,
    budgets,
    goals
  });

  const prompt = `
    Você é o assistente de IA pessoal do Gustavo para finanças. 
    Analise os seguintes dados financeiros dele (JSON abaixo) e gere 3 insights curtos e acionáveis.
    
    Tipos de insights desejados:
    1. "opportunity": Sugestão de economia ou renegociação.
    2. "warning": Aviso sobre tendências de gastos acima da média.
    3. "debt": Estratégia para pagamento de dívidas (se houver indícios) ou "info" geral.

    Responda EXCLUSIVAMENTE com um JSON array válido de objetos com este formato, sem markdown code blocks:
    [
      {
        "id": "unique_string",
        "title": "Título curto",
        "description": "Descrição do problema ou oportunidade (max 20 palavras)",
        "type": "opportunity" | "warning" | "debt" | "info",
        "actionPlan": ["Passo 1: Ação prática", "Passo 2: Ação prática", "Passo 3: Ação prática"]
      }
    ]

    No campo "actionPlan", forneça 2 a 3 passos extremamente práticos e diretos para o Gustavo resolver o problema ou aproveitar a oportunidade.

    Dados: ${context}
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) return [];

    const insights = JSON.parse(text) as Insight[];
    return insights;

  } catch (error) {
    console.error("Error generating insights:", error);
    // Fallback mock insight in case of API failure or missing key
    return [
      {
        id: 'fallback-1',
        title: 'Modo Offline',
        description: 'Não foi possível conectar à IA. Verifique sua chave de API.',
        type: 'info',
        actionPlan: ['Verifique sua conexão com a internet', 'Confira se a chave de API está configurada corretamente']
      }
    ];
  }
};

export interface GoalStrategy {
    monthlyRequired: number;
    monthsRemaining: number;
    suggestion: string;
    alternativeScenario: string;
}

export const analyzeGoalStrategy = async (
    targetAmount: number,
    currentAmount: number,
    deadline: string,
    transactions: Transaction[] // Novo parâmetro
): Promise<GoalStrategy | null> => {
    const modelId = 'gemini-2.5-flash';
    
    // 1. Cálculos matemáticos básicos da meta
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const monthsRemaining = Math.max(
        (deadlineDate.getFullYear() - today.getFullYear()) * 12 + (deadlineDate.getMonth() - today.getMonth()),
        1
    );
    const amountNeeded = targetAmount - currentAmount;
    const mathMonthly = amountNeeded / monthsRemaining;

    // 2. Análise do Histórico Financeiro (Últimos 3 meses para média)
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 3);

    const recentTx = transactions.filter(t => new Date(t.date) >= cutoffDate);
    
    let totalIncome = 0;
    let totalExpense = 0;
    const expensesByCategory: Record<string, number> = {};

    recentTx.forEach(t => {
        if (t.type === 'income') {
            totalIncome += t.amount;
        } else {
            totalExpense += t.amount;
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        }
    });

    // Médias mensais (dividindo por 3 ou 1 se for novo usuário)
    const monthsData = recentTx.length > 0 ? 3 : 1;
    const avgIncome = totalIncome / monthsData;
    const avgExpense = totalExpense / monthsData;
    const avgDisposable = avgIncome - avgExpense;

    // Formatar categorias principais para o prompt
    const topCategories = Object.entries(expensesByCategory)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([cat, val]) => `${cat}: R$ ${(val/monthsData).toFixed(0)}/mês`)
        .join(', ');

    const prompt = `
      Atue como um planejador financeiro especialista e realista para o Gustavo.
      
      DADOS DA META:
      - Alvo: R$ ${targetAmount}
      - Atual: R$ ${currentAmount}
      - Prazo: ${deadline} (${monthsRemaining} meses)
      - Valor Matemático Necessário: R$ ${mathMonthly.toFixed(2)} / mês

      CONTEXTO FINANCEIRO DO GUSTAVO (Média Mensal Recente):
      - Renda Média: R$ ${avgIncome.toFixed(2)}
      - Gastos Médios: R$ ${avgExpense.toFixed(2)}
      - Sobra de Caixa (Disponível): R$ ${avgDisposable.toFixed(2)}
      - Onde mais gasta: ${topCategories || "Sem dados suficientes"}

      TAREFA:
      1. Verifique se o Gustavo consegue pagar o "Valor Matemático Necessário" com a "Sobra de Caixa".
      2. Se a Sobra for MENOR que o Necessário: Sugira cortes específicos nas categorias onde ele mais gasta para atingir a meta.
      3. Se a Sobra for MAIOR: Valide que a meta é saudável, mas sugira não usar toda a sobra.
      4. No "alternativeScenario", sugira como acelerar ou ajustar caso a meta seja impossível.

      Retorne APENAS um JSON:
      {
        "monthlyRequired": number (Use o valor matemático se for viável, ou um valor ajustado se precisar estender o prazo),
        "monthsRemaining": number,
        "suggestion": "string (Max 20 palavras. Ex: 'Corte R$ 200 em Lazer para viabilizar o depósito mensal de R$ 500.')",
        "alternativeScenario": "string (Max 20 palavras. Ex: 'Se reduzir Transporte, atinge a meta 2 meses antes.')"
      }
    `;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const text = response.text;
        if (!text) return null;
        return JSON.parse(text) as GoalStrategy;

    } catch (error) {
        console.error("Erro ao calcular estratégia de meta", error);
        return null;
    }
};

export interface AuditAdvice {
  score: number;
  message: string;
}

export const generateAuditAdvice = async (
  income: number,
  needs: number,
  wants: number,
  savings: number
): Promise<AuditAdvice | null> => {
  const modelId = 'gemini-2.5-flash';
  
  const needsPct = ((needs / income) * 100).toFixed(1);
  const wantsPct = ((wants / income) * 100).toFixed(1);
  const savingsPct = ((savings / income) * 100).toFixed(1);

  const prompt = `
    Atue como um Consultor Financeiro Sênior fazendo uma auditoria na regra 50/30/20.
    
    DADOS:
    - Renda: R$ ${income}
    - Necessidades (Meta 50%): ${needsPct}% (R$ ${needs})
    - Desejos (Meta 30%): ${wantsPct}% (R$ ${wants})
    - Investimentos/Dívidas (Meta 20%): ${savingsPct}% (R$ ${savings})

    TAREFA:
    1. Dê uma nota de 0 a 10 para a saúde financeira baseada APENAS nesses números.
    2. Escreva um comentário curto (Max 30 palavras) em primeira pessoa ("Eu notei que..."), direto e levemente informal, apontando onde está o desequilíbrio principal.

    Retorne JSON:
    {
      "score": number,
      "message": "string"
    }
  `;

  try {
      const response = await ai.models.generateContent({
          model: modelId,
          contents: prompt,
          config: { responseMimeType: "application/json" }
      });
      const text = response.text;
      if(!text) return null;
      return JSON.parse(text) as AuditAdvice;
  } catch (e) {
      console.error("Erro no audit", e);
      return null;
  }
}