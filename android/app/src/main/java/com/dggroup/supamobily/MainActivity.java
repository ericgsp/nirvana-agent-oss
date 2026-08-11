package com.dggroup.supamobily;

import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativePrintPlugin.class);
        super.onCreate(savedInstanceState);
        // Disable the WebView's own native overscroll glow -- it competes with
        // the custom JS pull-to-refresh gesture (agent-app.js initPullToRefresh())
        // at the scroll boundary and was swallowing the drag before JS ever saw it.
        getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
    }
}
