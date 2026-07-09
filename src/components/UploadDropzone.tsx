import { FileSpreadsheet, FileText, ImageIcon, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { acceptedInputTypes } from "../files/fileTypes";

interface UploadDropzoneProps {
  files: File[];
  onFilesChange(files: File[]): void;
}

export function UploadDropzone({ files, onFilesChange }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function addFiles(nextFiles: FileList | File[]) {
    const merged = [...files, ...Array.from(nextFiles)];
    const unique = merged.filter(
      (file, index, all) => all.findIndex((candidate) => candidate.name === file.name && candidate.size === file.size) === index,
    );
    onFilesChange(unique);
  }

  return (
    <section
      className={`upload-zone ${dragging ? "is-dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        addFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        multiple
        accept={acceptedInputTypes}
        onChange={(event) => {
          if (event.currentTarget.files) addFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
      <button className="upload-action" type="button" onClick={() => inputRef.current?.click()}>
        <UploadCloud size={26} />
        <span>Drop files or choose documents</span>
      </button>
      <p>PDF, DOCX, XLSX, CSV, PNG, JPG, JPEG, WEBP, TXT, ASC, JDX, and DX are accepted.</p>

      {files.length > 0 && (
        <div className="file-list" aria-live="polite">
          {files.map((file) => (
            <div className="file-row" key={`${file.name}-${file.size}`}>
              {iconForFile(file.name)}
              <div>
                <strong>{file.name}</strong>
                <span>{formatBytes(file.size)}</span>
              </div>
              <button
                type="button"
                className="icon-button small"
                aria-label={`Remove ${file.name}`}
                onClick={() => onFilesChange(files.filter((candidate) => candidate !== file))}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function iconForFile(fileName: string) {
  if (/\.(xlsx|csv)$/i.test(fileName)) return <FileSpreadsheet size={19} />;
  if (/\.(png|jpg|jpeg|webp)$/i.test(fileName)) return <ImageIcon size={19} />;
  return <FileText size={19} />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
