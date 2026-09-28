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

export async function processSmartIA(text: string, userProfile?: string): Promise<AISmartCommandResult | null> {
  try {
    const response = await fetch("/api/gemini/process-smart-ia", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, userProfile }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error in Smart IA client:", error);
    return null;
  }
}

export async function extractFormData(text: string, formSchema: string): Promise<any> {
  try {
    const response = await fetch("/api/gemini/extract-form-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, formSchema }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error extracting form data client:", error);
    return {};
  }
}

export async function fixGrammar(text: string): Promise<string> {
  try {
    const response = await fetch("/api/gemini/fix-grammar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.text || text;
  } catch (error) {
    console.error("Error fixing grammar client:", error);
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
    const response = await fetch("/api/gemini/analyze-invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Image, mimeType }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error analyzing invoice client:", error);
    return null;
  }
}

export async function refineCaregiverSpeech(rawText: string): Promise<string> {
  try {
    const response = await fetch("/api/gemini/refine-caregiver-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: rawText }),
    });
    if (!response.ok) return rawText;
    const data = await response.json();
    return data.text || rawText;
  } catch (err) {
    console.warn("Could not refine speech via AI, keeping original:", err);
    return rawText;
  }
}

export async function transcribeCaregiverNote(base64Image: string, mimeType = "image/jpeg"): Promise<string> {
  try {
    const response = await fetch("/api/gemini/transcribe-caregiver-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Image, mimeType }),
    });
    if (!response.ok) {
      throw new Error("Erro na transcrição da foto");
    }
    const data = await response.json();
    return data.text || "";
  } catch (err) {
    console.error("Error transcribing caregiver note:", err);
    throw err;
  }
}
