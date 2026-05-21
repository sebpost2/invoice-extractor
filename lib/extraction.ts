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

export const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

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
- vendorRuc: RUC peruano de 11 dígitos sin guiones. Si no es legible, null.
- documentType: uno de "BOLETA", "FACTURA", "TICKET", "RECIBO", "NOTA_CREDITO", "OTRO".
- documentNumber: número tal como aparece (ej. "B001-12345" o "F001-00876").
- issueDate: fecha en formato ISO estricto "YYYY-MM-DD". El año va PRIMERO, mes SEGUNDO, día TERCERO. En las boletas peruanas la fecha aparece como DD/MM/YYYY o DD/MM/YY. Convierte correctamente: "28/10/2019" → "2019-10-28", "15/05/26" → "2026-05-15", "09/02/14" → "2014-02-09". Verifica que el mes sea entre 01 y 12 antes de responder.
- currency: código ISO 4217. "PEN" para soles, "USD" para dólares. Por defecto "PEN" si no es claro.
- subtotal, igv, total: montos numéricos sin símbolo. Punto como decimal (ej. 123.45).
- items: arreglo de líneas del documento. Si no son legibles, []
- Si un campo no es legible o no aplica, usa null (excepto currency e items).

Responde ÚNICAMENTE con el JSON, sin texto antes ni después, sin code fences.`

function stripCodeFences(text: string): string {
  return text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim()
}

export async function extractReceiptData(
  imageBase64: string,
  mimeType: string,
): Promise<ExtractedReceipt> {
  const response = await groq.chat.completions.create({
    model: VISION_MODEL,
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
    max_completion_tokens: 2048,
  })

  const raw = response.choices[0]?.message?.content
  if (!raw) throw new Error("Groq devolvió respuesta vacía")

  const cleaned = stripCodeFences(raw)
  const parsed = JSON.parse(cleaned) as ExtractedReceipt

  parsed.currency ||= "PEN"
  parsed.items ||= []

  return parsed
}
