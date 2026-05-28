import { GoogleGenAI, Type } from "@google/genai";
import { format } from "date-fns";

export interface AISmartCommandResult {
  isCommand: boolean;
  recordType?: 
    'PEDAGOGY_ACTIVITY' | 'PEDAGOGY_EVOLUTION' | 'PSYCH_ACTIVITY' | 'PSYCH_EVOLUTION' | 
    'PSYCH_APPOINTMENT' | 'NURSING_EVOLUTION' | 'PHYSIO_EVOLUTION' | 'WORKSHOP' | 
    'CALENDAR_EVENT' | 'EVOLUTION_RECORD' | 'INCIDENT_RECORD' | 'SOCIAL_EVOLUTION' |
    'MEDICAL_APPOINTMENT' | 'PHYSICAL_EXAM' | 'ADMIN_NOTICE' | 'FAMILY_MEETING' | 'NUTRITION_EVOLUTION';
  data?: any;
  patientNameHint?: string;
  patientId?: string;
  confidence: number;
  reasoning: string;
  chatResponse?: string;
}

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
- Seja proativo na detecção de comandos.
`;

export async function processSmartIA(text: string, userProfile?: string): Promise<AISmartCommandResult | null> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Erro: GEMINI_API_KEY não configurada.");
      return null;
    }
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: `Profissional: ${userProfile}\n\nMensagem: ${text}` }] }],
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

    if (!response.text) return null;
    return JSON.parse(response.text) as AISmartCommandResult;
  } catch (error) {
    console.error("Error in Smart IA:", error);
    return null;
  }
}

export async function extractFormData(text: string, formSchema: string): Promise<any> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Analise o seguinte texto extraído de um documento via OCR e tente preencher os campos do formulário baseando-se no esquema fornecido abaixo.
    Retorne APENAS um objeto JSON plano onde as chaves são os nomes dos campos do formulário.
    Se um campo não for encontrado, omita-o do JSON.
    Normalize datas para YYYY-MM-DD se possível.

    ESQUEMA DO FORMULÁRIO:
    ${formSchema}

    TEXTO OCR:
    ${text}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    if (!response.text) return {};
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error extracting form data:", error);
    return {};
  }
}

export async function fixGrammar(text: string): Promise<string> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return text;

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Você é um editor especializado em prontuários de saúde. Sua tarefa é corrigir e melhorar o texto fornecido, mantendo o sentido original, mas tornando-o mais profissional, gramaticalmente correto e claro.
    Use terminologia técnica apropriada para enfermagem/saúde se fizer sentido, mas não mude os fatos relatados.
    Retorne APENAS o texto corrigido, sem comentários adicionais.

    TEXTO ORIGINAL:
    ${text}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
    });

    return response.text || text;
  } catch (error) {
    console.error("Error fixing grammar:", error);
    return text;
  }
}

export interface AnalyzedInvoiceResult {
  description: string;
  amount: number;
  type: 'RECEITA' | 'DESPESA';
  category: string;
  date: string;
}

export async function analyzeInvoice(base64Image: string, mimeType: string): Promise<AnalyzedInvoiceResult | null> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Erro: GEMINI_API_KEY não configurada.");
      return null;
    }
    const ai = new GoogleGenAI({ apiKey });

    // Clean up base64 prefix if it exists to pass pure base64 data to inlineData.
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
    4. category (Classifique em uma categoria de despesa lógica curta em maiúsculas de até 2 palavras, ex: "ALIMENTAÇÃO", "MATERIAL DE LIMPEZA", "MANUTENÇÃO", "CONSULTAS", "UTILIDADES", "EVENTOS", "OUTROS").
    5. date (A data de emissão expressa na nota no formato YYYY-MM-DD. Se não for especificado ou não encontrar, use a data atual ${format(new Date(), 'yyyy-MM-dd')}).

    Retorne APENAS um objeto JSON válido correspondente ao esquema solicitado.`;

    const response = await ai.models.generateContent({
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

    if (!response.text) return null;
    return JSON.parse(response.text) as AnalyzedInvoiceResult;
  } catch (error) {
    console.error("Error analyzing invoice with Gemini:", error);
    return null;
  }
}

