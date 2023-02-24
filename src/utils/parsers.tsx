export function parseMetadata<T>(metadata: string): T {
  try {
    JSON.parse(metadata);
  } catch (e) {
    return metadata as T;
  }
  return JSON.parse(metadata);
}
