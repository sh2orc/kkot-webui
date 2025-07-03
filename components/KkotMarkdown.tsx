import React from 'react';
import { CodeBlock } from './chat/code-block';

interface KkotMarkdownProps {
  children: string;
}

// 인라인 마크다운 파서 (볼드, 이탤릭, 인라인코드, 링크)
function parseInline(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let rest = text;
  let match;
  const patterns: [RegExp, (m: RegExpExecArray) => React.ReactNode][] = [
    [/\*\*([^*]+)\*\*/g, m => <strong className="font-bold markdown-bold" style={{ fontWeight: 900 }}>{m[1]}</strong>],
    [/\*([^*]+)\*/g, m => <em className="italic">{m[1]}</em>],
    [/`([^`]+)`/g, m => <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">{m[1]}</code>],
    [/\[([^\]]+)\]\(([^)]+)\)/g, m => <a href={m[2]} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{m[1]}</a>],
  ];
  while (rest.length > 0) {
    let found = false;
    for (const [regex, render] of patterns) {
      regex.lastIndex = 0;
      match = regex.exec(rest);
      if (match && match.index === 0) {
        elements.push(render(match));
        rest = rest.slice(match[0].length);
        found = true;
        break;
      }
    }
    if (!found) {
      // 다음 특수문자 전까지 일반 텍스트
      const next = Math.min(
        ...patterns.map(([r]) => {
          r.lastIndex = 0;
          const m = r.exec(rest);
          return m ? m.index : rest.length;
        })
      );
      elements.push(rest.slice(0, next));
      rest = rest.slice(next);
    }
  }
  return elements;
}

// 블록 마크다운 파서
function parseBlocks(text: string): React.ReactNode[] {
  const lines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // 코드블록
    if (/^```(\w*)/.test(line)) {
      const lang = line.match(/^```(\w*)/)?.[1] || 'text';
      let code = '';
      const codeStart = i;
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        code += lines[i] + '\n';
        i++;
      }
      if (i < lines.length) i++; // 마지막 ```
      blocks.push(
        <CodeBlock key={'code-' + codeStart} className={`language-${lang}`} inline={false}>
          {code.replace(/\n$/, '')}
        </CodeBlock>
      );
      continue;
    }
    // 헤딩
    if (/^### /.test(line)) {
      blocks.push(<h3 key={'h3-' + i} className="text-lg font-bold mb-2 mt-4">{parseInline(line.replace(/^### /, ''))}</h3>);
      i++;
      continue;
    }
    if (/^## /.test(line)) {
      blocks.push(<h2 key={'h2-' + i} className="text-xl font-bold mb-3 mt-5">{parseInline(line.replace(/^## /, ''))}</h2>);
      i++;
      continue;
    }
    if (/^# /.test(line)) {
      blocks.push(<h1 key={'h1-' + i} className="text-2xl font-bold mb-4 mt-6">{parseInline(line.replace(/^# /, ''))}</h1>);
      i++;
      continue;
    }
    // 수평선
    if (/^(---+|\*\*\*+|___+)$/.test(line)) {
      blocks.push(<hr key={'hr-' + i} className="my-4 border-gray-300 dark:border-gray-600" />);
      i++;
      continue;
    }
    // 인용구
    if (/^> /.test(line)) {
      blocks.push(<blockquote key={'blockquote-' + i} className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-4">{parseInline(line.replace(/^> /, ''))}</blockquote>);
      i++;
      continue;
    }
    // 리스트(ul/ol)
    if (/^\d+\. /.test(line) || /^- /.test(line)) {
      const isOrdered = /^\d+\. /.test(line);
      const items: React.ReactNode[] = [];
      const listStart = i;
      let j = 0;
      while (i < lines.length && (/^\d+\. /.test(lines[i]) || /^- /.test(lines[i]))) {
        items.push(<li key={'li-' + listStart + '-' + j}>{parseInline(lines[i].replace(/^\d+\. |^- /, ''))}</li>);
        i++;
        j++;
      }
      blocks.push(
        isOrdered ? (
          <ol key={'ol-' + listStart} className="list-decimal pl-6 mb-2">{items}</ol>
        ) : (
          <ul key={'ul-' + listStart} className="list-disc pl-6 mb-2">{items}</ul>
        )
      );
      continue;
    }
    // 빈 줄(단락 구분)
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }
    // 일반 텍스트(여러 줄 연속 단락)
    let para = line;
    let j = i + 1;
    while (j < lines.length && lines[j].trim() !== '' &&
      !/^#/.test(lines[j]) && !/^> /.test(lines[j]) && !/^\d+\. /.test(lines[j]) && !/^- /.test(lines[j]) && !/^```/.test(lines[j]) && !/^(---+|\*\*\*+|___+)$/.test(lines[j])) {
      para += '\n' + lines[j];
      j++;
    }
    blocks.push(
      <div key={'para-' + i} className="mb-1">
        {parseInline(para).map((el, idx) =>
          typeof el === 'string' ? el.split(/\n/).map((t, k, arr) => k < arr.length - 1 ? [t, <br key={'br-' + i + '-' + idx + '-' + k} />] : t) : el
        )}
      </div>
    );
    i = j;
  }
  return blocks;
}

const KkotMarkdown = ({ children }: KkotMarkdownProps) => {
  return <>{parseBlocks(children)}</>;
};

export default KkotMarkdown; 