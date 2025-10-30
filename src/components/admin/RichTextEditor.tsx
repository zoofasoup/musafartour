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
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
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

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (savedRangeRef.current && editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedRangeRef.current);
      }
    }
  };

  const wrapSelection = (tagName: string, attributes?: Record<string, string>) => {
    if (!editorRef.current) return;
    
    saveSelection();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (!selectedText.trim()) return;
    
    const wrapper = document.createElement(tagName);
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        wrapper.setAttribute(key, value);
      });
    }
    
    try {
      range.deleteContents();
      wrapper.textContent = selectedText;
      range.insertNode(wrapper);
      
      // Move cursor after the inserted element
      range.setStartAfter(wrapper);
      range.setEndAfter(wrapper);
      selection.removeAllRanges();
      selection.addRange(range);
      
      handleInput();
    } catch (error) {
      console.error("Wrap selection error:", error);
    }
  };

  const formatBlock = (tagName: string) => {
    if (!editorRef.current) return;
    
    saveSelection();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;
    
    // Get the block-level parent
    while (container && container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode!;
    }
    
    if (!container || container === editorRef.current) {
      // No text selected, just insert a new block
      const newBlock = document.createElement(tagName);
      newBlock.textContent = '\u200B'; // Zero-width space
      range.insertNode(newBlock);
      
      // Place cursor inside
      range.setStart(newBlock, 0);
      range.setEnd(newBlock, 0);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Wrap the current block
      const newBlock = document.createElement(tagName);
      newBlock.innerHTML = (container as HTMLElement).innerHTML;
      (container as HTMLElement).replaceWith(newBlock);
    }
    
    handleInput();
  };

  const insertList = (ordered: boolean) => {
    if (!editorRef.current) return;
    
    saveSelection();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    
    const listTag = ordered ? 'ol' : 'ul';
    const list = document.createElement(listTag);
    
    if (selectedText) {
      // Split by lines and create list items
      const lines = selectedText.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        const li = document.createElement('li');
        li.textContent = line.trim();
        list.appendChild(li);
      });
      
      range.deleteContents();
      range.insertNode(list);
    } else {
      // Create a single list item
      const li = document.createElement('li');
      li.textContent = '\u200B';
      list.appendChild(li);
      range.insertNode(list);
      
      // Place cursor inside the list item
      range.setStart(li, 0);
      range.setEnd(li, 0);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    handleInput();
  };

  const insertLink = () => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
      alert("Pilih teks terlebih dahulu untuk dijadikan link");
      return;
    }
    
    const url = prompt("Masukkan URL:");
    if (url && url.trim()) {
      let formattedUrl = url.trim();
      if (!formattedUrl.match(/^https?:\/\//)) {
        formattedUrl = 'https://' + formattedUrl;
      }
      
      wrapSelection('a', { href: formattedUrl, target: '_blank', rel: 'noopener noreferrer' });
    }
  };

  const toolbarButtons = [
    { icon: Bold, label: "Bold (Ctrl+B)", action: () => wrapSelection('strong') },
    { icon: Italic, label: "Italic (Ctrl+I)", action: () => wrapSelection('em') },
    { icon: Heading1, label: "Heading 2", action: () => formatBlock('h2') },
    { icon: Heading2, label: "Heading 3", action: () => formatBlock('h3') },
    { icon: List, label: "Bullet List", action: () => insertList(false) },
    { icon: ListOrdered, label: "Numbered List", action: () => insertList(true) },
    { icon: Quote, label: "Quote", action: () => formatBlock('blockquote') },
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
        onBlur={saveSelection}
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
        suppressContentEditableWarning
      />
      <p className="text-xs text-muted-foreground">
        Tip: Pilih teks dan gunakan toolbar untuk format. Tekan Enter dua kali untuk paragraf baru.
      </p>
    </div>
  );
};

export default RichTextEditor;
