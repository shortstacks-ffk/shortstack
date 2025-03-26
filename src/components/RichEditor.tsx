'use client';

import { EditorContent, useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Button } from '@/src/components/ui/button';
import { Toggle } from "@/src/components/ui/toggle";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
} from "lucide-react";

interface RichEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
}

export function RichEditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const Options = [
    {
      icon: <Heading1 className="size-4" />,
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      pressed: editor.isActive("heading", { level: 1 }),
    },
    {
      icon: <Heading2 className="size-4" />,
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      pressed: editor.isActive("heading", { level: 2 }),
    },
    {
      icon: <Heading3 className="size-4" />,
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      pressed: editor.isActive("heading", { level: 3 }),
    },
    {
      icon: <Bold className="size-4" />,
      onClick: () => editor.chain().focus().toggleBold().run(),
      pressed: editor.isActive("bold"),
    },
    {
      icon: <Italic className="size-4" />,
      onClick: () => editor.chain().focus().toggleItalic().run(),
      pressed: editor.isActive("italic"),
    },
    {
      icon: <Strikethrough className="size-4" />,
      onClick: () => editor.chain().focus().toggleStrike().run(),
      pressed: editor.isActive("strike"),
    },
    {
      icon: <AlignLeft className="size-4" />,
      onClick: () => editor.chain().focus().setTextAlign("left").run(),
      pressed: editor.isActive({ textAlign: "left" }),
    },
    {
      icon: <AlignCenter className="size-4" />,
      onClick: () => editor.chain().focus().setTextAlign("center").run(),
      pressed: editor.isActive({ textAlign: "center" }),
    },
    {
      icon: <AlignRight className="size-4" />,
      onClick: () => editor.chain().focus().setTextAlign("right").run(),
      pressed: editor.isActive({ textAlign: "right" }),
    },
    {
      icon: <List className="size-4" />,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      pressed: editor.isActive("bulletList"),
    },
    {
      icon: <ListOrdered className="size-4" />,
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      pressed: editor.isActive("orderedList"),
    },
    {
      icon: <Highlighter className="size-4" />,
      onClick: () => editor.chain().focus().toggleHighlight().run(),
      pressed: editor.isActive("highlight"),
    },
  ];

  return (
    <div className="border rounded-md p-1 mb-1 bg-slate-50 space-x-2 z-50">
      {Options.map((option, index) => (
        <Toggle
          key={index}
          pressed={option.pressed}
          onPressedChange={option.onClick}
        >
          {option.icon}
        </Toggle>
      ))}
    </div>
  );
}

const RichEditor = ({ content, onChange, editable = true }: RichEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            class: 'my-1 leading-snug',
          },
        },
        heading: {
          HTMLAttributes: {
            class: 'my-2',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc pl-5 my-1',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal pl-5 my-1',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'leading-snug',
          },
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
     Highlight,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'min-h-[150px] p-4 focus:outline-none prose prose-sm max-w-none',
      },
      handleKeyDown: (view, event) => {
        // Handle Shift+Enter for soft line breaks
        if (event.key === 'Enter' && event.shiftKey) {
          editor?.commands.insertContent('<br>');
          return true;
        }
        
        // Handle Tab key
        if (event.key === 'Tab') {
          event.preventDefault();
          if (event.shiftKey) {
            if (editor?.isActive('listItem')) {
              return editor.commands.liftListItem('listItem');
            }
          } else {
            if (editor?.isActive('listItem')) {
              return editor.commands.sinkListItem('listItem');
            }
            editor?.commands.insertContent('    ');
            return true;
          }
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Use setTimeout to ensure the editor is ready
      setTimeout(() => {
        editor.commands.setContent(content || '<p></p>');
      }, 10);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className={`border rounded-md overflow-hidden ${editable ? 'bg-gray-50' : 'bg-white'}`}>
      {editable && <RichEditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichEditor;