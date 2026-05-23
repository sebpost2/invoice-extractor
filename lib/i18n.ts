import "server-only";
import { cookies } from "next/headers";

export type Lang = "en" | "es";

export const LANG_COOKIE = "lang";

const enDict = {
    meta: {
      titleDefault: "Invoice Extractor — AI for Peruvian receipts",
      titleTemplate: "%s | Invoice Extractor",
      description:
        "Extract structured data from Peruvian receipts and invoices with a vision LLM. Real-time streaming with Llama 4 Scout on Groq.",
      ogTitle: "Invoice Extractor",
      ogDescription:
        "Upload a receipt, watch the AI extract vendor, tax ID, VAT and items live.",
      homeTitle: "Upload receipt",
      homeDescription:
        "Upload a receipt or invoice and the AI extracts the data in real time.",
      dashboardTitle: "Dashboard",
      dashboardDescription:
        "Summary of extracted receipts: KPIs, charts and CSV export.",
      receiptNotFound: "Receipt not found",
      receiptNoVendor: "Receipt without vendor",
    },
    nav: {
      dashboard: "Dashboard",
      back: "← Back",
      downloadCsv: "Download CSV",
    },
    home: {
      title: "Invoice Extractor",
      subtitle:
        "Upload a receipt or invoice and the AI extracts the data automatically.",
      recent: "Recent receipts",
      empty: "No extractions yet. Upload the first one above.",
      unknownVendor: "(unknown vendor)",
      uploaded: "Uploaded",
      demo: "Demo",
    },
    uploader: {
      uploading: "Uploading image...",
      extracting: "Extracting with AI live...",
      extract: "Extract data",
      fileHint: "JPG, PNG or WEBP. 4 MB max.",
      samplesPrompt: "Or try a sample receipt:",
      samples: {
        manuscrita: {
          label: "Handwritten",
          description: "Hand-filled (1200 PEN)",
        },
        servicio: {
          label: "Service",
          description: "SUNAT transport (22 PEN)",
        },
        factura: {
          label: "Invoice",
          description: "Itemized VAT (708 PEN)",
        },
      },
      liveExtraction: "Live extraction",
      fieldVendor: "Vendor",
      fieldRuc: "Tax ID",
      fieldType: "Type",
      fieldDocument: "Document",
      fieldDate: "Date",
      fieldTotal: "Total",
      itemsDetected: "Detected items",
      errUnknown: "Unknown error",
      errSampleLoad: "Error loading sample",
      errStreamRead: "Couldn't read the stream",
      errMissingHeader: "Missing x-receipt-id in response",
      errCantLoadSample: "Couldn't load",
    },
    dashboard: {
      title: "Dashboard",
      subtitle: "Summary of your receipts plus the demo ones.",
      totalThisMonth: "Total extracted (this month)",
      receiptsThisMonth: (n: number) => `${n} receipt(s) this month`,
      vsLastMonth: "vs last month",
      newSuffix: "New",
      totalAllTime: "All-time total",
      avgPerReceipt: "Average per receipt",
      totalReceiptsCount: (n: number) => `${n} receipts in total`,
      topVendor: "Top vendor",
      chartByVendor: "Spend by vendor",
      chartByMonth: "Spend by month",
      othersLabel: "Others",
      chartEmptyDates: "No legible dates yet",
      chartEmptyVendors: "No vendors yet",
    },
    receipt: {
      originalImage: "Original image",
      extractedData: "Extracted data",
      fieldVendor: "Vendor",
      fieldRuc: "Tax ID",
      fieldDocument: "Document",
      fieldDate: "Date",
      boxSubtotal: "Subtotal",
      boxIgv: "VAT",
      boxTotal: "Total",
      poweredBy: "with Llama 4 Scout (Groq)",
      itemsTitle: "Items",
      tableDescription: "Description",
      tableQuantity: "Qty.",
      tableUnitPrice: "U.P.",
      tableTotal: "Total",
      copy: "Copy",
      copied: "Copied",
      copyAria: "Copy to clipboard",
      rawSummary: "View raw LLM response",
      copyJson: "📋 Copy JSON",
      copiedJson: "✓ Copied",
    },
    toggle: { aria: "Switch language" },
};

export type Dict = typeof enDict;

