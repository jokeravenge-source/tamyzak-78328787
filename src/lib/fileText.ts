import mammoth from "mammoth";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

type ExtractOptions = {
  maxPages?: number;
  maxChars?: number;
};

const PDF_WORKER_SRC = "/pdf.worker.mjs";
const PDF_ASSET_BASE = "/pdfjs";

let pdfWorkerReady = false;

const isPdfFile = (file: File) =>
  file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";

const isDocxFile = (file: File) => file.name.toLowerCase().endsWith(".docx");

const isTextFile = (file: File) =>
  file.name.toLowerCase().endsWith(".txt") || file.type.startsWith("text/");

const configurePdfWorker = () => {
  if (pdfWorkerReady || typeof window === "undefined") return;
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
  pdfWorkerReady = true;
};

async function extractPdfText(file: File, options: ExtractOptions = {}) {
  configurePdfWorker();

  const maxPagesLimit = options.maxPages ?? 2000;
  const maxChars = options.maxChars ?? 1500000;
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    cMapUrl: `${PDF_ASSET_BASE}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${PDF_ASSET_BASE}/standard_fonts/`,
    wasmUrl: `${PDF_ASSET_BASE}/wasm/`,
    useSystemFonts: true,
    useWorkerFetch: false,
  });

  try {
    const pdf = await loadingTask.promise;
    const maxPages = Math.min(pdf.numPages, maxPagesLimit);
    const chunks: string[] = [];
    let totalLength = 0;

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" ");

      if (pageText) {
        chunks.push(pageText);
        totalLength += pageText.length;
      }

      page.cleanup();
      if (totalLength >= maxChars) break;
    }

    return chunks.join("\n\n").slice(0, maxChars);
  } finally {
    loadingTask.destroy();
  }
}

export async function extractTextFromFile(file: File, options: ExtractOptions = {}) {
  if (isTextFile(file)) return await file.text();

  if (isDocxFile(file)) {
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return value;
  }

  if (isPdfFile(file)) return await extractPdfText(file, options);

  throw new Error("unsupported");
}
