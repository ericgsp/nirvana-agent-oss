package com.dggroup.supamobily;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
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
        // capacitor.config.ts points server.url at the live Vercel deployment
        // (this app streams /agent from the network, it doesn't run from
        // bundled local assets) -- default WebView caching was serving stale
        // HTML/JS across app launches, making new deploys invisible until the
        // cache happened to expire on its own. Force every load to hit the
        // network so a fresh deploy is always what the app shows.
        getBridge().getWebView().getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
    }
}
