import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Native-only: writes the PDF to app cache storage, then hands it to the OS
// share sheet (Save / Print / share to any app) — there's no in-WebView print
// dialog on Capacitor, so this is the native equivalent of window.print().
export async function shareQuotationPdf(
  pdfBlob: Blob,
  fileName = `quotation-${Date.now()}.pdf`
): Promise<void> {
  const base64 = await blobToBase64(pdfBlob);
  const written = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  });

  await Share.share({
    title: "Nirvana Quotation",
    url: written.uri,
  });
}
