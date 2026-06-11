// src/docxGenerator.js
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumberElement, PageBreak, LevelFormat,
  ExternalHyperlink, TabStopType, TabStopPosition
} = require('docx');

// KPMG Brand Colors
const KPMG_BLUE = '00338D';        // Primary KPMG blue
const KPMG_LIGHT_BLUE = '005EB8';  // Secondary blue
const KPMG_COBALT = '0091DA';      // Accent cobalt
const KPMG_GREY = '63666A';        // Body text grey
const KPMG_LIGHT_GREY = 'F2F2F2'; // Section backgrounds
const KPMG_TEAL = '00B2A9';        // Highlight teal
const WHITE = 'FFFFFF';
const BLACK = '000000';

function px(pt) { return pt * 20; } // pt to half-points (docx size unit)
function dxa(inch) { return Math.round(inch * 1440); }

// Page dimensions (A4)
const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = dxa(1);
const CONTENT_W = PAGE_W - (MARGIN * 2);

function makeHr(color = KPMG_BLUE, thickness = 12) {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: thickness, color } },
    spacing: { before: 0, after: 120 }
  });
}

function makeBlueBox(text) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_W, type: WidthType.DXA },
            shading: { fill: KPMG_BLUE, type: ShadingType.CLEAR },
            margins: { top: 200, bottom: 200, left: 240, right: 240 },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new TextRun({ text, font: 'Arial', size: px(12), bold: true, color: WHITE })]
              })
            ]
          })
        ]
      })
    ]
  });
}

function makeStatBox(value, label, width) {
  const cellW = width || Math.floor(CONTENT_W / 3);
  return new TableCell({
    width: { size: cellW, type: WidthType.DXA },
    shading: { fill: KPMG_LIGHT_GREY, type: ShadingType.CLEAR },
    margins: { top: 180, bottom: 180, left: 200, right: 200 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: KPMG_BLUE },
      bottom: { style: BorderStyle.NIL },
      left: { style: BorderStyle.NIL },
      right: { style: BorderStyle.NIL }
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({ text: value, font: 'Arial', size: px(22), bold: true, color: KPMG_BLUE })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [new TextRun({ text: label, font: 'Arial', size: px(9), color: KPMG_GREY })]
      })
    ]
  });
}

function makeBody(text, spacing = { before: 120, after: 180 }) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing,
    children: [new TextRun({ text, font: 'Arial', size: px(10), color: KPMG_GREY })]
  });
}

function makeH1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: KPMG_BLUE } },
    children: [new TextRun({ text, font: 'Arial', size: px(18), bold: true, color: KPMG_BLUE })]
  });
}

function makeH2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, font: 'Arial', size: px(13), bold: true, color: KPMG_LIGHT_BLUE })]
  });
}

function makeH3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, font: 'Arial', size: px(11), bold: true, color: KPMG_GREY })]
  });
}

function makeSpacerPara(pts = 80) {
  return new Paragraph({ spacing: { before: 0, after: pts }, children: [new TextRun('')] });
}

