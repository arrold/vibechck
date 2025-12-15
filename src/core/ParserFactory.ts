import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import TypeScript from 'tree-sitter-typescript';
import Python from 'tree-sitter-python';

export type SupportedLanguage = 'javascript' | 'typescript' | 'python' | 'unknown';

export class ParserFactory {
  private static instance: ParserFactory;
  private parser: Parser;

  private constructor() {
    this.parser = new Parser();
  }

  public static getInstance(): ParserFactory {
    if (!ParserFactory.instance) {
      ParserFactory.instance = new ParserFactory();
    }
    return ParserFactory.instance;
  }

  public getParser(language: SupportedLanguage): Parser {
    switch (language) {
      case 'javascript':
        this.parser.setLanguage(JavaScript);
        break;
      case 'typescript':
        this.parser.setLanguage(TypeScript.typescript);
        break;
      case 'python':
        this.parser.setLanguage(Python);
        break;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
    return this.parser;
  }

  public getLanguageForFile(filePath: string): SupportedLanguage {
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.mjs')) {
      return 'javascript';
    }
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      return 'typescript';
    }
    if (filePath.endsWith('.py')) {
      return 'python';
    }
    return 'unknown';
  }
}
