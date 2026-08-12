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
        // NOTE: LOAD_NO_CACHE was set here temporarily while chasing a React
        // hydration race that looked like "stale content stuck across app
        // opens" -- that bug is now fixed at its actual source (agent-app.js
        // defers start() via requestIdleCallback, and the broken bfcache-
        // reload workaround was removed entirely). LOAD_NO_CACHE forced a
        // full re-download of everything (including the ~4600-line
        // agent-app.js) on every single app open, which was the biggest
        // contributor to slow startup. Back to normal WebView caching now
        // that the real bug is gone -- if stale content ever comes back,
        // it's a caching/deploy problem to fix directly, not a reason to
        // reintroduce this.
        getBridge().getWebView().getSettings().setCacheMode(WebSettings.LOAD_DEFAULT);
    }
}
