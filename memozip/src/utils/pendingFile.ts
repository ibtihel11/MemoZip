// Hands a file picked on the Home page over to the Upload page.
let pending: File | null = null;
export const setPendingFile = (file: File) => { pending = file; };
export const takePendingFile = (): File | null => {
  const f = pending;
  pending = null;
  return f;
};
