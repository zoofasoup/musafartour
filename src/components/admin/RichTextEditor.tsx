import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from 'react';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1,
  Heading2, 
  Heading3,
  Link as LinkIcon,
  Quote,
  Undo,
  Redo
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor = ({ value, onChange, placeholder = "Tulis isi artikel di sini..." }: RichTextEditorProps) => {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  // Sync content when value prop changes (e.g., when loading existing article)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    // Start from the link under the cursor so it can be edited.
    setLinkUrl((editor.getAttributes('link').href as string | undefined) ?? "");
    setLinkOpen(true);
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (url) {
      const formattedUrl = /^https?:\/\//.test(url) ? url : 'https://' + url;
      editor.chain().focus().setLink({ href: formattedUrl }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkOpen(false);
  };

  const toolbarButtons = [
    {
      icon: Bold,
      label: "Tebal",
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      icon: Italic,
      label: "Miring",
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    { separator: true },
    {
      icon: Heading1,
      label: "Judul 1",
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive('heading', { level: 1 }),
    },
    {
      icon: Heading2,
      label: "Judul 2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      icon: Heading3,
      label: "Judul 3",
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive('heading', { level: 3 }),
    },
    { separator: true },
    {
      icon: List,
      label: "Daftar poin",
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      icon: ListOrdered,
      label: "Daftar nomor",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
    },
    { separator: true },
    {
      icon: Quote,
      label: "Kutipan",
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive('blockquote'),
    },
    {
      icon: LinkIcon,
      label: "Sisipkan link",
      action: addLink,
      isActive: editor.isActive('link'),
    },
    { separator: true },
    {
      icon: Undo,
      label: "Urungkan",
      action: () => editor.chain().focus().undo().run(),
      isActive: false,
    },
    {
      icon: Redo,
      label: "Ulangi",
      action: () => editor.chain().focus().redo().run(),
      isActive: false,
    },
  ];

  return (
    <div className="space-y-2 relative">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 p-2 border rounded-t-lg bg-muted/95 backdrop-blur-sm shadow-sm">
        {toolbarButtons.map((button, index) => {
          if ('separator' in button && button.separator) {
            return <Separator key={`sep-${index}`} orientation="vertical" className="h-6 mx-1" />;
          }
          
          const ButtonIcon = button.icon;
          return (
            <Button
              key={index}
              type="button"
              variant={button.isActive ? "default" : "ghost"}
              size="sm"
              onClick={button.action}
              title={button.label}
              aria-label={button.label}
              className="h-8 w-8 p-0"
            >
              <ButtonIcon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>
      
      <div className="border border-t-0 rounded-b-lg bg-background">
        <EditorContent 
          editor={editor}
          className="article-content [&_.ProseMirror]:min-h-[400px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:p-4 [&_.ProseMirror_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_.is-editor-empty:first-child::before]:h-0"
        />
      </div>
      
      <p className="text-xs text-muted-foreground">
        Tampilan di editor sama dengan artikel yang terbit.
      </p>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sisipkan link</DialogTitle>
            <DialogDescription>Tempel alamat tujuan. Kosongkan lalu simpan untuk menghapus link.</DialogDescription>
          </DialogHeader>
          {/* Not a <form>: this dialog is rendered inside the article form and a submit would bubble into it. */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rte-link-url">Alamat link</Label>
              <Input
                id="rte-link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyLink();
                  }
                }}
                placeholder="https://"
                autoComplete="off"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setLinkOpen(false)}>Batal</Button>
              <Button type="button" onClick={applyLink}>Simpan link</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RichTextEditor;