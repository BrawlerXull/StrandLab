// Tiny, safe markdown renderer for coach replies: paragraphs, bullet / numbered lists, ### headings, **bold**.
// No HTML injection — everything is rendered as React text nodes.
import { Fragment } from "react";

function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold text-ink">{p.slice(2, -2)}</strong> : <Fragment key={i}>{p.replace(/\*/g, "")}</Fragment>));
}

export default function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join(" "))}</p>);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} className={`${list.ordered ? "list-decimal" : "list-disc"} space-y-1.5 pl-5 marker:text-teal`}>
        {list.items.map((it, i) => <li key={i} className="pl-1">{inline(it)}</li>)}
      </Tag>,
    );
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    const ul = line.match(/^[-•*]\s+(.*)/);
    const ol = line.match(/^\d+[.)]\s+(.*)/);
    const h = line.match(/^#{1,4}\s+(.*)/);
    if (!line) {
      flushPara();
      flushList();
    } else if (h) {
      flushPara();
      flushList();
      blocks.push(<p key={blocks.length} className="font-semibold text-ink">{inline(h[1])}</p>);
    } else if (ul || ol) {
      flushPara();
      const ordered = !!ol;
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((ul || ol)![1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return <div className="space-y-3 leading-relaxed">{blocks}</div>;
}
