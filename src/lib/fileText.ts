import mammoth from "mammoth";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

type ExtractOptions = {
  maxPages?: number;
  maxChars?: number;
};

type StudyMaterial = {
  text: string;
  pageImages?: string[];
};

const PDF_WORKER_SRC = "/pdf.worker.mjs";
const PDF_ASSET_BASE = "/pdfjs";
const DEFAULT_MAX_CHARS = 180000;
const DEFAULT_MAX_PDF_PAGES = 450;
const PDF_FRONT_PAGES = 25;
const PDF_END_PAGES = 10;
const PDF_IMAGE_PAGES = 12;

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

const waitForBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const normalizePageText = (text: string) => text.replace(/\s+/g, " ").trim();

const buildPagePlan = (totalPages: number, maxPages: number) => {
  if (totalPages <= maxPages) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages = new Set<number>();
  const startCount = Math.min(PDF_FRONT_PAGES, totalPages, maxPages);
  for (let page = 1; page <= startCount; page++) pages.add(page);

  const endCount = Math.min(PDF_END_PAGES, totalPages - pages.size, maxPages - pages.size);
  for (let page = totalPages - endCount + 1; page <= totalPages; page++) pages.add(page);

  const remainingSlots = maxPages - pages.size;
  const middleStart = startCount + 1;
  const middleEnd = totalPages - endCount;
  const middlePages = Math.max(0, middleEnd - middleStart + 1);

  for (let i = 0; i < remainingSlots && middlePages > 0; i++) {
    const offset = Math.floor((i * (middlePages - 1)) / Math.max(1, remainingSlots - 1));
    pages.add(middleStart + offset);
  }

  return Array.from(pages).sort((a, b) => a - b).slice(0, maxPages);
};

const buildImagePagePlan = (totalPages: number) => buildPagePlan(totalPages, Math.min(totalPages, PDF_IMAGE_PAGES));

async function renderPdfPageImage(pdf: Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]>, pageNumber: number) {
  if (typeof document === "undefined") return null;

  const page = await pdf.getPage(pageNumber);
  try {
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(1.25, 950 / Math.max(baseViewport.width, 1));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return null;

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;
    const image = canvas.toDataURL("image/jpeg", 0.62);
    canvas.width = 0;
    canvas.height = 0;
    return image;
  } finally {
    page.cleanup();
  }
}

async function extractPdfMaterial(file: File, options: ExtractOptions = {}): Promise<StudyMaterial> {
  configurePdfWorker();

  const maxPagesLimit = options.maxPages ?? DEFAULT_MAX_PDF_PAGES;
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const objectUrl = typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(file) : null;
  const pdfSource = {
    ...(objectUrl ? { url: objectUrl } : { data: new Uint8Array(await file.arrayBuffer()) }),
    cMapUrl: `${PDF_ASSET_BASE}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${PDF_ASSET_BASE}/standard_fonts/`,
    wasmUrl: `${PDF_ASSET_BASE}/wasm/`,
    useSystemFonts: true,
    useWorkerFetch: false,
    disableFontFace: true,
  };
  const loadingTask = pdfjs.getDocument(pdfSource);

  try {
    const pdf = await loadingTask.promise;
    const pagePlan = buildPagePlan(pdf.numPages, Math.min(pdf.numPages, maxPagesLimit));
    const imagePages = buildImagePagePlan(pdf.numPages);
    const chunks: string[] = [];
    const pageImages: string[] = [];
    let totalLength = 0;

    for (let index = 0; index < pagePlan.length; index++) {
      const pageNumber = pagePlan[index];
      try {
        const page = await pdf.getPage(pageNumber);
        try {
          const content = await page.getTextContent({ includeMarkedContent: false });
          const pageText = normalizePageText(
            content.items
              .map((item) => ("str" in item ? item.str : ""))
              .filter(Boolean)
              .join(" "),
          );

          if (pageText) {
            const labelledText = `[Page ${pageNumber}]\n${pageText}`;
            const remaining = maxChars - totalLength;
            chunks.push(labelledText.slice(0, remaining));
            totalLength += Math.min(labelledText.length, remaining);
          }
        } finally {
          page.cleanup();
        }
      } catch (error) {
        console.warn(`Skipped unreadable PDF page ${pageNumber}`, error);
      }

      if (totalLength >= maxChars) break;
      if (index % 5 === 4) {
        pdf.cleanup();
        await waitForBrowser();
      }
    }

    for (let index = 0; index < imagePages.length; index++) {
      try {
        const image = await renderPdfPageImage(pdf, imagePages[index]);
        if (image) pageImages.push(image);
      } catch (error) {
        console.warn(`Skipped PDF page image ${imagePages[index]}`, error);
      }
      if (index % 3 === 2) await waitForBrowser();
    }

    return { text: chunks.join("\n\n").slice(0, maxChars), pageImages };
  } finally {
    await loadingTask.destroy();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export async function extractTextFromFile(file: File, options: ExtractOptions = {}) {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;

  if (isTextFile(file)) return (await file.slice(0, maxChars * 4).text()).slice(0, maxChars);

  if (isDocxFile(file)) {
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return value.slice(0, maxChars);
  }

  if (isPdfFile(file)) return await extractPdfText(file, options);

  throw new Error("unsupported");
}
