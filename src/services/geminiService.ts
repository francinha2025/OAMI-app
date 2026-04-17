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
- SOCIAL_EVOLUTION: Evolução da assistência social/vínculo.
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
