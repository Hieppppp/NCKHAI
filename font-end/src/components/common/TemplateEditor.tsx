import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Table as TableIcon,
  Heading1, Heading2, Heading3, Undo, Redo,
  Minus, Highlighter, Type,
} from 'lucide-react';
import { useEffect } from 'react';

interface TemplateEditorProps {
  content: string;
  onChange: (html: string) => void;
  variables?: { key: string; label: string; group: string }[];
  onInsertVariable?: (key: string) => void;
  readOnly?: boolean;
}

export function TemplateEditor({ content, onChange, readOnly }: TemplateEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  if (!editor) return null;

  const insertPlaceholder = (key: string) => {
    editor.chain().focus().insertContent(`<span data-type="placeholder" style="background:#eef2ff;color:#4f46e5;padding:2px 8px;border-radius:4px;font-weight:700;font-size:13px;font-family:monospace;cursor:default">{{${key}}}</span>&nbsp;`).run();
  };

  return (
    <div className="te-wrap">
      {!readOnly && (
        <div className="te-toolbar">
          <div className="te-toolbar-group">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''} title="Đậm"><Bold size={15} /></button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''} title="Nghiêng"><Italic size={15} /></button>
            <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'active' : ''} title="Gạch chân"><UnderlineIcon size={15} /></button>
            <button onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'active' : ''} title="Gạch ngang"><Strikethrough size={15} /></button>
            <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={editor.isActive('highlight') ? 'active' : ''} title="Highlight"><Highlighter size={15} /></button>
          </div>
          <span className="te-sep" />
          <div className="te-toolbar-group">
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'active' : ''} title="Heading 1"><Heading1 size={15} /></button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'active' : ''} title="Heading 2"><Heading2 size={15} /></button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'active' : ''} title="Heading 3"><Heading3 size={15} /></button>
            <button onClick={() => editor.chain().focus().setParagraph().run()} className={editor.isActive('paragraph') ? 'active' : ''} title="Paragraph"><Type size={15} /></button>
          </div>
          <span className="te-sep" />
          <div className="te-toolbar-group">
            <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={editor.isActive({ textAlign: 'left' }) ? 'active' : ''} title="Trái"><AlignLeft size={15} /></button>
            <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={editor.isActive({ textAlign: 'center' }) ? 'active' : ''} title="Giữa"><AlignCenter size={15} /></button>
            <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={editor.isActive({ textAlign: 'right' }) ? 'active' : ''} title="Phải"><AlignRight size={15} /></button>
          </div>
          <span className="te-sep" />
          <div className="te-toolbar-group">
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'active' : ''} title="Danh sách"><List size={15} /></button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'active' : ''} title="Danh sách số"><ListOrdered size={15} /></button>
            <button onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Đường kẻ ngang"><Minus size={15} /></button>
            <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Chèn bảng"><TableIcon size={15} /></button>
          </div>
          <span className="te-sep" />
          <div className="te-toolbar-group">
            <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Hoàn tác"><Undo size={15} /></button>
            <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Làm lại"><Redo size={15} /></button>
          </div>
        </div>
      )}
      <EditorContent editor={editor} className="te-content" />

      {/* Export method for parent to call insertPlaceholder */}
      <input type="hidden" id="te-insert-fn" data-insert={String(insertPlaceholder)} />

      <style>{`
        .te-wrap{border:1.5px solid var(--surface-variant,#e2e8f0);border-radius:12px;overflow:hidden;background:var(--surface-lowest,#fff)}
        .te-toolbar{display:flex;align-items:center;gap:2px;padding:6px 10px;background:var(--surface-low,#f1f4ff);border-bottom:1.5px solid var(--surface-variant,#e2e8f0);flex-wrap:wrap}
        .te-toolbar-group{display:flex;gap:1px}
        .te-toolbar button{width:30px;height:30px;border:none;border-radius:6px;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--on-surface-muted,#64748b);transition:all .1s}
        .te-toolbar button:hover{background:var(--surface-variant,#e2e8f0);color:var(--on-surface,#0d1c2e)}
        .te-toolbar button.active{background:var(--primary-indigo,#1A237E);color:#fff}
        .te-toolbar button:disabled{opacity:.3;cursor:not-allowed}
        .te-sep{width:1px;height:20px;background:var(--surface-variant,#e2e8f0);margin:0 4px}
        .te-content{min-height:400px;padding:20px 24px;font-family:'Times New Roman',serif;font-size:14px;line-height:1.8}
        .te-content .tiptap{outline:none;min-height:360px}
        .te-content .tiptap h1{font-size:20px;font-weight:700;text-align:center;margin:12px 0}
        .te-content .tiptap h2{font-size:17px;font-weight:700;text-align:center;margin:10px 0}
        .te-content .tiptap h3{font-size:15px;font-weight:700;margin:8px 0}
        .te-content .tiptap p{margin:4px 0}
        .te-content .tiptap ul,.te-content .tiptap ol{padding-left:24px}
        .te-content .tiptap table{border-collapse:collapse;margin:12px 0;width:100%}
        .te-content .tiptap th,.te-content .tiptap td{border:1px solid #ccc;padding:8px 12px}
        .te-content .tiptap th{background:#f1f5f9;font-weight:700}
        .te-content .tiptap hr{border:none;border-top:1px solid #ccc;margin:16px 0}
        .te-content .tiptap mark{background:#fef08a;padding:0 2px;border-radius:2px}
      `}</style>
    </div>
  );
}

// Export insertPlaceholder helper
export function useInsertPlaceholder(editorRef: React.RefObject<HTMLDivElement | null>) {
  return (key: string) => {
    const el = editorRef.current?.querySelector('.te-content .tiptap') as HTMLElement;
    if (!el) return;
    // Insert at cursor or end
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const span = document.createElement('span');
    span.setAttribute('data-type', 'placeholder');
    span.style.cssText = 'background:#eef2ff;color:#4f46e5;padding:2px 8px;border-radius:4px;font-weight:700;font-size:13px;font-family:monospace;cursor:default';
    span.textContent = `{{${key}}}`;

    if (range && el.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(span);
      range.setStartAfter(span);
      selection?.removeAllRanges();
      selection?.addRange(range);
    } else {
      el.appendChild(span);
    }
    el.appendChild(document.createTextNode('\u00A0'));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
}
