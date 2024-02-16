/**
 * Detects the language of the script (Arabic, English, or Spanish) of the given text.
 * @param {string} text - The text to analyze.
 * @returns {string} The detected script ('ar', 'en', 'sp', or 'unknown').
 */
export function detectLanguage(text: string): 'en' | 'es' | 'ar' | 'unknown' {
  // Define regular expressions to match Arabic, English, and Spanish characters
  const arabicPattern: RegExp = /[\u0600-\u06FF]/;
  const englishPattern: RegExp = /[A-Za-z]/;
  const spanishPattern: RegExp = /[áéíóúÁÉÍÓÚñÑüÜ]/; // Including common Spanish diacritics

  // Check if the text contains Arabic characters
  if (arabicPattern.test(text)) {
    return 'ar';
  }

  // Check if the text contains English characters
  if (englishPattern.test(text)) {
    return 'en';
  }

  // Check if the text contains Spanish characters
  if (spanishPattern.test(text)) {
    return 'es';
  }

  // If neither Arabic, English, nor Spanish characters are found, return 'Unknown'
  return 'unknown';
}


/**
 * Removes special characters from a string, keeping only alphanumeric and whitespace characters.
 * @param {string} input - The input string to sanitize.
 * @returns {string} The sanitized string with special characters removed.
 */
export function removeSpecialCharacters(input: string): string {
  // Define a regular expression to match non-alphanumeric and non-whitespace characters
  // const specialCharacterPattern: RegExp = /[^a-zA-Z0-9\s]/g;
  const specialCharacterPattern: RegExp = /[^\p{L}\d\s]/gu;

  // Remove special characters from the input
  const sanitizedInput: string = input.replace(specialCharacterPattern, '');

  return sanitizedInput;
}
