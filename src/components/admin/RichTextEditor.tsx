import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Link as LinkIcon, Quote } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertLink = () => {
    const url = prompt("Masukkan URL:");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  const toolbarButtons = [
    { icon: Bold, label: "Bold (Ctrl+B)", action: () => executeCommand("bold") },
    { icon: Italic, label: "Italic (Ctrl+I)", action: () => executeCommand("italic") },
    { icon: Heading1, label: "Heading 1", action: () => executeCommand("formatBlock", "<h2>") },
    { icon: Heading2, label: "Heading 2", action: () => executeCommand("formatBlock", "<h3>") },
    { icon: List, label: "Bullet List", action: () => executeCommand("insertUnorderedList") },
    { icon: ListOrdered, label: "Numbered List", action: () => executeCommand("insertOrderedList") },
    { icon: Quote, label: "Quote", action: () => executeCommand("formatBlock", "<blockquote>") },
    { icon: LinkIcon, label: "Insert Link", action: insertLink },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 p-2 border rounded-t-md bg-muted/30">
        {toolbarButtons.map((button, index) => (
          <Button
            key={index}
            type="button"
            variant="ghost"
            size="sm"
            onClick={button.action}
            title={button.label}
            className="h-8 w-8 p-0"
          >
            <button.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[400px] w-full rounded-b-md border border-t-0 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          prose prose-sm max-w-none
          prose-headings:font-bold prose-headings:text-foreground
          prose-p:text-foreground prose-p:leading-relaxed
          prose-strong:text-foreground prose-strong:font-semibold
          prose-em:text-foreground
          prose-a:text-primary prose-a:underline
          prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic
          prose-ul:list-disc prose-ul:pl-6
          prose-ol:list-decimal prose-ol:pl-6
          prose-li:text-foreground"
        data-placeholder={placeholder}
      />
      <p className="text-xs text-muted-foreground">
        Tip: Pilih teks dan gunakan toolbar untuk format. Tekan Enter dua kali untuk paragraf baru.
      </p>
    </div>
  );
};

export default RichTextEditor;
