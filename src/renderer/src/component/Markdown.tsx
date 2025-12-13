import { ReactNode, createElement, useMemo } from "react";

import "./Markdown.css";

type MarkdownProps = {
    text?: string | null;
    className?: string;
};

type Block =
    | { type: "heading"; level: number; text: string }
    | { type: "paragraph"; text: string }
    | { type: "code"; text: string }
    | { type: "ul"; items: string[] }
    | { type: "ol"; items: string[] }
    | { type: "color"; color: string; text: string };

const sanitizeColor = (raw: string) => {
    const value = raw.trim();
    const hex = value.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
    if (hex) {
        return value.toLowerCase();
    }
    const named = value.match(/^[a-zA-Z]{1,20}$/);
    if (named) {
        return value.toLowerCase();
    }
    return null;
};

const sanitizeExternalUrl = (raw: string) => {
    const value = raw.trim();
    try {
        const url = new URL(value);
        if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") {
            return url.toString();
        }
        return null;
    } catch {
        return null;
    }
};

const splitByRegex = (
    source: string,
    pattern: RegExp,
    renderMatch: (match: RegExpExecArray, key: string) => ReactNode,
    renderText: (text: string, keyBase: string) => ReactNode[],
    keyBase: string
): ReactNode[] => {
    pattern.lastIndex = 0;
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let index = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source))) {
        if (match.index > lastIndex) {
            nodes.push(...renderText(source.slice(lastIndex, match.index), `${keyBase}.t${index}`));
        }
        nodes.push(renderMatch(match, `${keyBase}.m${index}`));
        lastIndex = match.index + match[0].length;
        index++;
    }
    if (lastIndex < source.length) {
        nodes.push(...renderText(source.slice(lastIndex), `${keyBase}.t${index}`));
    }
    return nodes;
};

const renderEmphasis = (source: string, keyBase: string): ReactNode[] => {
    const renderItalic = (input: string, italicKeyBase: string) =>
        splitByRegex(
            input,
            /\*([^*]+)\*/g,
            (match, key) => (
                <em key={key}>{match[1]}</em>
            ),
            (text, key) => [<span key={key}>{text}</span>],
            italicKeyBase
        );

    return splitByRegex(
        source,
        /\*\*([^*]+)\*\*/g,
        (match, key) => <strong key={key}>{match[1]}</strong>,
        (text, key) => renderItalic(text, key),
        keyBase
    );
};

const renderLinksAndEmphasis = (source: string, keyBase: string): ReactNode[] => {
    return splitByRegex(
        source,
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (match, key) => {
            const label = match[1];
            const rawUrl = match[2];
            const url = sanitizeExternalUrl(rawUrl);
            if (!url) {
                return <span key={key}>{label}</span>;
            }
            return (
                <a
                    key={key}
                    href={url}
                    rel="noreferrer"
                    onClick={(event) => {
                        event.preventDefault();
                        window.api?.openExternal?.(url);
                    }}
                >
                    {label}
                </a>
            );
        },
        (text, textKeyBase) => renderEmphasis(text, textKeyBase),
        keyBase
    );
};

