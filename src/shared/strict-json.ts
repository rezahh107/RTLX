export class StrictJsonError extends Error {
  public constructor(
    message: string,
    public readonly offset: number
  ) {
    super(`${message} at offset ${offset}`);
    this.name = 'StrictJsonError';
  }
}

export function parseStrictJson(input: string): unknown {
  const parser = new Parser(input);
  const value = parser.parseValue();
  parser.skipWhitespace();
  if (!parser.done()) throw new StrictJsonError('Trailing data', parser.offset());
  return value;
}

class Parser {
  private index = 0;
  public constructor(private readonly source: string) {}
  public offset(): number {
    return this.index;
  }
  public done(): boolean {
    return this.index >= this.source.length;
  }
  public skipWhitespace(): void {
    while (!this.done() && /[\t\n\r ]/u.test(this.source[this.index]!)) this.index += 1;
  }
  public parseValue(): unknown {
    this.skipWhitespace();
    const char = this.source[this.index];
    if (char === '{') return this.parseObject();
    if (char === '[') return this.parseArray();
    if (char === '"') return this.parseString();
    if (char === 't') return this.parseLiteral('true', true);
    if (char === 'f') return this.parseLiteral('false', false);
    if (char === 'n') return this.parseLiteral('null', null);
    if (char === '-' || (char !== undefined && /[0-9]/u.test(char))) return this.parseNumber();
    throw new StrictJsonError('Unexpected token', this.index);
  }
  private parseObject(): Record<string, unknown> {
    this.expect('{');
    this.skipWhitespace();
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    const keys = new Set<string>();
    if (this.peek('}')) {
      this.index += 1;
      return result;
    }
    while (true) {
      this.skipWhitespace();
      if (!this.peek('"')) throw new StrictJsonError('Object key must be a string', this.index);
      const key = this.parseString();
      if (keys.has(key))
        throw new StrictJsonError(`Duplicate key ${JSON.stringify(key)}`, this.index);
      keys.add(key);
      this.skipWhitespace();
      this.expect(':');
      result[key] = this.parseValue();
      this.skipWhitespace();
      if (this.peek('}')) {
        this.index += 1;
        break;
      }
      this.expect(',');
    }
    return result;
  }
  private parseArray(): unknown[] {
    this.expect('[');
    this.skipWhitespace();
    const result: unknown[] = [];
    if (this.peek(']')) {
      this.index += 1;
      return result;
    }
    while (true) {
      result.push(this.parseValue());
      this.skipWhitespace();
      if (this.peek(']')) {
        this.index += 1;
        break;
      }
      this.expect(',');
    }
    return result;
  }
  private parseString(): string {
    const start = this.index;
    this.expect('"');
    while (!this.done()) {
      const char = this.source[this.index]!;
      if (char === '"') {
        this.index += 1;
        const raw = this.source.slice(start, this.index);
        try {
          return JSON.parse(raw) as string;
        } catch {
          throw new StrictJsonError('Invalid string', start);
        }
      }
      if (char === '\\') {
        this.index += 2;
        continue;
      }
      if (char.charCodeAt(0) < 0x20)
        throw new StrictJsonError('Control character in string', this.index);
      this.index += 1;
    }
    throw new StrictJsonError('Unterminated string', start);
  }
  private parseNumber(): number {
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(
      this.source.slice(this.index)
    );
    if (!match) throw new StrictJsonError('Invalid number', this.index);
    this.index += match[0].length;
    const value = Number(match[0]);
    if (!Number.isFinite(value)) throw new StrictJsonError('Non-finite number', this.index);
    return value;
  }
  private parseLiteral<T>(literal: string, value: T): T {
    if (!this.source.startsWith(literal, this.index))
      throw new StrictJsonError('Invalid literal', this.index);
    this.index += literal.length;
    return value;
  }
  private expect(char: string): void {
    if (this.source[this.index] !== char) throw new StrictJsonError(`Expected ${char}`, this.index);
    this.index += 1;
  }
  private peek(char: string): boolean {
    return this.source[this.index] === char;
  }
}
