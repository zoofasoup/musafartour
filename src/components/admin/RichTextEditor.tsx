import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Link as LinkIcon, Quote } from "lucide-react";
import DOMPurify from "dompurify";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      // Sanitize content when setting innerHTML
      const sanitized = DOMPurify.sanitize(value, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a'],
        ALLOWED_ATTR: ['href', 'target', 'rel']
      });
      editorRef.current.innerHTML = sanitized;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Save selection when user interacts with editor
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      setSavedSelection(selection.getRangeAt(0));
    }
  };

  // Restore selection before executing commands
  const restoreSelection = () => {
    if (savedSelection && editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelection);
      }
    }
  };

  const executeCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    
    restoreSelection();
    
    try {
      const success = document.execCommand(command, false, value);
      if (!success) {
        console.warn(`Command ${command} failed`);
      }
    } catch (error) {
      console.error("Command execution error:", error);
    }
    
    handleInput();
    saveSelection();
  };

  const insertHeading = (level: number) => {
    if (!editorRef.current) return;
    
    restoreSelection();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // If no selection, create one at cursor position
      editorRef.current.focus();
      return;
    }
    
    try {
      // Try different formats for better browser compatibility
      let success = document.execCommand('formatBlock', false, `h${level}`);
      if (!success) {
        success = document.execCommand('formatBlock', false, `<h${level}>`);
      }
      if (!success) {
        // Fallback: wrap selection in heading tag manually
        const range = selection.getRangeAt(0);
        const heading = document.createElement(`h${level}`);
        try {
          range.surroundContents(heading);
        } catch (e) {
          // If surroundContents fails, try extracting and appending
          heading.appendChild(range.extractContents());
          range.insertNode(heading);
        }
      }
    } catch (error) {
      console.error("Heading insertion error:", error);
    }
    
    handleInput();
    saveSelection();
  };

  const insertList = (ordered: boolean) => {
    if (!editorRef.current) return;
    
    restoreSelection();
    
    const command = ordered ? 'insertOrderedList' : 'insertUnorderedList';
    
    try {
      document.execCommand(command, false);
    } catch (error) {
      console.error("List insertion error:", error);
    }
    
    handleInput();
    saveSelection();
  };

  const insertQuote = () => {
    if (!editorRef.current) return;
    
    restoreSelection();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    try {
      // Try formatBlock with blockquote
      let success = document.execCommand('formatBlock', false, 'blockquote');
      if (!success) {
        success = document.execCommand('formatBlock', false, '<blockquote>');
      }
      if (!success) {
        // Manual fallback
        const range = selection.getRangeAt(0);
        const blockquote = document.createElement('blockquote');
        try {
          range.surroundContents(blockquote);
        } catch (e) {
          blockquote.appendChild(range.extractContents());
          range.insertNode(blockquote);
        }
      }
    } catch (error) {
      console.error("Quote insertion error:", error);
    }
    
    handleInput();
    saveSelection();
  };

  const insertLink = () => {
    if (!editorRef.current) return;
    
    restoreSelection();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
      alert("Pilih teks terlebih dahulu untuk dijadikan link");
      return;
    }
    
    const url = prompt("Masukkan URL:");
    if (url && url.trim()) {
      try {
        // Validate and format URL
        let formattedUrl = url.trim();
        if (!formattedUrl.match(/^https?:\/\//)) {
          formattedUrl = 'https://' + formattedUrl;
        }
        
        document.execCommand("createLink", false, formattedUrl);
      } catch (error) {
        console.error("Link insertion error:", error);
      }
    }
    
    handleInput();
    saveSelection();
  };

  const toolbarButtons = [
    { icon: Bold, label: "Bold (Ctrl+B)", action: () => executeCommand("bold") },
    { icon: Italic, label: "Italic (Ctrl+I)", action: () => executeCommand("italic") },
    { icon: Heading1, label: "Heading 1", action: () => insertHeading(2) },
    { icon: Heading2, label: "Heading 2", action: () => insertHeading(3) },
    { icon: List, label: "Bullet List", action: () => insertList(false) },
    { icon: ListOrdered, label: "Numbered List", action: () => insertList(true) },
    { icon: Quote, label: "Quote", action: insertQuote },
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
            onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
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
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
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
