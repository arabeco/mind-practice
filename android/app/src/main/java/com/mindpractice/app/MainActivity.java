package com.mindpractice.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.mindpractice.app.billing.StoreBillingPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Registra plugins customizados ANTES do super.onCreate
        registerPlugin(StoreBillingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
