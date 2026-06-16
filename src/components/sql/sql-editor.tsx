"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useRef, useCallback, useEffect } from "react";
import type { DbSchema } from "@/types/db";
import type * as Monaco from "monaco-editor";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  schema?: DbSchema | null;
}

// ─── Static SQL completions (always available) ────────────────────────────────

const SQL_KEYWORDS = [
  "SELECT","FROM","WHERE","GROUP BY","ORDER BY","HAVING","LIMIT","OFFSET",
  "JOIN","INNER JOIN","LEFT JOIN","RIGHT JOIN","FULL JOIN","CROSS JOIN","ON",
  "INSERT INTO","VALUES","UPDATE","SET","DELETE FROM","TRUNCATE","DROP TABLE",
  "CREATE TABLE","ALTER TABLE","ADD COLUMN","DROP COLUMN",
  "DISTINCT","AS","AND","OR","NOT","IN","NOT IN","BETWEEN","LIKE","ILIKE",
  "IS NULL","IS NOT NULL","EXISTS","CASE","WHEN","THEN","ELSE","END",
  "UNION","UNION ALL","INTERSECT","EXCEPT","WITH","RECURSIVE",
  "ASC","DESC","NULLS FIRST","NULLS LAST","RETURNING",
]

const SQL_FUNCTIONS = [
  "COUNT(*)","COUNT","SUM","AVG","MIN","MAX","ROUND","FLOOR","CEIL","ABS",
  "COALESCE","NULLIF","IFNULL","NVL","GREATEST","LEAST",
  "NOW()","CURRENT_DATE","CURRENT_TIMESTAMP","DATE_TRUNC","DATE_PART",
  "EXTRACT","TO_DATE","TO_TIMESTAMP","TO_CHAR","CAST","CONVERT",
  "CONCAT","SUBSTRING","TRIM","LTRIM","RTRIM","UPPER","LOWER","LENGTH",
  "REPLACE","SPLIT_PART","REGEXP_REPLACE","STRPOS","POSITION",
  "ROW_NUMBER()","RANK()","DENSE_RANK()","LAG","LEAD","FIRST_VALUE","LAST_VALUE",
  "OVER","PARTITION BY","WINDOW",
  "ARRAY_AGG","STRING_AGG","JSON_AGG","JSONB_AGG",
]

