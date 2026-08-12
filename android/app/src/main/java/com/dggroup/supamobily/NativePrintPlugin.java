package com.dggroup.supamobily;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Capacitor's WebView has no window.print() dialog wired up, unlike a
// normal browser tab. Android exposes exactly that missing piece natively:
// WebView.createPrintDocumentAdapter() + PrintManager triggers the OS's own
// print pipeline (real system fonts, real rendering engine, correctly
// applies the app's @media print CSS to hide the topbar/tabs and show only
// the formatted quote, "Save as PDF" printer target) instead of trying to
// reimplement any of that in JS.
//
// A sharePdf() method briefly lived here that tried to render a PDF
// directly (to skip the print dialog and hand a file straight to
// WhatsApp), but WebView.draw() -- the only way to paint into a PDF
// canvas without going through the actual print pipeline above -- just
// paints whatever is currently on screen, completely ignoring @media
// print. The resulting "PDF" was a screenshot of the whole app chrome
// (topbar, tabs, debug overlay), not the quote. Removed; the flow this
// print() method drives is the one that actually renders correctly.
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
}
