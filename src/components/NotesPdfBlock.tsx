import { useRef, useState } from "react";
import { Upload, Trash2, FileType2, ExternalLink, Maximize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PdfBlock = {
  id: string;
  pdfUrl?: string;
  pdfName?: string;
  pdfHeight?: number;
};

const NotesPdfBlock = ({
  block, language, onChange, onRemove,
}: {
  block: PdfBlock;
  language: "en" | "ar";
  onChange: (patch: { pdfUrl?: string; pdfName?: string; pdfHeight?: number }) => void;
  onRemove: () => void;
}) => {
  const isRTL = language === "ar";
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const height = block.pdfHeight ?? 520;

  const onPick = async (file: File) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error(isRTL ? "الملف ليس PDF" : "Not a PDF file");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error(isRTL ? "الحد الأقصى 25MB" : "Max 25MB");
      return;
    }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const path = `notes/${u.user.id}/${block.id}-${Date.now()}.pdf`;
      const { error } = await supabase.storage.from("files").upload(path, file, {
        contentType: "application/pdf", upsert: true,
      });
      if (error) throw error;
      const { data: signed, error: sErr } = await supabase.storage.from("files")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr) throw sErr;
      onChange({ pdfUrl: signed.signedUrl, pdfName: file.name, pdfHeight: height });
      toast.success(isRTL ? "تم الرفع" : "Uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="my-3 rounded-xl border border-border bg-card overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center gap-2 p-2 border-b border-border bg-secondary/40">
        <FileType2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs truncate flex-1">
          {block.pdfName || (isRTL ? "لم يتم اختيار ملف" : "No PDF selected")}
        </span>
        {block.pdfUrl && (
          <a
            href={block.pdfUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 h-7 px-2 text-xs rounded-md hover:bg-secondary text-muted-foreground"
            title={isRTL ? "فتح في تبويب" : "Open"}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1 h-7 px-2 text-xs rounded-md hover:bg-secondary text-muted-foreground"
          disabled={uploading}
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading
            ? (isRTL ? "جارٍ الرفع…" : "Uploading…")
            : (block.pdfUrl ? (isRTL ? "استبدال" : "Replace") : (isRTL ? "رفع PDF" : "Upload PDF"))}
        </button>
        <button
          onClick={onRemove}
          className="inline-flex items-center gap-1 h-7 px-2 text-xs rounded-md hover:bg-destructive/10 text-destructive"
          title={isRTL ? "حذف" : "Remove"}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <input
          ref={fileRef} type="file" accept="application/pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.currentTarget.value = ""; }}
        />
      </div>
      {block.pdfUrl ? (
        <div className="relative bg-secondary/20">
          <iframe
            src={block.pdfUrl}
            className="w-full block"
            style={{ height }}
            title={block.pdfName || "PDF"}
          />
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              (e.target as Element).setPointerCapture?.(e.pointerId);
              const startY = e.clientY;
              const startH = height;
              const move = (ev: PointerEvent) => onChange({ pdfHeight: Math.max(220, Math.min(1400, startH + (ev.clientY - startY))) });
              const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", up);
            }}
            className="absolute bottom-1 right-1 w-6 h-6 rounded bg-secondary/70 hover:bg-secondary flex items-center justify-center text-muted-foreground"
            title={isRTL ? "تغيير الارتفاع" : "Resize"}
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-secondary/30 transition-colors"
          disabled={uploading}
        >
          <FileType2 className="w-8 h-8" />
          <span className="text-sm">{isRTL ? "اضغط لاختيار ملف PDF" : "Click to pick a PDF"}</span>
          <span className="text-[11px]">{isRTL ? "حد أقصى 25 ميجابايت" : "Max 25MB"}</span>
        </button>
      )}
    </div>
  );
};

export default NotesPdfBlock;