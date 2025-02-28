'use client';

import { EditorContent, useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';


import { Button } from '@/src/components/ui/button';
import {
  Bold,
  Italic,
  List as ListIcon,
  ListOrdered,
  Heading as HeadingIcon,
} from 'lucide-react';

interface RichEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
}

export function RichEditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <div className="flex space-x-2 mb-2">
      <Button
        onClick={() => editor.chain().focus().toggleBold().run()}
        variant="outline"
        size="sm"
        className={editor.isActive('bold') ? 'btn-active' : ''}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        variant="outline"
        size="sm"
        className={editor.isActive('italic') ? 'btn-active' : ''}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        variant="outline"
        size="sm"
        className={editor.isActive('bulletList') ? 'btn-active' : ''}
      >
        <ListIcon className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        variant="outline"
        size="sm"
        className={editor.isActive('orderedList') ? 'btn-active' : ''}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        variant="outline"
        size="sm"
        className={editor.isActive('heading', { level: 2 }) ? 'btn-active' : ''}
      >
        <HeadingIcon className="h-4 w-4" />
        <span className="ml-1 text-xs">H2</span>
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        variant="outline"
        size="sm"
        className={editor.isActive('heading', { level: 3 }) ? 'btn-active' : ''}
      >
        <HeadingIcon className="h-4 w-4" />
        <span className="ml-1 text-xs">H3</span>
      </Button>
    </div>
  );
}

const RichEditor = ({ content, onChange, editable = true }: RichEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit
    ],
    content,
    editable,
    immediatelyRender: false, // Prevent SSR hydration mismatches
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      handleKeyDown(view, event) {
        if (event.key === 'Tab') {
          event.preventDefault();
          if (event.shiftKey) {
            return editor.commands.liftListItem('listItem');
          } else {
            return editor.commands.sinkListItem('listItem');
          }
        }
        return false;
      },
    },
  });

  // Update editor content if external content changes.
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div>
      <div className='prose prose-sm sm:prose-base lg:prose-lg min-h-[80px] resize-y overflow-auto border p-2 bg-white'>
      {editable && <RichEditorToolbar editor={editor} />}
      
        <EditorContent editor={editor}/>
      </div>
    </div>
  );
};

export default RichEditor;