const renderInline = (source: string, keyBase: string): ReactNode[] => {
    return splitByRegex(
        source,
        /`([^`]+)`/g,
        (match, key) => <code key={key}>{match[1]}</code>,
        (text, textKeyBase) => renderLinksAndEmphasis(text, textKeyBase),
        keyBase
    );
};

const renderInlineWithLineBreaks = (source: string, keyBase: string): ReactNode[] => {
    const lines = source.split("\n");
    const nodes: ReactNode[] = [];
    lines.forEach((line, index) => {
        if (index > 0) {
            nodes.push(<br key={`${keyBase}.br${index}`} />);
        }
        nodes.push(...renderInline(line, `${keyBase}.l${index}`));
    });
    return nodes;
};

const parseBlocks = (text: string): Block[] => {
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n");
    const blocks: Block[] = [];

    const flushParagraph = (buffer: string[]) => {
        const value = buffer.join("\n").trimEnd();
        if (value.trim().length === 0) {
            return;
        }
        blocks.push({ type: "paragraph", text: value });
        buffer.length = 0;
    };

    let paragraph: string[] = [];
    let index = 0;
    while (index < lines.length) {
        const line = lines[index];

        const colorBlock = line.match(/^\s*\[\[\[(.+)\s*$/);
        if (colorBlock) {
            flushParagraph(paragraph);
            const rawSpec = (colorBlock[1] ?? "").trim();
            const colorSpec = sanitizeColor(rawSpec.split("(")[0]?.trim() ?? "") ?? "red";
            const innerLines: string[] = [];
            index++;
            while (index < lines.length && !lines[index].match(/^\s*\]\]\]\s*$/)) {
                innerLines.push(lines[index]);
                index++;
            }
            if (index < lines.length && lines[index].match(/^\s*\]\]\]\s*$/)) {
                index++;
            }
            blocks.push({ type: "color", color: colorSpec, text: innerLines.join("\n") });
            continue;
        }

        const fence = line.match(/^```(.*)$/);
        if (fence) {
            flushParagraph(paragraph);
            const codeLines: string[] = [];
            index++;
            while (index < lines.length && !lines[index].startsWith("```")) {
                codeLines.push(lines[index]);
                index++;
            }
            if (index < lines.length && lines[index].startsWith("```")) {
                index++;
            }
            blocks.push({ type: "code", text: codeLines.join("\n") });
            continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
            flushParagraph(paragraph);
            blocks.push({ type: "heading", level: heading[1].length, text: heading[2] ?? "" });
            index++;
            continue;
        }

        const ul = line.match(/^\s*[-*]\s+(.*)$/);
        if (ul) {
            flushParagraph(paragraph);
            const items: string[] = [];
            while (index < lines.length) {
                const match = lines[index].match(/^\s*[-*]\s+(.*)$/);
                if (!match) {
                    break;
                }
                items.push(match[1] ?? "");
                index++;
            }
            blocks.push({ type: "ul", items });
            continue;
        }

        const ol = line.match(/^\s*\d+\.\s+(.*)$/);
        if (ol) {
            flushParagraph(paragraph);
            const items: string[] = [];
            while (index < lines.length) {
                const match = lines[index].match(/^\s*\d+\.\s+(.*)$/);
                if (!match) {
                    break;
                }
                items.push(match[1] ?? "");
                index++;
            }
            blocks.push({ type: "ol", items });
            continue;
        }

        if (line.trim().length === 0) {
            flushParagraph(paragraph);
            index++;
            continue;
        }

        paragraph.push(line);
        index++;
    }
    flushParagraph(paragraph);

    return blocks;
};

const renderBlocks = (blocks: Block[]): ReactNode[] => {
    return blocks.map((block, index) => {
        const keyBase = `md.${index}`;
        if (block.type === "color") {
            return (
                <div
                    key={keyBase}
                    className="markdown-color-block"
                    style={{ color: block.color }}
                >
                    {renderBlocks(parseBlocks(block.text))}
                </div>
            );
        }
        if (block.type === "heading") {
            const level = Math.min(6, Math.max(1, block.level));
            const tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
            return createElement(tag, { key: keyBase }, renderInline(block.text, `${keyBase}.h`));
        }
        if (block.type === "code") {
            return (
                <pre key={keyBase}>
                    <code>{block.text}</code>
                </pre>
            );
        }
        if (block.type === "ul") {
            return (
                <ul key={keyBase}>
                    {block.items.map((item, itemIndex) => (
                        <li key={`${keyBase}.li${itemIndex}`}>{renderInlineWithLineBreaks(item, `${keyBase}.li${itemIndex}`)}</li>
                    ))}
                </ul>
            );
        }
        if (block.type === "ol") {
            return (
                <ol key={keyBase}>
                    {block.items.map((item, itemIndex) => (
                        <li key={`${keyBase}.li${itemIndex}`}>{renderInlineWithLineBreaks(item, `${keyBase}.li${itemIndex}`)}</li>
                    ))}
                </ol>
            );
        }
        return <p key={keyBase}>{renderInlineWithLineBreaks(block.text, `${keyBase}.p`)}</p>;
    });
};

export const Markdown = ({ text, className }: MarkdownProps) => {
    const value = text ?? "";
    const nodes = useMemo(() => renderBlocks(parseBlocks(value)), [value]);
    const classes = ["markdown", className].filter(Boolean).join(" ");
    return <div className={classes}>{nodes}</div>;
};
