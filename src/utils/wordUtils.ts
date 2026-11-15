import mammoth from 'mammoth';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';

export async function parseDocxBuffer(arrayBuffer: ArrayBuffer): Promise<{ html: string; warnings: string[] }> {
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return {
    html: result.value || '<p></p>',
    warnings: result.messages.map((m) => m.message),
  };
}

function collectTextRuns(node: Node, style: { bold?: boolean; italics?: boolean; underline?: boolean } = {}): TextRun[] {
  const runs: TextRun[] = [];
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    if (text.length > 0) {
      runs.push(
        new TextRun({
          text,
          bold: style.bold,
          italics: style.italics,
          underline: style.underline ? {} : undefined,
        }),
      );
    }
    return runs;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return runs;
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === 'br') {
    runs.push(new TextRun({ break: 1 }));
    return runs;
  }

  const nextStyle = {
    bold: style.bold || tag === 'strong' || tag === 'b',
    italics: style.italics || tag === 'em' || tag === 'i',
    underline: style.underline || tag === 'u',
  };

  for (const child of Array.from(el.childNodes)) {
    runs.push(...collectTextRuns(child, nextStyle));
  }
  return runs;
}

function parseAlignment(el: HTMLElement): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  const align = el.style?.textAlign || el.getAttribute('align') || '';
  if (align === 'center') return AlignmentType.CENTER;
  if (align === 'right') return AlignmentType.RIGHT;
  if (align === 'justify') return AlignmentType.JUSTIFIED;
  if (align === 'left') return AlignmentType.LEFT;
  return undefined;
}

export async function exportHtmlToDocxBytes(html: string): Promise<Uint8Array> {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = parsed.body.firstElementChild ?? parsed.body;
  const children: Array<Paragraph | Table> = [];

  const processElement = (el: HTMLElement) => {
    const tag = el.tagName.toLowerCase();

    if (el.classList.contains('doc-page-break') || tag === 'hr') {
      children.push(new Paragraph({ children: [new PageBreak()] }));
      return;
    }

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const heading =
        tag === 'h1'
          ? HeadingLevel.HEADING_1
          : tag === 'h2'
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3;
      const runs = collectTextRuns(el);
      children.push(
        new Paragraph({
          heading,
          alignment: parseAlignment(el),
          children: runs.length > 0 ? runs : [new TextRun('')],
        }),
      );
      return;
    }

    if (tag === 'ul' || tag === 'ol') {
      const listItems = Array.from(el.querySelectorAll(':scope > li'));
      listItems.forEach((li, index) => {
        const runs = collectTextRuns(li);
        if (tag === 'ul') {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              children: runs.length > 0 ? runs : [new TextRun('')],
            }),
          );
        } else {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `${index + 1}. ` }), ...runs],
            }),
          );
        }
      });
      return;
    }

    if (tag === 'table') {
      const trList = Array.from(el.querySelectorAll('tr'));
      if (trList.length > 0) {
        const tableRows = trList.map((tr) => {
          const cells = Array.from(tr.querySelectorAll('th, td'));
          return new TableRow({
            children: cells.map(
              (cell) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: collectTextRuns(cell),
                    }),
                  ],
                }),
            ),
          });
        });
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          }),
        );
      }
      return;
    }

    if (tag === 'div' && el.children.length > 0) {
      for (const child of Array.from(el.children)) {
        processElement(child as HTMLElement);
      }
      return;
    }

    const runs = collectTextRuns(el);
    children.push(
      new Paragraph({
        alignment: parseAlignment(el),
        children: runs.length > 0 ? runs : [new TextRun('')],
      }),
    );
  };

  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      processElement(node as HTMLElement);
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      children.push(new Paragraph({ children: [new TextRun(node.textContent.trim())] }));
    }
  }

  if (children.length === 0) {
    children.push(new Paragraph({ children: [new TextRun('')] }));
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}

export async function createSampleDocxBytes(
  title: string,
  subtitle: string,
  paragraphs: string[],
): Promise<Uint8Array> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: title, bold: true })],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: subtitle })],
          }),
          ...paragraphs.map(
            (text) =>
              new Paragraph({
                children: [new TextRun({ text })],
              }),
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}
