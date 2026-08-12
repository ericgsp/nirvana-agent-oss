package com.dggroup.supamobily;

import android.content.Context;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.print.pdf.PrintedPdfDocument;
import android.webkit.WebView;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;

// Capacitor's WebView has no window.print() dialog wired up, unlike a
// normal browser tab. Android exposes exactly that missing piece natively:
// WebView.createPrintDocumentAdapter() + PrintManager triggers the OS's own
// print pipeline (real system fonts, real rendering engine, "Save as PDF"
// printer target, built-in share icon) instead of trying to reimplement any
// of that in JS.
@CapacitorPlugin(name = "NativePrint")
public class NativePrintPlugin extends Plugin {
    @PluginMethod
    public void print(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            WebView webView = getBridge().getWebView();
            PrintManager printManager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
            String jobName = "Nirvana Quotation";
            PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(jobName);
            printManager.print(jobName, adapter, new PrintAttributes.Builder().build());
            call.resolve();
        });
    }

    // Renders the same live WebView content print() shows -- WebView's own
    // native Chromium rendering (real fonts, real Chinese-character
    // support), not a JS canvas/screenshot library -- directly into a PDF
    // file via PrintedPdfDocument, one page at a time by translating the
    // canvas down the content for each page. (WebView.createPrintDocumentAdapter()
    // would be the more "correct" API for this, but its LayoutResultCallback/
    // WriteResultCallback classes have package-private constructors that
    // only the Android print framework itself can create -- app code can't
    // drive that adapter directly outside of an actual PrintManager job,
    // which always requires the interactive dialog.) Once the file exists,
    // hands it straight to the OS share sheet (WhatsApp, email, etc.) in
    // one tap instead of Print -> Save as PDF -> find the file -> open
    // WhatsApp manually.
    @PluginMethod
    public void sharePdf(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                WebView webView = getBridge().getWebView();

                PrintAttributes attrs = new PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setResolution(new PrintAttributes.Resolution("pdf", "pdf", 300, 300))
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .build();

                PrintedPdfDocument document = new PrintedPdfDocument(getActivity(), attrs);
                int pageWidthPx = document.getPageWidth();
                int pageHeightPx = document.getPageHeight();

                int contentWidthPx = webView.getWidth();
                int contentHeightPx = (int) Math.ceil(webView.getContentHeight() * webView.getScale());
                if (contentWidthPx <= 0) contentWidthPx = 1;
                if (contentHeightPx <= 0) contentHeightPx = webView.getHeight();

                float scale = (float) pageWidthPx / (float) contentWidthPx;
                int scaledContentHeightPx = Math.round(contentHeightPx * scale);
                int pageCount = Math.max(1, (int) Math.ceil((double) scaledContentHeightPx / (double) pageHeightPx));

                for (int i = 0; i < pageCount; i++) {
                    PdfDocument.Page page = document.startPage(i);
                    Canvas canvas = page.getCanvas();
                    canvas.save();
                    canvas.scale(scale, scale);
                    canvas.translate(0, -((float) i * pageHeightPx) / scale);
                    webView.draw(canvas);
                    canvas.restore();
                    document.finishPage(page);
                }

                File pdfDir = new File(getActivity().getCacheDir(), "pdf_share");
                if (!pdfDir.exists()) pdfDir.mkdirs();
                File pdfFile = new File(pdfDir, "quotation.pdf");
                FileOutputStream out = new FileOutputStream(pdfFile);
                document.writeTo(out);
                document.close();
                out.close();

                Uri uri = FileProvider.getUriForFile(
                    getActivity(),
                    getActivity().getPackageName() + ".fileprovider",
                    pdfFile
                );
                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType("application/pdf");
                shareIntent.putExtra(Intent.EXTRA_STREAM, uri);
                shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getActivity().startActivity(Intent.createChooser(shareIntent, "Share Quotation PDF"));
                call.resolve();
            } catch (Exception e) {
                call.reject("Share PDF failed: " + e.getMessage());
            }
        });
    }
}
