import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Link, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useState<HTMLTextAreaElement | null>(null);

  const insertFormatting = (before: string, after: string = "", placeholder: string = "") => {
    const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    const newText = 
      value.substring(0, start) + 
      before + textToInsert + after + 
      value.substring(end);
    
    onChange(newText);

    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const toolbarButtons = [
    { icon: Bold, label: "Bold", action: () => insertFormatting("<strong>", "</strong>", "teks tebal") },
    { icon: Italic, label: "Italic", action: () => insertFormatting("<em>", "</em>", "teks miring") },
    { icon: Heading1, label: "Heading 1", action: () => insertFormatting("<h1>", "</h1>", "Judul Besar") },
    { icon: Heading2, label: "Heading 2", action: () => insertFormatting("<h2>", "</h2>", "Judul Sedang") },
    { icon: List, label: "Bullet List", action: () => insertFormatting("<ul>\n  <li>", "</li>\n</ul>", "Item") },
    { icon: ListOrdered, label: "Numbered List", action: () => insertFormatting("<ol>\n  <li>", "</li>\n</ol>", "Item") },
    { icon: Quote, label: "Quote", action: () => insertFormatting("<blockquote>", "</blockquote>", "Kutipan") },
    { icon: Link, label: "Link", action: () => insertFormatting('<a href="url">', "</a>", "teks link") },
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
      <Textarea
        name="content"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={15}
        className="font-mono text-sm rounded-t-none"
      />
      <p className="text-xs text-muted-foreground">
        Tip: Pilih teks dan gunakan toolbar untuk format, atau gunakan HTML langsung
      </p>
    </div>
  );
};

export default RichTextEditor;
