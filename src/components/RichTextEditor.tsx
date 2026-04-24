import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, Italic, Strikethrough, List, ListOrdered, 
  Quote, Undo, Redo, Link as LinkIcon, Image as ImageIcon,
  Code, Heading1, Heading2, Heading3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder = 'Write your post content...' }: RichTextEditorProps) {
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose max-w-none focus:outline-none min-h-[200px] p-4 bg-card rounded-b-xl',
      },
    },
  });

  const addImage = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setShowImageInput(false);
    }
  }, [editor, imageUrl]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `post-images/${crypto.randomUUID()}.${ext}`;
    
    const { error: upErr } = await supabase.storage
      .from('gallery-images')
      .upload(path, file, { upsert: false });
    
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }

    const { data: pub } = supabase.storage.from('gallery-images').getPublicUrl(path);
    editor?.chain().focus().setImage({ src: pub.publicUrl }).run();
    setUploading(false);
    toast.success('Image added');
  }, [editor]);

  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkInput(false);
    }
  }, [editor, linkUrl]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children,
    title 
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        isActive 
          ? 'bg-primary text-primary-foreground' 
          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/30">
        {/* History */}
        <ToolbarButton 
          onClick={() => editor.chain().focus().undo().run()} 
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().redo().run()} 
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        {/* Link */}
        <ToolbarButton
          onClick={() => setShowLinkInput(!showLinkInput)}
          isActive={editor.isActive('link')}
          title="Add Link"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        
        {/* Image */}
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
            disabled={uploading}
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            <span className={`p-2 rounded-lg transition-colors inline-flex ${
              uploading 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}>
              <ImageIcon className="h-4 w-4" />
            </span>
          </label>
        </div>
      </div>
      
      {/* Link Input */}
      {showLinkInput && (
        <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/20">
          <Input
            type="url"
            placeholder="Enter URL..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={addLink} className="h-8">
            Add
          </Button>
          {editor.isActive('link') && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => editor.chain().focus().unsetLink().run()}
              className="h-8"
            >
              Remove
            </Button>
          )}
        </div>
      )}
      
      {/* Editor Content */}
      <EditorContent editor={editor} />
      
      {/* Character count */}
      <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
        {editor.storage.characterCount?.characters?.() ?? editor.getText().length} characters
      </div>
    </div>
  );
}
