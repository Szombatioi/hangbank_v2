import { BadRequestException, Injectable } from '@nestjs/common';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import * as sbd from 'sbd';

@Injectable()
export class CorpusProcesserService {
  private readonly ABBREVIATIONS = [
    // English
    'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr',
    'vs', 'etc', 'e.g', 'i.e', 'Fig', 'fig', 'Eq', 'eq', 'Inc', 'Ltd', 'St',
    // Hungarian
    'kb', 'ill', 'stb', 'ún', 'db', 'sz', 'pl', 'tk', 'un', 'ld',
  ];

  public async processCorpusFile(file: Express.Multer.File, skipPages: number = 0,
  ): Promise<string[]> {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    let rawText: string;

    if (ext === 'txt') {
      rawText = file.buffer.toString('utf-8');
      // Promote every line break to a paragraph break to match pdf/docx structure
      rawText = rawText.replace(/\r\n?/g, '\n').replace(/\n+/g, '\n\n');
    } else if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      rawText = result.value;
    } else if (ext === 'pdf') {
      const parser = new PDFParse({ data: file.buffer });
      const result = await parser.getText();
      rawText = result.pages.slice(skipPages).map(p => p.text).join(' ');
    } else {
      throw new BadRequestException('Unsupported file format. Use .txt, .docx, or .pdf');
    }

    return this.extractSentences(rawText);
  }

  public extractSentences(text: string): string[] {
    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Remove soft hyphens (U+00AD), then fix hard hyphenation at line breaks (word-\n → word)
    text = text.replace(/\u00AD/g, '');
    text = text.replace(/-\n\s*/g, '');

    // Split into coarse blocks on paragraph breaks (2+ newlines) and before bullet/list markers.
    // This preserves intentional structure before we flatten each block into sentences.
    const blocks = text
      .split(/\n{2,}/)
      // .split(/\n/)
      .flatMap(block => block.split(/(?=\n\s*[-•*\u2022\u2013]\s)/))
      .map(block =>
        block
          .replace(/^\s*[-•*\u2022\u2013]\s+/, '') // strip leading bullet
          .replace(/\n/g, ' ')                      // collapse remaining single newlines
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter(block => block.length > 0);

    const sentences: string[] = [];

    for (const block of blocks) {
      // Protect abbreviations so sbd doesn't split on their periods
      let protected_ = block;
      for (const abbr of this.ABBREVIATIONS) {
        const regex = new RegExp(`\\b${abbr}\\.`, 'gi');
        protected_ = protected_.replace(regex, `${abbr}<ABBR>`);
      }

      const blockSentences = sbd
        .sentences(protected_, { abbreviations: this.ABBREVIATIONS, newline_boundaries: false })
        .map(s => s.replace(/<ABBR>/g, '.').replace(/\s+/g, ' ').trim())
        .filter(s => s.length > 0);

      sentences.push(...blockSentences);
    }

    return sentences;
  }
}
