import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScribeNote, VideoMetadata } from '../../types';
import { X, Copy, Download, Check, FileText, Printer, FileDown } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: ScribeNote[];
  metadata: VideoMetadata | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, notes, metadata }) => {
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'word' | 'markdown'>('pdf');

  const markdownContent = generateMarkdown(notes, metadata);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const rawTitle = metadata?.title || 'scribe-notes';
    const filename = `${sanitizeFilename(rawTitle)}.md`;
    downloadFile(markdownContent, filename, 'text/markdown;charset=utf-8');
  };

  const handleExportPDF = () => {
    const htmlContent = generatePrintableHTML(notes, metadata);
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 1000);
      }, 500);
    }
  };

  const handleExportWord = () => {
    const rawTitle = metadata?.title || 'scribe-notes';
    const filename = `${sanitizeFilename(rawTitle)}.doc`;
    const docHtml = generateWordHTML(notes, metadata);
    downloadFile(docHtml, filename, 'application/msword;charset=utf-8');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="scribe-modal-backdrop" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="scribe-modal-card"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={15} color="var(--scribe-text)" />
                <div className="scribe-modal-title">Export Notes</div>
              </div>
              <button
                onClick={onClose}
                className="scribe-icon-btn"
                style={{ width: '24px', height: '24px' }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ fontSize: '11.5px', color: 'var(--scribe-muted-fg)' }}>
              Exporting <strong>{notes.length} notes</strong> for {metadata?.title || 'YouTube Video'}
            </div>

            {/* Format Selector Tabs */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--scribe-card)', padding: '3px', borderRadius: '6px', border: '1px solid var(--scribe-border)' }}>
              <button
                className={`scribe-tabs-trigger ${exportFormat === 'pdf' ? 'active' : ''}`}
                style={{ flex: 1, textAlign: 'center', padding: '5px' }}
                onClick={() => setExportFormat('pdf')}
              >
                PDF Document
              </button>
              <button
                className={`scribe-tabs-trigger ${exportFormat === 'word' ? 'active' : ''}`}
                style={{ flex: 1, textAlign: 'center', padding: '5px' }}
                onClick={() => setExportFormat('word')}
              >
                Word (.doc)
              </button>
              <button
                className={`scribe-tabs-trigger ${exportFormat === 'markdown' ? 'active' : ''}`}
                style={{ flex: 1, textAlign: 'center', padding: '5px' }}
                onClick={() => setExportFormat('markdown')}
              >
                Markdown (.md)
              </button>
            </div>

            {/* Preview Box */}
            <div
              style={{
                maxHeight: '160px',
                overflowY: 'auto',
                background: 'var(--scribe-input-bg)',
                border: '1px solid var(--scribe-border)',
                borderRadius: '6px',
                padding: '8px 10px',
              }}
            >
              <pre
                style={{
                  fontFamily: 'var(--scribe-font-mono)',
                  fontSize: '10.5px',
                  color: 'var(--scribe-muted-fg)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.4',
                }}
              >
                {markdownContent}
              </pre>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <button className="scribe-btn-secondary" onClick={handleCopy}>
                {copied ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <div style={{ display: 'flex', gap: '6px' }}>
                {exportFormat === 'pdf' && (
                  <button className="scribe-btn-primary" onClick={handleExportPDF}>
                    <Printer size={13} />
                    <span>Save as PDF</span>
                  </button>
                )}

                {exportFormat === 'word' && (
                  <button className="scribe-btn-primary" onClick={handleExportWord}>
                    <FileDown size={13} />
                    <span>Download Word</span>
                  </button>
                )}

                {exportFormat === 'markdown' && (
                  <button className="scribe-btn-primary" onClick={handleDownloadMarkdown}>
                    <Download size={13} />
                    <span>Download .md</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

function sanitizeFilename(title: string): string {
  return title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase().slice(0, 50);
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generateMarkdown(notes: ScribeNote[], meta: VideoMetadata | null): string {
  const title = meta?.title || 'Lecture Notes';
  const videoUrl = meta?.url || (meta?.videoId ? `https://www.youtube.com/watch?v=${meta.videoId}` : '');
  const channel = meta?.channel || 'Creator';
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let md = `# ${title}\n\n`;
  md += `> **Source:** [${title}](${videoUrl})\n`;
  md += `> **Channel:** ${channel}\n`;
  md += `> **Generated with Scribe:** ${dateStr}\n\n`;
  md += `## Structured Notes\n\n`;

  if (notes.length === 0) {
    md += `*No notes recorded yet.*\n`;
    return md;
  }

  notes.forEach((note) => {
    const timestampSec = Math.floor(note.timestamp);
    const link = videoUrl ? `${videoUrl}&t=${timestampSec}s` : `#t=${timestampSec}`;

    md += `### [${note.timestampFormatted}](${link}) — ${note.title || 'Key Note'}\n\n`;
    md += `${note.text}\n\n`;

    if (note.bulletPoints && note.bulletPoints.length > 0) {
      md += `**Key Points:**\n`;
      note.bulletPoints.forEach((point) => {
        md += `- ${point}\n`;
      });
      md += `\n`;
    }

    if (note.codeSnippet) {
      const lang = note.codeLanguage || '';
      md += `\`\`\`${lang}\n${note.codeSnippet}\n\`\`\`\n\n`;
    }

    if (note.tags && note.tags.length > 0) {
      md += `**Tags:** ${note.tags.map((t) => `\`#${t}\``).join(' ')}\n\n`;
    }

    md += `---\n\n`;
  });

  return md;
}

function generatePrintableHTML(notes: ScribeNote[], meta: VideoMetadata | null): string {
  const title = meta?.title || 'Technical Lecture Notes';
  const videoUrl = meta?.url || '';
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let notesHtml = '';
  notes.forEach((n) => {
    let bullets = '';
    if (n.bulletPoints && n.bulletPoints.length > 0) {
      bullets = `
        <div style="background:#f4f4f5;border-left:3px solid #18181b;padding:8px 12px;margin:8px 0;border-radius:4px;">
          <strong style="color:#09090b;font-size:12.5px;">Key Points:</strong>
          <ul style="margin:4px 0 0 16px;padding:0;">
            ${n.bulletPoints.map((p) => `<li style="font-size:12.5px;margin-bottom:3px;color:#27272a;">${p}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    let code = '';
    if (n.codeSnippet) {
      code = `<pre style="background:#18181b;color:#fafafa;padding:10px;border-radius:6px;font-family:monospace;font-size:11.5px;overflow-x:auto;">${n.codeSnippet}</pre>`;
    }

    let thumb = '';
    if (n.frameThumbnail) {
      thumb = `<div style="margin:8px 0;"><img src="${n.frameThumbnail}" style="max-width:320px;border-radius:4px;border:1px solid #e4e4e7;" /></div>`;
    }

    notesHtml += `
      <div style="margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #e4e4e7;page-break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span style="background:#18181b;color:#fff;font-family:monospace;font-size:11px;font-weight:bold;padding:2px 6px;border-radius:4px;">${n.timestampFormatted}</span>
          <h3 style="margin:0;font-size:15px;color:#09090b;">${n.title}</h3>
        </div>
        <p style="font-size:13.5px;color:#3f3f46;line-height:1.5;margin:4px 0;">${n.text}</p>
        ${bullets}
        ${code}
        ${thumb}
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - Scribe Notes</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #09090b; max-width: 800px; margin: 0 auto; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div style="border-bottom: 2px solid #18181b; padding-bottom: 12px; margin-bottom: 20px;">
          <div style="font-size: 10px; text-transform: uppercase; color: #71717a; font-weight: bold; letter-spacing: 0.05em;">Scribe Study Notes</div>
          <h1 style="margin: 4px 0 6px 0; font-size: 22px; color: #09090b;">${title}</h1>
          <div style="font-size: 11.5px; color: #71717a;">Source: <a href="${videoUrl}" style="color: #18181b;">${videoUrl}</a> | Generated on ${dateStr}</div>
        </div>
        ${notesHtml}
      </body>
    </html>
  `;
}

function generateWordHTML(notes: ScribeNote[], meta: VideoMetadata | null): string {
  const title = meta?.title || 'Lecture Notes';
  const videoUrl = meta?.url || '';
  const dateStr = new Date().toLocaleDateString();

  let body = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11pt; color: #18181B; }
      h1 { font-size: 18pt; color: #09090B; margin-bottom: 4px; }
      h2 { font-size: 13pt; color: #27272A; margin-top: 16px; }
      h3 { font-size: 11pt; color: #09090B; margin-bottom: 2px; }
      .badge { background: #18181B; color: #ffffff; padding: 2px 5px; font-weight: bold; font-size: 9pt; }
      .box { background: #F4F4F5; border: 1px solid #E4E4E7; padding: 8px; margin: 6px 0; }
      pre { background: #18181B; color: #FAFAFA; padding: 8px; font-family: Consolas, monospace; font-size: 9.5pt; }
    </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p style="color: #71717A; font-size: 9.5pt;">Generated by Scribe AI on ${dateStr} | Source: <a href="${videoUrl}">${videoUrl}</a></p>
      <hr style="border: 1px solid #18181B;" />
  `;

  notes.forEach((n) => {
    body += `
      <div style="margin-bottom: 16px;">
        <h3><span class="badge">[${n.timestampFormatted}]</span> ${n.title}</h3>
        <p>${n.text}</p>
    `;

    if (n.bulletPoints && n.bulletPoints.length > 0) {
      body += `<div class="box"><strong>Key Points:</strong><ul>`;
      n.bulletPoints.forEach((p) => {
        body += `<li>${p}</li>`;
      });
      body += `</ul></div>`;
    }

    if (n.codeSnippet) {
      body += `<pre>${n.codeSnippet}</pre>`;
    }

    body += `</div>`;
  });

  body += `</body></html>`;
  return body;
}
