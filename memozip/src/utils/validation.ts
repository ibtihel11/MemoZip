export const MAX_FILE_MB = 50;

/** Returns an error message, or null if the file is acceptable. The backend must validate again. */
export function validatePdf(file: File): string | null {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'This file is not a PDF. Choose a course document in PDF format.';
  if (file.size === 0) return 'This file is empty. Choose a different PDF.';
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `This file is larger than ${MAX_FILE_MB} MB. Choose a smaller PDF.`;
  return null;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
