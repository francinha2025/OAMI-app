import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { format } from "date-fns";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure middleware with generous limits for scanning PDFs / photos
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Helper to get GoogleGenAI client safely
  function getAIClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set on the server.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // Helper to execute generateContent with automatic retry and model fallback
  async function generateContentWithRetry(ai: any, params: any, retries = 2, delay = 1000) {
    let lastError: any = null;
    const modelsToTry = [params.model, 'gemini-flash-latest'];
    
    for (const modelCandidate of modelsToTry) {
      if (!modelCandidate) continue;
      
      const currentParams = { ...params, model: modelCandidate };
      
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          return await ai.models.generateContent(currentParams);
        } catch (error: any) {
          lastError = error;
          console.warn(`[Gemini API] Attempt ${attempt} failed for model ${modelCandidate}:`, error.message || error);
          
          const errorMessage = (error.message || '').toLowerCase();
          // If it's a client 400 error (e.g. invalid parameter/unsupported response schema format),
          // don't bother retrying with same model, break to fallback or raise
          if (errorMessage.includes("400") || errorMessage.includes("invalid argument")) {
            break;
          }
          
          if (attempt < retries) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
          }
        }
      }
    }
    throw lastError;
  }

  // --- API ROUTES FIRST ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // OAMI Smart IA
  app.post("/api/gemini/process-smart-ia", async (req, res) => {
    try {
      const { text, userProfile } = req.body;
      if (!text) {
        res.status(400).json({ error: "O texto é obrigatório" });
        return;
      }

      const ai = getAIClient();
      const SYSTEM_PROMPT = `
Você é o assistente OAMI Smart IA de elite para uma Instituição de Longa Permanência para Idosos (ILPI).
Sua missão é converter comunicações de voz ou texto dos profissionais em registros estruturados.

COMPORTAMENTO:
1. MODO REGISTRO (isCommand: true): Use obrigatoriamente quando o texto contiver informações de:
   - Evolução (Enfermagem, Fisioterapia, Psicologia, Social, Pedagogia).
   - Atividades de Oficina ou Reuniões.
   - Prescrições ou Agendamentos.
   - Ocorrências ou Avaliações.
2. MODO DIÁLOGO (isCommand: false): Use para perguntas gerais, saudações ou quando não houver NENHUM dado clínico/administrativo para salvar.

TIPOS DE REGISTRO (recordType):
- NURSING_EVOLUTION: Evolução de enfermagem, sinais vitais.
- PHYSIO_EVOLUTION: Evolução de fisioterapia, exercícios.
- PSYCH_EVOLUTION: Evolução psicológica.
- PEDAGOGY_EVOLUTION: Evolução pedagógica/estímulo.
- SOCIAL_EVOLUTION: Evolução do serviço social/vínculo.
- PEDAGOGY_ACTIVITY: Relato de oficina ou atividade coletiva.
- WORKSHOP: Oficinas institucionais, projetos.
- CALENDAR_EVENT: Reuniões, datas, eventos, compromissos.
- MEDICAL_APPOINTMENT: Consultas médicas, exames, encaminhamentos.
- PHYSICAL_EXAM: Relato de exame físico, peso, pressão, glicemia.
- ADMIN_NOTICE: Avisos administrativos, escalas, recados.
- FAMILY_MEETING: Reuniões com familiares, contatos telefônicos.
- INCIDENT_RECORD: Quedas, ferimentos, brigas, fugas, intercorrências.
- NUTRITION_EVOLUTION: Dieta, aceitação alimentar, pesagem nutricional.
- EVOLUTION_RECORD: Evoluções multidisciplinares gerais.

ESTRUTURA DOS DADOS (campo 'data'):
- Extraia sempre a data (formato YYYY-MM-DD), observação/descrição, tipo de serviço, duração (se houver).
- Em 'patientNameHint', coloque apenas o PRIMEIRO NOME do idoso mencionado.

EXEMPLO DE SUCESSO:
"Fiz fisioterapia com a Dona Maria hoje, ela caminhou 10 metros sem apoio."
-> { "isCommand": true, "recordType": "PHYSIO_EVOLUTION", "patientNameHint": "Maria", "data": { "observation": "Caminhou 10 metros sem apoio", "serviceType": "MARCHA" }, "confidence": 0.95 }

REGRAS:
- Retorne APENAS JSON.
- DATA ATUAL: ${format(new Date(), 'yyyy-MM-dd')}.
Seja proativo na detecção de comandos.
`;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: [{ parts: [{ text: `Profissional: ${userProfile || "Desconhecido"}\n\nMensagem: ${text}` }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT.trim(),
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isCommand: { type: Type.BOOLEAN },
              recordType: { type: Type.STRING },
              patientNameHint: { type: Type.STRING },
              data: { type: Type.OBJECT },
              confidence: { type: Type.NUMBER },
              reasoning: { type: Type.STRING },
              chatResponse: { type: Type.STRING }
            },
            required: ["isCommand", "confidence", "reasoning"]
          }
        }
      });

      if (!response.text) {
        throw new Error("Resposta do Gemini vazia");
      }

      res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error("Error in server process-smart-ia:", error);
      res.status(500).json({ error: error.message || "Erro interno do servidor" });
    }
  });

  // Extract form data (OCR translation to fields)
  app.post("/api/gemini/extract-form-data", async (req, res) => {
    try {
      const { text, formSchema } = req.body;
      if (!text || !formSchema) {
        res.status(400).json({ error: "Texto e Esquema do Formulário são obrigatórios" });
        return;
      }

      const ai = getAIClient();
      const prompt = `Analise o seguinte texto extraído de um documento via OCR e tente preencher os campos do formulário baseando-se no esquema fornecido abaixo.
Retorne APENAS um objeto JSON plano onde as chaves são os nomes dos campos do formulário.
Se um campo não for encontrado, omita-o do JSON.
Normalize datas para YYYY-MM-DD se possível.

ESQUEMA DO FORMULÁRIO:
${formSchema}

TEXTO OCR:
${text}`;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
        }
      });

      res.json(response.text ? JSON.parse(response.text) : {});
    } catch (error: any) {
      console.error("Error in server extract-form-data:", error);
      res.status(500).json({ error: error.message || "Erro interno do servidor" });
    }
  });

  // Fix writing / grammar rules
  app.post("/api/gemini/fix-grammar", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        res.status(400).json({ error: "Texto é obrigatório" });
        return;
      }

      const ai = getAIClient();
      const prompt = `Você é um editor especializado em prontuários de saúde. Sua tarefa é corrigir e melhorar o texto fornecido, mantendo o sentido original, mas tornando-o mais profissional, gramaticalmente correto e claro.
Use terminologia técnica apropriada para enfermagem/saúde se fizer sentido, mas não mude os fatos relatados.
Retorne APENAS o texto corrigido, sem comentários adicionais.

TEXTO ORIGINAL:
${text}`;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: [{ parts: [{ text: prompt }] }],
      });

      res.json({ text: response.text || text });
    } catch (error: any) {
      console.error("Error in server fix-grammar:", error);
      res.status(500).json({ error: error.message || "Erro interno do servidor" });
    }
  });

  // Invoice / Document scanner (Obrigatório / Avançado)
  app.post("/api/gemini/analyze-invoice", async (req, res) => {
    try {
      const { base64Image, mimeType } = req.body;
      if (!base64Image) {
        res.status(400).json({ error: "base64Image é obrigatório" });
        return;
      }

      const ai = getAIClient();
      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: cleanBase64,
        },
      };

      const prompt = `Analise a imagem desta nota fiscal ou recibo de pagamento e extraia os dados abaixo para contabilidade.
A data atual do sistema é ${format(new Date(), 'yyyy-MM-dd')}. Se a nota não tiver o ano, assuma que é o ano atual.
Preencha os seguintes campos com a maior precisão possível:
1. description (Ex: "Supermercado - Alimentos", "Material de limpeza", "Serviço de Pintura", etc. Seja descritivo baseado no nome da empresa ou itens comprados).
2. amount (O valor total cobrado/pago na nota, como um número decimal. Certifique-se de obter o valor final correto).
3. type (Sempre retorne "DESPESA" para notas fiscais de compra/pagamento, a menos que seja um comprovante de entrada/receita).
4. category (Classifique em uma categoria de despesa lógica em maiúsculas correspondente a uma destas opções exatas: "OFICINAS", "CAPACITACAO", "ESCRITORIO", "CAMPANHA", "VIAGENS", "PROFISSIONAIS", "ROTINA", "GASOLINA", "OUTROS").
5. date (A data de emissão expressa na nota no formato YYYY-MM-DD. Se não for especificado ou não encontrar, use a data atual ${format(new Date(), 'yyyy-MM-dd')}).

Retorne APENAS um objeto JSON válido correspondente ao esquema solicitado.`;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: [imagePart, { text: prompt }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ["RECEITA", "DESPESA"] },
              category: { type: Type.STRING },
              date: { type: Type.STRING }
            },
            required: ["description", "amount", "type", "category", "date"]
          }
        }
      });

      if (!response.text) {
        throw new Error("Nenhum dado retornado do Gemini");
      }

      res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error("Error in server analyze-invoice:", error);
      res.status(500).json({ error: error.message || "Erro ao analisar nota fiscal no servidor" });
    }
  });

  // Transcription for TranscriptionButton
  app.post("/api/gemini/transcribe-image", async (req, res) => {
    try {
      const { base64Data, mimeType } = req.body;
      if (!base64Data) {
        res.status(400).json({ error: "base64Data é obrigatório" });
        return;
      }

      const ai = getAIClient();
      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: [
          {
            parts: [
              { text: "Transcreva o texto manuscrito ou impresso desta imagem de um documento institucional (como um relatório de evolução, visita ou plano de atendimento). Retorne apenas o texto transcrito, sem comentários adicionais. Se houver campos específicos, tente manter a estrutura se possível, mas foque no conteúdo textual principal." },
              { inlineData: { data: base64Data, mimeType: mimeType || "image/jpeg" } }
            ]
          }
        ]
      });

      res.json({ text: response.text || "" });
    } catch (error: any) {
      console.error("Error in server transcribe-image:", error);
      res.status(500).json({ error: error.message || "Erro na transcrição de imagem" });
    }
  });

  // Process Media for App.tsx
  app.post("/api/gemini/process-media", async (req, res) => {
    try {
      const { base64Data, mimeType } = req.body;
      if (!base64Data) {
        res.status(400).json({ error: "base64Data é obrigatório" });
        return;
      }

      const ai = getAIClient();
      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: [
          {
            parts: [
              { text: "Analise esta imagem que pode ser um documento institucional, relatório ou foto de atividade em uma ILPI. Transcreva qualquer texto relevante e descreva o que está acontecendo se for uma foto de atividade. Retorne um texto que possa ser usado para criar um registro evolutivo ou de atividade logo em seguida." },
              { inlineData: { data: base64Data, mimeType: mimeType || "image/jpeg" } }
            ]
          }
        ]
      });

      res.json({ text: response.text || "" });
    } catch (error: any) {
      console.error("Error in server process-media:", error);
      res.status(500).json({ error: error.message || "Erro no processamento de mídia" });
    }
  });


  // --- VITE DEV OR PRODUCTION STATICS CONFIG ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
