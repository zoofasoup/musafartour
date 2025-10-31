import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
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

const RichTextEditor = ({ value, onChange, placeholder = "Write your content here..." }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
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
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      let formattedUrl = url.trim();
      if (!formattedUrl.match(/^https?:\/\//)) {
        formattedUrl = 'https://' + formattedUrl;
      }
      editor.chain().focus().setLink({ href: formattedUrl }).run();
    }
  };

  const toolbarButtons = [
    {
      icon: Bold,
      label: "Bold",
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      icon: Italic,
      label: "Italic",
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    { separator: true },
    {
      icon: Heading2,
      label: "Heading 2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      icon: Heading3,
      label: "Heading 3",
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive('heading', { level: 3 }),
    },
    { separator: true },
    {
      icon: List,
      label: "Bullet List",
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      icon: ListOrdered,
      label: "Numbered List",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
    },
    { separator: true },
    {
      icon: Quote,
      label: "Quote",
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive('blockquote'),
    },
    {
      icon: LinkIcon,
      label: "Insert Link",
      action: addLink,
      isActive: editor.isActive('link'),
    },
    { separator: true },
    {
      icon: Undo,
      label: "Undo",
      action: () => editor.chain().focus().undo().run(),
      isActive: false,
    },
    {
      icon: Redo,
      label: "Redo",
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
          className="
            prose prose-sm max-w-none
            [&_.ProseMirror]:min-h-[400px]
            [&_.ProseMirror]:outline-none
            [&_.ProseMirror]:p-4
            [&_.ProseMirror_h2]:text-2xl
            [&_.ProseMirror_h2]:font-bold
            [&_.ProseMirror_h2]:mt-6
            [&_.ProseMirror_h2]:mb-4
            [&_.ProseMirror_h3]:text-xl
            [&_.ProseMirror_h3]:font-bold
            [&_.ProseMirror_h3]:mt-5
            [&_.ProseMirror_h3]:mb-3
            [&_.ProseMirror_p]:text-foreground
            [&_.ProseMirror_p]:leading-relaxed
            [&_.ProseMirror_p]:mb-4
            [&_.ProseMirror_strong]:font-semibold
            [&_.ProseMirror_em]:italic
            [&_.ProseMirror_a]:text-primary
            [&_.ProseMirror_a]:underline
            [&_.ProseMirror_blockquote]:border-l-4
            [&_.ProseMirror_blockquote]:border-primary
            [&_.ProseMirror_blockquote]:pl-4
            [&_.ProseMirror_blockquote]:italic
            [&_.ProseMirror_blockquote]:my-4
            [&_.ProseMirror_ul]:list-disc
            [&_.ProseMirror_ul]:pl-6
            [&_.ProseMirror_ul]:my-4
            [&_.ProseMirror_ol]:list-decimal
            [&_.ProseMirror_ol]:pl-6
            [&_.ProseMirror_ol]:my-4
            [&_.ProseMirror_li]:text-foreground
            [&_.ProseMirror_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
            [&_.ProseMirror_.is-editor-empty:first-child::before]:text-muted-foreground
            [&_.ProseMirror_.is-editor-empty:first-child::before]:float-left
            [&_.ProseMirror_.is-editor-empty:first-child::before]:pointer-events-none
            [&_.ProseMirror_.is-editor-empty:first-child::before]:h-0
          "
        />
      </div>
      
      <p className="text-xs text-muted-foreground">
        Toolbar remains visible while scrolling. All formatting options work correctly in the editor and published articles.
      </p>
    </div>
  );
};

export default RichTextEditor;