async function generateDocx(reportData) {
  const children = [];
  const currentYear = new Date().getFullYear();

  // ── COVER PAGE ──────────────────────────────────────────────────────────────
  // Top blue bar (simulated with table)
  children.push(
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [CONTENT_W],
      rows: [new TableRow({
        children: [new TableCell({
          width: { size: CONTENT_W, type: WidthType.DXA },
          shading: { fill: KPMG_BLUE, type: ShadingType.CLEAR },
          margins: { top: 400, bottom: 400, left: 360, right: 360 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'KPMG India', font: 'Arial', size: px(28), bold: true, color: WHITE })],
              spacing: { after: 80 }
            }),
            new Paragraph({
              children: [new TextRun({ text: 'Thought Leadership | ' + (reportData.date || currentYear), font: 'Arial', size: px(11), color: 'C8D8F0' })]
            })
          ]
        })]
      })]
    })
  );

  children.push(makeSpacerPara(480));

  // Report Title
  children.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 0, after: 160 },
    children: [new TextRun({
      text: reportData.topic || 'KPMG Research Report',
      font: 'Arial',
      size: px(28),
      bold: true,
      color: KPMG_BLUE
    })]
  }));

  if (reportData.subtitle) {
    children.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 320 },
      children: [new TextRun({ text: reportData.subtitle, font: 'Arial', size: px(14), color: KPMG_GREY, italics: true })]
    }));
  }

  children.push(makeHr(KPMG_COBALT, 8));
  children.push(makeSpacerPara(160));

  children.push(new Paragraph({
    children: [new TextRun({ text: reportData.date || String(currentYear), font: 'Arial', size: px(11), color: KPMG_GREY })]
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'kpmg.com/in', font: 'Arial', size: px(11), color: KPMG_LIGHT_BLUE })]
  }));

  children.push(makeSpacerPara(400));

  // Disclaimer on cover
  children.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 0, after: 0 },
    children: [new TextRun({
      text: `© ${currentYear} KPMG Assurance and Consulting Services LLP, an Indian Limited Liability Partnership and a member firm of the KPMG global organization of independent member firms affiliated with KPMG International Limited, a private English company limited by guarantee. All rights reserved.`,
      font: 'Arial', size: px(7.5), color: KPMG_GREY
    })]
  }));

  // Page break after cover
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ── EXECUTIVE SUMMARY ───────────────────────────────────────────────────────
  children.push(makeBlueBox('Executive Summary'));
  children.push(makeSpacerPara(120));

  if (reportData.executiveSummary) {
    const sentences = reportData.executiveSummary.split('. ');
    if (sentences.length > 0) {
      children.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 0, after: 180 },
        children: [new TextRun({ text: sentences[0] + '.', font: 'Arial', size: px(10.5), bold: true, color: KPMG_BLUE })]
      }));
      if (sentences.length > 1) {
        children.push(makeBody(sentences.slice(1).join('. ')));
      }
    }
  }

  children.push(makeSpacerPara(200));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ── TABLE OF CONTENTS ───────────────────────────────────────────────────────
  children.push(makeH1('Table of Contents'));

  if (reportData.sections) {
    reportData.sections.forEach((sec, i) => {
      children.push(new Paragraph({
        spacing: { before: 80, after: 80 },
        tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W, leader: 'dot' }],
        children: [
          new TextRun({ text: `${sec.number || String(i + 1).padStart(2, '0')}  ${sec.title}`, font: 'Arial', size: px(10), bold: true, color: KPMG_BLUE }),
          new TextRun({ text: '\t', font: 'Arial', size: px(10) }),
          new TextRun({ text: String(i + 4), font: 'Arial', size: px(10), color: KPMG_GREY })
        ]
      }));
    });
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ── MAIN SECTIONS ───────────────────────────────────────────────────────────
  if (reportData.sections) {
    reportData.sections.forEach((section, secIdx) => {
      const num = section.number || String(secIdx + 1).padStart(2, '0');
      const isReferences = section.title && section.title.toLowerCase().includes('reference');

      // Section number tag
      children.push(new Paragraph({
        spacing: { before: 200, after: 0 },
        children: [new TextRun({
          text: num,
          font: 'Arial', size: px(36), bold: true, color: KPMG_LIGHT_GREY
        })]
      }));

      children.push(makeH1(section.title));

      // Key stats row
      if (section.keyStats && section.keyStats.length > 0 && !isReferences) {
        const stats = section.keyStats.slice(0, 3);
        const colW = Math.floor(CONTENT_W / stats.length);
        const cols = Array(stats.length).fill(colW);
        // Adjust last col to fill
        cols[cols.length - 1] = CONTENT_W - colW * (stats.length - 1);

        children.push(new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: cols,
          rows: [new TableRow({
            children: stats.map((stat, si) => makeStatBox(stat.value, stat.label, cols[si]))
          })]
        }));
        children.push(makeSpacerPara(180));
      }

      // Main section content
      if (section.content && !isReferences) {
        const paras = section.content.split('\n').filter(p => p.trim());
        paras.forEach(para => {
          children.push(makeBody(para.trim()));
        });
      }

      // Subsections
      if (section.subsections && section.subsections.length > 0 && !isReferences) {
        section.subsections.forEach(sub => {
          children.push(makeH2(sub.title));
          if (sub.content) {
            const subParas = sub.content.split('\n').filter(p => p.trim());
            subParas.forEach(para => {
              children.push(makeBody(para.trim()));
            });
          }
        });
      }

      // References section special treatment
      if (isReferences && reportData.references) {
        children.push(makeSpacerPara(120));
        reportData.references.forEach((ref, i) => {
          children.push(new Paragraph({
            spacing: { before: 80, after: 80 },
            numbering: { reference: 'ref-list', level: 0 },
            children: [
              new TextRun({ text: ref.citation || '', font: 'Arial', size: px(9), color: KPMG_GREY }),
              ...(ref.source ? [new TextRun({ text: `, ${ref.source}`, font: 'Arial', size: px(9), color: KPMG_GREY, bold: true })] : []),
              ...(ref.year ? [new TextRun({ text: `, ${ref.year}`, font: 'Arial', size: px(9), color: KPMG_GREY })] : []),
              ...(ref.url ? [
                new TextRun({ text: '. Available at: ', font: 'Arial', size: px(9), color: KPMG_GREY }),
                new TextRun({ text: ref.url, font: 'Arial', size: px(9), color: KPMG_LIGHT_BLUE })
              ] : [])
            ]
          }));
        });
      }

      // Page break between sections (not after last)
      if (secIdx < reportData.sections.length - 1) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }
    });
  }

  // ── CONCLUSION ──────────────────────────────────────────────────────────────
  if (reportData.conclusion) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(makeBlueBox('Conclusion'));
    children.push(makeSpacerPara(120));
    children.push(makeBody(reportData.conclusion, { before: 0, after: 180 }));
  }

  // ── BACK PAGE DISCLAIMER ─────────────────────────────────────────────────────
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(makeSpacerPara(600));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'KPMG. Make the Difference.', font: 'Arial', size: px(16), bold: true, color: KPMG_BLUE })]
  }));
  children.push(makeSpacerPara(120));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'kpmg.com/in', font: 'Arial', size: px(11), color: KPMG_LIGHT_BLUE })]
  }));
  children.push(makeSpacerPara(200));
  children.push(makeHr(KPMG_BLUE, 6));
  children.push(new Paragraph({
    spacing: { before: 80, after: 0 },
    children: [new TextRun({
      text: `The information contained herein is of a general nature and is not intended to address the circumstances of any particular individual or entity. Although we endeavour to provide accurate and timely information, there can be no guarantee that such information is accurate as of the date it is received or that it will continue to be accurate in the future. No one should act on such information without appropriate professional advice after a thorough examination of the particular situation. © ${new Date().getFullYear()} KPMG Assurance and Consulting Services LLP, an Indian Limited Liability Partnership and a member firm of the KPMG global organization of independent member firms affiliated with KPMG International Limited, a private English company limited by guarantee. All rights reserved.`,
      font: 'Arial', size: px(7.5), color: KPMG_GREY
    })]
  }));

  // ── BUILD DOCUMENT ──────────────────────────────────────────────────────────
  const doc = new Document({
    creator: 'KPMG India Report Generator',
    title: reportData.topic,
    description: reportData.subtitle || '',
    styles: {
      default: {
        document: { run: { font: 'Arial', size: px(10), color: KPMG_GREY } }
      },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: px(18), bold: true, font: 'Arial', color: KPMG_BLUE },
          paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 }
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: px(13), bold: true, font: 'Arial', color: KPMG_LIGHT_BLUE },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 }
        },
        {
          id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: px(11), bold: true, font: 'Arial', color: KPMG_GREY },
          paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 }
        }
      ]
    },
    numbering: {
      config: [
        {
          reference: 'ref-list',
          levels: [{
            level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } }
          }]
        }
      ]
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
        }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              spacing: { after: 80 },
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: KPMG_BLUE } },
              tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
              children: [
                new TextRun({ text: 'KPMG India', font: 'Arial', size: px(9), bold: true, color: KPMG_BLUE }),
                new TextRun({ text: '\t', font: 'Arial', size: px(9) }),
                new TextRun({ text: reportData.topic || '', font: 'Arial', size: px(9), color: KPMG_GREY })
              ]
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              spacing: { before: 80 },
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: KPMG_BLUE } },
              tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
              children: [
                new TextRun({ text: `© ${new Date().getFullYear()} KPMG India. All rights reserved.`, font: 'Arial', size: px(8), color: KPMG_GREY }),
                new TextRun({ text: '\t', font: 'Arial', size: px(8) }),
                new TextRun({ text: 'Page ', font: 'Arial', size: px(8), color: KPMG_GREY }),
                new PageNumberElement({})
              ]
            })
          ]
        })
      },
      children
    }]
  });

  return await Packer.toBuffer(doc);
}

module.exports = { generateDocx };
