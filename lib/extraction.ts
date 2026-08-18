import { groq } from "./groq"

export type ExtractedItem = {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export type ExtractedReceipt = {
  vendorName: string | null
  vendorRuc: string | null
  documentType: string | null
  documentNumber: string | null
  issueDate: string | null
  currency: string
  subtotal: number | null
  igv: number | null
  total: number | null
  items: ExtractedItem[]
}

export const VISION_MODEL = "qwen/qwen3.6-27b"

export function safeParseDate(input: string | null | undefined): Date | null {
  if (!input) return null
  const date = new Date(input)
  return isNaN(date.getTime()) ? null : date
}

export const SYSTEM_PROMPT = `Eres un experto en extraer datos de boletas y facturas peruanas. Analiza la imagen y devuelve EXCLUSIVAMENTE un objeto JSON con esta estructura:

{
  "vendorName": string | null,
  "vendorRuc": string | null,
  "documentType": string | null,
  "documentNumber": string | null,
  "issueDate": string | null,
  "currency": string,
  "subtotal": number | null,
  "igv": number | null,
  "total": number | null,
  "items": [{ "description": string, "quantity": number, "unitPrice": number, "total": number }]
}

Reglas:
- vendorName: razón social del emisor (ej. "FALABELLA PERU S.A.A.").
- vendorRuc: identificador tributario del emisor, tal como aparece en el documento. En Perú es el RUC (11 dígitos, ej. "20123456789"). En Chile es el RUT (formato XX.XXX.XXX-X con guion y dígito verificador, ej. "76.030.731-9") — no lo fuerces al formato peruano. Si no es legible, null.
- documentType: uno de "BOLETA", "FACTURA", "TICKET", "RECIBO", "NOTA_CREDITO", "OTRO".
- documentNumber: número tal como aparece (ej. "B001-12345" o "F001-00876").
- issueDate: fecha en formato ISO estricto "YYYY-MM-DD". El año va PRIMERO, mes SEGUNDO, día TERCERO. Las fechas aparecen como DD/MM/YYYY o DD/MM/YY. Convierte correctamente: "28/10/2019" → "2019-10-28", "15/05/26" → "2026-05-15", "09/02/14" → "2014-02-09". Verifica que el mes sea entre 01 y 12 antes de responder.
- currency: código ISO 4217. "PEN" para soles (símbolo "S/"), "CLP" para pesos chilenos (símbolo "$", montos sin decimales, típico de boletas con RUT e IVA 19%), "USD" para dólares. Usa el símbolo, el idioma y el formato del documento para decidir — no asumas "PEN" solo porque es el valor por defecto. Por defecto "PEN" únicamente si no hay ninguna señal clara del país o moneda.
- subtotal, igv, total: montos numéricos sin símbolo. Punto como decimal (ej. 123.45). En boletas chilenas el campo "igv" corresponde al IVA.
- items: arreglo de líneas del documento. Si no son legibles, []
- Si un campo no es legible o no aplica, usa null (excepto currency e items).

Responde ÚNICAMENTE con el JSON, sin texto antes ni después, sin code fences.`

// Reasoning models (e.g. qwen3.6) sometimes emit a <think>...</think>
// block, and/or markdown code fences, before the JSON payload. Instead of
// pattern-matching every possible preamble, take the outermost {...} span —
// robust to any wrapper text.
export function extractJson(text: string): string {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end === -1 || end < start) return text.trim()
  return text.slice(start, end + 1)
}

export async function extractReceiptData(
  imageBase64: string,
  mimeType: string,
): Promise<ExtractedReceipt> {
  const response = await groq.chat.completions.create({
    model: VISION_MODEL,
    reasoning_effort: "none",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Extrae los datos de esta boleta o factura." },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ],
      },
    ],
    temperature: 0.1,
    max_completion_tokens: 4096,
  })

  const raw = response.choices[0]?.message?.content
  if (!raw) throw new Error("Groq devolvió respuesta vacía")

  const cleaned = extractJson(raw)
  const parsed = JSON.parse(cleaned) as ExtractedReceipt

  parsed.currency ||= "PEN"
  parsed.items ||= []

  return parsed
}
