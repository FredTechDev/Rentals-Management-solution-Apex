export const openBlobInNewTab = (blob) => {
  const fileUrl = URL.createObjectURL(blob);
  const nextWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer');

  if (!nextWindow) {
    window.location.assign(fileUrl);
  }

  window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
};

export const downloadBlob = (blob, filename) => {
  const fileUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
};