const esDict: Dict = {
    meta: {
      titleDefault: "Invoice Extractor — IA para boletas peruanas",
      titleTemplate: "%s | Invoice Extractor",
      description:
        "Extrae datos estructurados de boletas y facturas peruanas con un LLM con visión. Streaming en tiempo real con Llama 4 Scout sobre Groq.",
      ogTitle: "Invoice Extractor",
      ogDescription:
        "Sube una boleta, mira a la IA extraer proveedor, RUC, IGV e ítems en vivo.",
      homeTitle: "Subir boleta",
      homeDescription:
        "Sube una boleta o factura y la IA extrae los datos en tiempo real.",
      dashboardTitle: "Dashboard",
      dashboardDescription:
        "Resumen de boletas extraídas: KPIs, gráficos y export CSV.",
      receiptNotFound: "Boleta no encontrada",
      receiptNoVendor: "Boleta sin proveedor",
    },
    nav: {
      dashboard: "Dashboard",
      back: "← Volver",
      downloadCsv: "Descargar CSV",
    },
    home: {
      title: "Invoice Extractor",
      subtitle:
        "Sube una boleta o factura y la IA extrae los datos automáticamente.",
      recent: "Boletas recientes",
      empty: "Aún no hay extracciones. Sube la primera arriba.",
      unknownVendor: "(proveedor desconocido)",
      uploaded: "Subido",
      demo: "Demo",
    },
    uploader: {
      uploading: "Subiendo imagen...",
      extracting: "Extrayendo con IA en vivo...",
      extract: "Extraer datos",
      fileHint: "JPG, PNG o WEBP. Máximo 4 MB.",
      samplesPrompt: "O prueba con una boleta de muestra:",
      samples: {
        manuscrita: {
          label: "Manuscrita",
          description: "Llenada a mano (1200 PEN)",
        },
        servicio: {
          label: "Servicio",
          description: "Transporte SUNAT (22 PEN)",
        },
        factura: {
          label: "Factura",
          description: "Con IGV detallado (708 PEN)",
        },
      },
      liveExtraction: "Extracción en vivo",
      fieldVendor: "Proveedor",
      fieldRuc: "RUC",
      fieldType: "Tipo",
      fieldDocument: "Documento",
      fieldDate: "Fecha",
      fieldTotal: "Total",
      itemsDetected: "Ítems detectados",
      errUnknown: "Error desconocido",
      errSampleLoad: "Error cargando muestra",
      errStreamRead: "No se pudo leer el stream",
      errMissingHeader: "Falta x-receipt-id en la respuesta",
      errCantLoadSample: "No se pudo cargar",
    },
    dashboard: {
      title: "Dashboard",
      subtitle: "Resumen de tus boletas y las de demostración.",
      totalThisMonth: "Total extraído (este mes)",
      receiptsThisMonth: (n: number) => `${n} boleta(s) este mes`,
      vsLastMonth: "vs mes anterior",
      newSuffix: "Nuevo",
      totalAllTime: "Total histórico",
      avgPerReceipt: "Promedio por boleta",
      totalReceiptsCount: (n: number) => `${n} boletas en total`,
      topVendor: "Top proveedor",
      chartByVendor: "Gasto por proveedor",
      chartByMonth: "Gasto por mes",
      othersLabel: "Otros",
      chartEmptyDates: "Sin fechas legibles aún",
      chartEmptyVendors: "Sin proveedores aún",
    },
    receipt: {
      originalImage: "Imagen original",
      extractedData: "Datos extraídos",
      fieldVendor: "Proveedor",
      fieldRuc: "RUC",
      fieldDocument: "Documento",
      fieldDate: "Fecha",
      boxSubtotal: "Subtotal",
      boxIgv: "IGV",
      boxTotal: "Total",
      poweredBy: "con Llama 4 Scout (Groq)",
      itemsTitle: "Ítems",
      tableDescription: "Descripción",
      tableQuantity: "Cant.",
      tableUnitPrice: "P.U.",
      tableTotal: "Total",
      copy: "Copiar",
      copied: "Copiado",
      copyAria: "Copiar al portapapeles",
      rawSummary: "Ver respuesta cruda del LLM",
      copyJson: "📋 Copiar JSON",
      copiedJson: "✓ Copiado",
    },
    toggle: { aria: "Cambiar idioma" },
};

export const dicts: Record<Lang, Dict> = { en: enDict, es: esDict };

export async function getLang(): Promise<Lang> {
  const c = await cookies();
  const v = c.get(LANG_COOKIE)?.value;
  return v === "es" || v === "en" ? v : "en";
}

export async function getDict(): Promise<Dict> {
  const lang = await getLang();
  return dicts[lang];
}
