export type PromptMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type BuiltPrompt = {
  systemInstruction: string;
  userPrompt: string;
  expectedFormat?: 'json' | 'text';
  schemaHint?: string;
};

export type LanguageOption =
  | 'English'
  | 'Afrikaans'
  | 'isiZulu'
  | 'isiXhosa'
  | 'Sesotho'
  | 'Setswana'
  | 'Xitsonga'
  | 'Sepedi'
  | 'Tshivenda'
  | 'siSwati'
  | 'isiNdebele';

export interface BaseEduInput {
  subject: string;
  grade: string;
  topic: string;
  term?: string;
  language?: LanguageOption | string;
  notes?: string;
}
