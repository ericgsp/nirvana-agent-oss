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
}
