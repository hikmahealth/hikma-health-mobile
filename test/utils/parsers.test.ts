import { parseMetadata } from "../../src/utils/parsers";

describe('parseMetadata', () => {
  it('should parse valid JSON', () => {
    const metadata = '{"name": "John Doe", "age": 30}';
    const result = parseMetadata<{ name: string; age: number }>(metadata);
    expect(result.result).toEqual({ name: 'John Doe', age: 30 })
    expect(result.error).toBeNull()
  });

  it('should return an error for invalid JSON', () => {
    const metadata = 'invalid JSON';
    const { result, error } = parseMetadata<{ name: string; age: number }>(metadata);
    expect(result).toEqual(metadata);
    expect(error).toBeDefined()
  });


  it('should return the original string for a null string', () => {
    const metadata = null;
    // @ts-expect-error metadata is defined as null but the function expects truthy values
    const { result, error } = parseMetadata<string>(metadata);
    expect(result).toEqual(metadata);
    expect(error).toBeDefined()
  });
});