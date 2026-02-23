export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getFileExtension(filename: string) {
  return filename.substring(filename.lastIndexOf(".")) || "";
}

export function getBaseName(filename: string) {
  const ext = getFileExtension(filename);
  return ext ? filename.substring(0, filename.lastIndexOf(".")) : filename;
}

export function getImageDimensions(
  src: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = src;
  });
}
