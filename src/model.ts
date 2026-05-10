/**
 * wysJSON Intermediate Data Model
 * Represents JavaScript values that can be visualized and edited in the table UI
 */

export type JsonNodeKind = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'codeText';

export interface JsonNode {
  kind: JsonNodeKind;
  value: any;
  /** Original source code for codeText nodes, or for reconstructing source */
  raw?: string;
  /** Whether this node can be directly edited in the table UI */
  editable: boolean;
  /** How to write back this node when changed */
  writeMode: 'json' | 'code'; // 'json' for standard JSON, 'code' for JavaScript expressions
  /** Optional warning message for this node */
  warning?: string;
  /** For structured nodes: children */
  children?: Record<string, JsonNode>;
  /** For arrays: items */
  items?: JsonNode[];
}

/**
 * Metadata about the source JavaScript being edited
 */
export interface SourceInfo {
  /** Original file path (URI) */
  uri: string;
  /** The text of the selected range */
  selectedText: string;
  /** Start position in the file (line, character) */
  start: { line: number; character: number };
  /** End position in the file (line, character) */
  end: { line: number; character: number };
  /** Version of the document when selection was made */
  version: number;
  /** Indentation (spaces) used in the file */
  indent: string;
  /** Original full line(s) text for write-back safety check */
  originalLines?: string[];
}

/**
 * Message sent from extension to Webview when initializing
 */
export interface InitMessage {
  type: 'init';
  rootModel: JsonNode;
  sourceInfo: SourceInfo;
  readonlyWarnings?: string[];
}

/**
 * Message sent from Webview to extension to save edits
 */
export interface SaveMessage {
  type: 'save';
  model: JsonNode;
}

/**
 * Message sent from Webview to extension to request write-back code preview
 */
export interface PreviewMessage {
  type: 'preview';
  model: JsonNode;
}

/**
 * Message sent from Webview to extension to cancel editing
 */
export interface CancelMessage {
  type: 'cancel';
}

export type WebviewMessage = InitMessage | SaveMessage | PreviewMessage | CancelMessage;

/**
 * Response from extension to Webview
 */
export interface ExtensionResponse {
  type: 'success' | 'error' | 'preview';
  message?: string;
  generatedCode?: string; // For preview or write-back result
}
