export function cleanMultiline(input: string): string {
  return input
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

export function optionalLine(label: string, value?: string | number | boolean): string {
  if (value === undefined || value === null || value === '') return '';
  return \`- \${label}: \${String(value)}\`;
}

export function optionalSection(title: string, lines: Array<string | undefined | null>): string {
  const filtered = lines.filter(Boolean) as string[];
  if (!filtered.length) return '';
  return \`\${title}\n\${filtered.join('\n')}\`;
}

export function stringifyPrettyJsonExample(example: unknown): string {
  return JSON.stringify(example, null, 2);
}

export function joinSections(...sections: Array<string | undefined | null>): string {
  return sections.filter(Boolean).join('\n\n').trim();
}