const SQL_SNIPPETS: { label: string; insert: string; detail: string }[] = [
  {
    label: "sel *",
    insert: "SELECT *\nFROM ${1:tabla}\nWHERE ${2:condición};",
    detail: "SELECT * FROM tabla WHERE …",
  },
  {
    label: "sel cols",
    insert: "SELECT\n  ${1:col1},\n  ${2:col2}\nFROM ${3:tabla}\nLIMIT ${4:100};",
    detail: "SELECT columnas con LIMIT",
  },
  {
    label: "group by",
    insert: "SELECT\n  ${1:col},\n  COUNT(*) AS total\nFROM ${2:tabla}\nGROUP BY ${1:col}\nORDER BY total DESC;",
    detail: "GROUP BY con COUNT",
  },
  {
    label: "join",
    insert: "SELECT\n  a.*,\n  b.${1:col}\nFROM ${2:tabla_a} a\nINNER JOIN ${3:tabla_b} b ON a.${4:id} = b.${4:id};",
    detail: "INNER JOIN entre dos tablas",
  },
  {
    label: "cte",
    insert: "WITH ${1:cte_name} AS (\n  SELECT *\n  FROM ${2:tabla}\n  WHERE ${3:condición}\n)\nSELECT *\nFROM ${1:cte_name};",
    detail: "Common Table Expression (WITH)",
  },
  {
    label: "window",
    insert: "SELECT\n  ${1:col},\n  ROW_NUMBER() OVER (PARTITION BY ${2:group_col} ORDER BY ${3:order_col}) AS rn\nFROM ${4:tabla};",
    detail: "Window function con PARTITION BY",
  },
  {
    label: "case",
    insert: "CASE\n  WHEN ${1:condición} THEN ${2:valor}\n  WHEN ${3:condición} THEN ${4:valor}\n  ELSE ${5:default}\nEND",
    detail: "Expresión CASE WHEN",
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function SqlEditor({ value, onChange, onRun, schema }: Props) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const schemaDisposable = useRef<Monaco.IDisposable | null>(null);
  const onRunRef = useRef(onRun);

  useEffect(() => { onRunRef.current = onRun }, [onRun]);

  // Update schema completions whenever schema changes (async load)
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    schemaDisposable.current?.dispose();
    schemaDisposable.current = null;

    if (!schema?.tables?.length) return;

    const suggestions: Monaco.languages.CompletionItem[] = schema.tables.flatMap((table) => [
      {
        label: table.name,
        kind: monaco.languages.CompletionItemKind.Class,
        insertText: table.name,
        detail: `tabla · ${table.rowCount?.toLocaleString() ?? "?"} filas`,
        sortText: "0" + table.name,
        range: new monaco.Range(0, 0, 0, 0),
        documentation: table.columns.map((c) => `${c.name}: ${c.type}`).join("\n"),
      },
      ...table.columns.map((col) => ({
        label: `${table.name}.${col.name}`,
        kind: monaco.languages.CompletionItemKind.Field,
        insertText: col.name,
        detail: `${col.type} · ${table.name}`,
        sortText: "1" + col.name,
        range: new monaco.Range(0, 0, 0, 0),
      })),
    ]);

    schemaDisposable.current = monaco.languages.registerCompletionItemProvider("sql", {
      provideCompletionItems: (_model, _pos, _ctx, _token) => ({ suggestions }),
    });

    return () => { schemaDisposable.current?.dispose(); };
  }, [schema]);

  const handleMount = useCallback<OnMount>((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current());

    // Custom theme
    monaco.editor.defineTheme("perf-bi-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword.sql", foreground: "818cf8", fontStyle: "bold" },
        { token: "string.sql", foreground: "34d399" },
        { token: "number", foreground: "fb923c" },
        { token: "comment", foreground: "52525b", fontStyle: "italic" },
        { token: "operator.sql", foreground: "a1a1aa" },
      ],
      colors: {
        "editor.background": "#09090b",
        "editor.foreground": "#f4f4f5",
        "editor.lineHighlightBackground": "#18181b",
        "editor.selectionBackground": "#6366f140",
        "editorCursor.foreground": "#6366f1",
        "editorLineNumber.foreground": "#3f3f46",
        "editorLineNumber.activeForeground": "#71717a",
        "editorSuggestWidget.background": "#18181b",
        "editorSuggestWidget.border": "#27272a",
        "editorSuggestWidget.selectedBackground": "#27272a",
        "editorSuggestWidget.highlightForeground": "#818cf8",
        "editorSuggestWidget.focusHighlightForeground": "#a5b4fc",
      },
    });
    monaco.editor.setTheme("perf-bi-dark");

    // Always-available SQL keyword + function + snippet completions
    monaco.languages.registerCompletionItemProvider("sql", {
      provideCompletionItems: (model: Monaco.editor.ITextModel, position: Monaco.Position) => {
        const word = model.getWordUntilPosition(position);
        const range: Monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const keywordItems: Monaco.languages.CompletionItem[] = SQL_KEYWORDS.map((kw) => ({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw,
          sortText: "2" + kw,
          range,
        }));

        const functionItems: Monaco.languages.CompletionItem[] = SQL_FUNCTIONS.map((fn) => ({
          label: fn,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: fn.endsWith(")") ? fn : fn + "(${1})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          sortText: "3" + fn,
          range,
        }));

        const snippetItems: Monaco.languages.CompletionItem[] = SQL_SNIPPETS.map((s) => ({
          label: s.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: s.insert,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: s.detail,
          sortText: "4" + s.label,
          range,
        }));

        return { suggestions: [...keywordItems, ...functionItems, ...snippetItems] };
      },
      triggerCharacters: [" ", ".", "\n"],
    });
  }, []);

  return (
    <Editor
      height="100%"
      language="sql"
      value={value}
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      theme="perf-bi-dark"
      options={{
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        wordWrap: "on",
        tabSize: 2,
        padding: { top: 16, bottom: 16 },
        scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
        quickSuggestions: { other: true, comments: false, strings: true },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: "on",
        tabCompletion: "on",
        renderLineHighlight: "line",
        lineDecorationsWidth: 0,
        glyphMargin: false,
        fixedOverflowWidgets: true,
        suggest: {
          showKeywords: true,
          showFunctions: true,
          showSnippets: true,
          showClasses: true,
          showFields: true,
          insertMode: "replace",
          preview: true,
        },
      }}
    />
  );
}
