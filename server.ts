import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import webpush from "web-push";
import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const VAPID_FILE = path.resolve(process.cwd(), 'vapid.json');
const SUBSCRIPTIONS_FILE = path.resolve(process.cwd(), 'subscriptions.json');

const vapidKeys =
  process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
    ? { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY }
    : fs.existsSync(VAPID_FILE)
      ? JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8'))
      : webpush.generateVAPIDKeys();

if (!fs.existsSync(VAPID_FILE) && !process.env.VAPID_PRIVATE_KEY) {
  fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2));
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify([]));
}

type StoredSubscription = {
  email: string;
  subscription: webpush.PushSubscription;
};

function readSubscriptions(): StoredSubscription[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Não foi possível ler as inscrições push:', error);
    return [];
  }
}

function writeSubscriptions(subscriptions: StoredSubscription[]) {
  const temporaryFile = `${SUBSCRIPTIONS_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(subscriptions));
  fs.renameSync(temporaryFile, SUBSCRIPTIONS_FILE);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Cron job to run daily at 08:00 AM to check for scheduled transactions
cron.schedule('0 8 * * *', async () => {
  await checkAndSendNotifications();
});

// Since we might want to test it immediately, let's also run it on startup and every hour
cron.schedule('0 * * * *', async () => {
  await checkAndSendNotifications();
});

async function checkAndSendNotifications() {
  console.log('Verificando transações agendadas para notificação...');
  try {
    if (!supabase) {
      console.warn('Supabase não configurado; verificação de notificações ignorada.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('date', today)
      .in('status', ['scheduled', 'pending']);
      
    if (error) throw error;
    if (!transactions || transactions.length === 0) return;

    // Load subscriptions
    const subscriptions = readSubscriptions();
    
    for (const t of transactions) {
      // Find user email from transaction id (format: email:transId)
      const parts = t.id.split(':');
      if (parts.length > 1) {
        const email = parts[0];
        const userSubs = subscriptions.filter((sub) => sub.email === email);
        
        for (const sub of userSubs) {
          try {
            const payload = JSON.stringify({
              title: 'Lembrete de Pagamento',
              body: `Você tem um pagamento agendado para hoje: ${t.description} no valor de R$ ${Number(t.amount).toFixed(2)}.`,
              url: '/'
            });
            await webpush.sendNotification(sub.subscription, payload);
          } catch (e) {
            console.error('Erro ao enviar push para', email, e);
            // If subscription is invalid/expired, we could remove it here
          }
        }
      }
    }
  } catch (e) {
    console.error('Erro no job de notificações:', e);
  }
}


async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  
  // VAPID Public Key
  app.get("/api/vapidPublicKey", (req, res) => {
    res.send(vapidKeys.publicKey);
  });
  
  // Subscribe to Push
  app.post("/api/subscribe", (req, res) => {
    const { subscription, email } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
    if (!subscription?.endpoint || !normalizedEmail || !normalizedEmail.includes('@')) {
      return res.status(400).json({ error: 'Missing subscription or email' });
    }
    const subscriptions = readSubscriptions();
    // Remove old exact match if exists, then push
    const filtered = subscriptions.filter((s) => s.subscription.endpoint !== subscription.endpoint);
    filtered.push({ subscription, email: normalizedEmail });
    writeSubscriptions(filtered);
    res.status(201).json({});
  });
  
  // Trigger test notification
  app.post("/api/test-notification", async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    const subscriptions = readSubscriptions();
    const userSubs = subscriptions.filter((sub) => sub.email === email);
    let sent = 0;
    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(sub.subscription, JSON.stringify({
          title: 'Notificação de Teste',
          body: 'As notificações estão configuradas corretamente!',
          url: '/'
        }));
        sent++;
      } catch (e) {
        console.error(e);
      }
    }
    res.json({ sent });
  });

  // Trigger real check immediately
  app.post("/api/trigger-check", async (req, res) => {
    await checkAndSendNotifications();
    res.json({ success: true });
  });

  // AI Chat Route
  app.post("/api/chat", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Configure a chave da API do Gemini nas configurações (Settings) do AI Studio." });
      }
      const ai = new GoogleGenAI({ apiKey });
      const { prompt, context } = req.body;
      if (typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: "O campo 'prompt' é obrigatório." });
      }
      if (prompt.length > 4000 || JSON.stringify(context ?? {}).length > 100_000) {
        return res.status(413).json({ error: 'A solicitação excede o limite permitido.' });
      }
      
      const model = 'gemini-2.5-flash';
      const systemInstruction = `Você é o Assistente Financeiro Inteligente integrado no aplicativo de finanças pessoais do usuário.
Você se comunica em Português do Brasil de maneira concisa, prestativa e objetiva.
O usuário quer sua ajuda com dicas, simulações ou análise de gastos. Você deve gerar cenários ("se você poupar X", "se você cortar gastos com Y") quando apropriado.
Use formatação Markdown para facilitar a leitura (listas, negrito).
Abaixo está o contexto em tempo real dos dados financeiros do usuário:
${context ? JSON.stringify(context, null, 2) : "Nenhum contexto fornecido."}`;
      
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Erro na API do Gemini:", error);
      res.status(500).json({ error: "Erro ao gerar resposta da IA." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
