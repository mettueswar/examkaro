"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import UnderlineExtension from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Table as TableIcon,
  Undo,
  Redo,
  Underline as UnderlineIcon,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function TipTapWrapper({ value, onChange }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      UnderlineExtension,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4",
      },
    },
  });

  if (!editor) {
    return <div className="h-64 bg-surface-100 rounded-lg animate-pulse" />;
  }

  return (
    <div className="border border-surface-200 rounded-lg overflow-hidden">
      <div className="border-b border-surface-200 p-2 flex flex-wrap gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 rounded ${editor.isActive("bold") ? "bg-surface-200" : "hover:bg-surface-100"}`}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded ${editor.isActive("italic") ? "bg-surface-200" : "hover:bg-surface-100"}`}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1 rounded ${editor.isActive("underline") ? "bg-surface-200" : "hover:bg-surface-100"}`}
          title="Underline"
        >
          <UnderlineIcon size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1 rounded ${editor.isActive("strike") ? "bg-surface-200" : "hover:bg-surface-100"}`}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </button>
        <div className="w-px h-6 bg-surface-200 mx-1" />
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={`p-1 rounded ${editor.isActive("heading", { level: 1 }) ? "bg-surface-200" : "hover:bg-surface-100"}`}
          title="Heading 1"
        >
          <Heading1 size={16} />
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={`p-1 rounded ${editor.isActive("heading", { level: 2 }) ? "bg-surface-200" : "hover:bg-surface-100"}`}
          title="Heading 2"
        >
          <Heading2 size={16} />
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={`p-1 rounded ${editor.isActive("heading", { level: 3 }) ? "bg-surface-200" : "hover:bg-surface-100"}`}
          title="Heading 3"
        >
          <Heading3 size={16} />
        </button>
        <div className="w-px h-6 bg-surface-200 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1 rounded ${editor.isActive("bulletList") ? "bg-surface-200" : "hover:bg-surface-100"}`}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1 rounded ${editor.isActive("orderedList") ? "bg-surface-200" : "hover:bg-surface-100"}`}
          title="Ordered List"
        >
          <ListOrdered size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1 rounded ${editor.isActive("blockquote") ? "bg-surface-200" : "hover:bg-surface-100"}`}
          title="Quote"
        >
          <Quote size={16} />
        </button>
        <div className="w-px h-6 bg-surface-200 mx-1" />
        <button
          onClick={() => {
            const url = window.prompt("Enter URL:");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={`p-1 rounded ${editor.isActive("link") ? "bg-surface-200" : "hover:bg-surface-100"}`}
          title="Link"
        >
          <LinkIcon size={16} />
        </button>
        <button
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          className="p-1 rounded hover:bg-surface-100"
          title="Insert Table"
        >
          <TableIcon size={16} />
        </button>
        <div className="w-px h-6 bg-surface-200 mx-1" />
        <button
          onClick={() => editor.chain().focus().undo().run()}
          className="p-1 rounded hover:bg-surface-100"
          title="Undo"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          className="p-1 rounded hover:bg-surface-100"
          title="Redo"
        >
          <Redo size={16} />
        </button>
      </div>
      <EditorContent editor={editor} className="min-h-[300px]" />
    </div>
  );
}
