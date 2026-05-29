package com.mindpractice.app.billing;

import androidx.annotation.NonNull;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * StoreBilling — plugin nativo Capacitor pra Google Play Billing v6+.
 *
 * Espelhado do padrão GOL 1.006 (em produção). Expõe 4 métodos pro JS:
 *   - getStatus()
 *   - getProduct({ productId, kind })
 *   - purchaseProduct({ productId, kind })
 *   - getActivePurchases()
 *
 * `kind` aceita: 'consumable' (INAPP), 'subscription' (SUBS).
 *
 * IMPORTANTE: o cliente NUNCA é autoridade. Toda compra precisa ser
 * validada server-side via Edge Function `verify-google-play-purchase`.
 * Por isso o payload retornado sempre tem `needsServerReconciliation: true`.
 */
@CapacitorPlugin(name = "StoreBilling")
public class StoreBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private BillingClient billingClient;
    private boolean isConnecting = false;
    private final List<PendingConnectionAction> pendingConnectionActions = new ArrayList<>();
    private final Map<String, ProductDetails> cachedProductDetails = new HashMap<>();
    private PluginCall pendingPurchaseCall;
    private String pendingPurchaseProductId;
    private String pendingPurchaseProductType;

    private interface ReadyAction { void run(); }
    private interface ErrorAction { void run(BillingResult result); }

    private static class PendingConnectionAction {
        private final ReadyAction onReady;
        private final ErrorAction onError;
        private PendingConnectionAction(ReadyAction onReady, ErrorAction onError) {
            this.onReady = onReady;
            this.onError = onError;
        }
    }

    @Override
    public void load() {
        super.load();
        createBillingClientIfNeeded();
        ensureConnection(null, null);
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (billingClient != null) {
            billingClient.endConnection();
            billingClient = null;
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        ensureConnection(
            () -> call.resolve(buildStatusPayload(true, null)),
            billingResult -> call.resolve(buildStatusPayload(false, billingResult))
        );
    }

    @PluginMethod
    public void getProduct(PluginCall call) {
        final String productId = safeTrim(call.getString("productId"));
        final String productType = toProductType(call.getString("kind"));

        if (productId.isEmpty()) {
            call.reject("productId obrigatorio", "PRODUCT_ID_REQUIRED");
            return;
        }
        if (productType == null) {
            call.reject("kind invalido (use consumable ou subscription)", "INVALID_PRODUCT_KIND");
            return;
        }

        ensureConnection(
            () -> querySingleProduct(productId, productType, (billingResult, productDetailsList) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    rejectWithBillingResult(call, "Falha ao consultar produto da Google Play", "PRODUCT_QUERY_FAILED", billingResult);
                    return;
                }
                if (productDetailsList == null || productDetailsList.isEmpty()) {
                    call.reject("Produto nao encontrado na Google Play", "PRODUCT_NOT_FOUND");
                    return;
                }
                ProductDetails productDetails = productDetailsList.get(0);
                cachedProductDetails.put(cacheKey(productId, productType), productDetails);

                JSObject payload = buildProductPayload(productDetails, productType);
                payload.put("available", true);
                call.resolve(payload);
            }),
            billingResult -> rejectWithBillingResult(call, "Google Play Billing indisponivel neste aparelho", "BILLING_UNAVAILABLE", billingResult)
        );
    }

    @PluginMethod
    public void purchaseProduct(PluginCall call) {
        final String productId = safeTrim(call.getString("productId"));
        final String productType = toProductType(call.getString("kind"));

        if (productId.isEmpty()) {
            call.reject("productId obrigatorio", "PRODUCT_ID_REQUIRED");
            return;
        }
        if (productType == null) {
            call.reject("kind invalido (use consumable ou subscription)", "INVALID_PRODUCT_KIND");
            return;
        }

        ensureConnection(
            () -> {
                ProductDetails cached = cachedProductDetails.get(cacheKey(productId, productType));
                if (cached != null) {
                    launchPurchaseFlow(call, cached, productType);
                    return;
                }

                querySingleProduct(productId, productType, (billingResult, productDetailsList) -> {
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        rejectWithBillingResult(call, "Falha ao consultar produto antes da compra", "PRODUCT_QUERY_FAILED", billingResult);
                        return;
                    }
                    if (productDetailsList == null || productDetailsList.isEmpty()) {
                        call.reject("Produto nao encontrado na Google Play", "PRODUCT_NOT_FOUND");
                        return;
                    }
                    ProductDetails productDetails = productDetailsList.get(0);
                    cachedProductDetails.put(cacheKey(productId, productType), productDetails);
                    launchPurchaseFlow(call, productDetails, productType);
                });
            },
            billingResult -> rejectWithBillingResult(call, "Google Play Billing indisponivel neste aparelho", "BILLING_UNAVAILABLE", billingResult)
        );
    }

    @PluginMethod
    public void getActivePurchases(PluginCall call) {
        ensureConnection(
            () -> {
                JSArray items = new JSArray();
                queryPurchases(BillingClient.ProductType.INAPP, items, () ->
                    queryPurchases(BillingClient.ProductType.SUBS, items, () -> {
                        JSObject payload = new JSObject();
                        payload.put("purchases", items);
                        call.resolve(payload);
                    })
                );
            },
            billingResult -> rejectWithBillingResult(call, "Google Play Billing indisponivel neste aparelho", "BILLING_UNAVAILABLE", billingResult)
        );
    }

    // ============================================================
    // PurchasesUpdatedListener (callback do Google após compra)
    // ============================================================
    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        if (pendingPurchaseCall == null) return;

        PluginCall purchaseCall = pendingPurchaseCall;

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            clearPendingPurchase();
            purchaseCall.reject("Compra cancelada pelo usuario", "PURCHASE_CANCELED");
            purchaseCall.release(getBridge());
            return;
        }

        if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null || purchases.isEmpty()) {
            rejectWithBillingResult(purchaseCall, "Falha ao concluir compra na Google Play", "PURCHASE_FAILED", billingResult);
            clearPendingPurchase();
            purchaseCall.release(getBridge());
            return;
        }

        Purchase selectedPurchase = findMatchingPurchase(purchases, pendingPurchaseProductId);
        if (selectedPurchase == null) selectedPurchase = purchases.get(0);
        if (selectedPurchase == null) {
            clearPendingPurchase();
            purchaseCall.reject("Compra retornou vazia", "PURCHASE_EMPTY");
            purchaseCall.release(getBridge());
            return;
        }

        // Pending (PIX, slow card etc) — devolve pra cliente saber que tem que esperar
        if (selectedPurchase.getPurchaseState() == Purchase.PurchaseState.PENDING) {
            JSObject payload = buildPurchasePayload(selectedPurchase, false, false, "pending");
            payload.put("needsServerReconciliation", true);
            payload.put("developerNote", "Compra pendente na Google Play. Aguarde a confirmacao final.");
            clearPendingPurchase();
            purchaseCall.resolve(payload);
            purchaseCall.release(getBridge());
            return;
        }

        // INAPP confirmado — server vai validar e consumir
        if (BillingClient.ProductType.INAPP.equals(pendingPurchaseProductType)) {
            JSObject payload = buildPurchasePayload(selectedPurchase, selectedPurchase.isAcknowledged(), false, "purchased");
            payload.put("needsServerReconciliation", true);
            payload.put("developerNote", "Compra confirmada na Google Play. O servidor vai validar e consumir/reconhecer.");
            clearPendingPurchase();
            purchaseCall.resolve(payload);
            purchaseCall.release(getBridge());
            return;
        }

        // SUBS confirmada — server vai validar e acknowledge
        JSObject payload = buildPurchasePayload(selectedPurchase, selectedPurchase.isAcknowledged(), false, "purchased");
        payload.put("needsServerReconciliation", true);
        payload.put("developerNote", "Assinatura confirmada na Google Play. O servidor vai validar e reconhecer.");
        clearPendingPurchase();
        purchaseCall.resolve(payload);
        purchaseCall.release(getBridge());
    }

    // ============================================================
    // Internos
    // ============================================================
    private void createBillingClientIfNeeded() {
        if (billingClient != null) return;

        billingClient = BillingClient
            .newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder()
                    .enableOneTimeProducts()
                    .build()
            )
            .build();
    }

    private void ensureConnection(ReadyAction onReady, ErrorAction onError) {
        createBillingClientIfNeeded();

        if (billingClient.isReady()) {
            if (onReady != null) onReady.run();
            return;
        }

        pendingConnectionActions.add(new PendingConnectionAction(onReady, onError));

        if (isConnecting) return;

        isConnecting = true;
        billingClient.startConnection(new BillingClientStateListenerAdapter() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                isConnecting = false;
                flushPendingConnectionActions(billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK, billingResult);
            }

            @Override
            public void onBillingServiceDisconnected() {
                isConnecting = false;
            }
        });
    }

    private void flushPendingConnectionActions(boolean success, BillingResult billingResult) {
        List<PendingConnectionAction> actions = new ArrayList<>(pendingConnectionActions);
        pendingConnectionActions.clear();

        for (PendingConnectionAction action : actions) {
            if (success) {
                if (action.onReady != null) action.onReady.run();
            } else if (action.onError != null) {
                action.onError.run(billingResult);
            }
        }
    }

    private interface ProductDetailsCallback {
        void onResult(BillingResult billingResult, List<ProductDetails> productDetailsList);
    }

    private void querySingleProduct(String productId, String productType, ProductDetailsCallback callback) {
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product
            .newBuilder()
            .setProductId(productId)
            .setProductType(productType)
            .build();

        QueryProductDetailsParams params = QueryProductDetailsParams
            .newBuilder()
            .setProductList(Collections.singletonList(product))
            .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsResult) -> {
            List<ProductDetails> list = productDetailsResult != null
                ? productDetailsResult.getProductDetailsList()
                : Collections.emptyList();
            callback.onResult(billingResult, list);
        });
    }

    private void launchPurchaseFlow(PluginCall call, ProductDetails productDetails, String productType) {
        BillingFlowParams.ProductDetailsParams.Builder productParamsBuilder = BillingFlowParams.ProductDetailsParams
            .newBuilder()
            .setProductDetails(productDetails);

        String offerToken = extractOfferToken(productDetails, productType);
        if (!offerToken.isEmpty()) {
            productParamsBuilder.setOfferToken(offerToken);
        }

        BillingFlowParams flowParams = BillingFlowParams
            .newBuilder()
            .setProductDetailsParamsList(Collections.singletonList(productParamsBuilder.build()))
            .build();

        call.setKeepAlive(true);
        saveCall(call);
        pendingPurchaseCall = call;
        pendingPurchaseProductId = productDetails.getProductId();
        pendingPurchaseProductType = productType;

        BillingResult launchResult = billingClient.launchBillingFlow(getActivity(), flowParams);
        if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            rejectWithBillingResult(call, "Nao foi possivel abrir a compra na Google Play", "PURCHASE_LAUNCH_FAILED", launchResult);
            clearPendingPurchase();
            call.release(getBridge());
        }
    }

    private void queryPurchases(String productType, JSArray sink, Runnable onComplete) {
        QueryPurchasesParams params = QueryPurchasesParams
            .newBuilder()
            .setProductType(productType)
            .build();

        billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
                for (Purchase purchase : purchases) {
                    sink.put(buildPurchasePayload(
                        purchase,
                        purchase.isAcknowledged(),
                        false,
                        purchase.getPurchaseState() == Purchase.PurchaseState.PENDING ? "pending" : "purchased"
                    ));
                }
            }
            onComplete.run();
        });
    }

    // ============================================================
    // Payload builders
    // ============================================================
    private JSObject buildStatusPayload(boolean connected, BillingResult billingResult) {
        JSObject payload = new JSObject();
        payload.put("platform", "android");
        payload.put("available", billingClient != null);
        payload.put("connected", connected && billingClient != null && billingClient.isReady());
        payload.put("canMakePayments", connected);
        payload.put("reason", billingResult != null ? billingResult.getDebugMessage() : "");
        payload.put("responseCode", billingResult != null ? billingResult.getResponseCode() : BillingClient.BillingResponseCode.OK);
        return payload;
    }

    private JSObject buildProductPayload(ProductDetails productDetails, String productType) {
        JSObject payload = new JSObject();
        payload.put("platform", "android");
        payload.put("productId", productDetails.getProductId());
        payload.put("title", productDetails.getTitle());
        payload.put("description", productDetails.getDescription());
        payload.put("formattedPrice", extractFormattedPrice(productDetails, productType));
        payload.put("offerTokenAvailable", !extractOfferToken(productDetails, productType).isEmpty());
        payload.put("type", BillingClient.ProductType.SUBS.equals(productType) ? "subscription" : "consumable");
        return payload;
    }

    private JSObject buildPurchasePayload(Purchase purchase, boolean acknowledged, boolean consumed, String purchaseState) {
        JSObject payload = new JSObject();
        payload.put("platform", "android");
        payload.put("purchaseState", purchaseState);
        payload.put("orderId", purchase.getOrderId() != null ? purchase.getOrderId() : "");
        payload.put("purchaseToken", purchase.getPurchaseToken());
        payload.put("acknowledged", acknowledged);
        payload.put("consumed", consumed);
        payload.put("packageName", purchase.getPackageName());

        JSArray products = new JSArray();
        List<String> productIds = purchase.getProducts();
        if (productIds != null) {
            for (String productId : productIds) {
                products.put(productId);
            }
        }
        payload.put("products", products);
        return payload;
    }

    private String extractFormattedPrice(ProductDetails productDetails, String productType) {
        if (BillingClient.ProductType.SUBS.equals(productType)) {
            List<ProductDetails.SubscriptionOfferDetails> offers = productDetails.getSubscriptionOfferDetails();
            if (offers != null && !offers.isEmpty()) {
                ProductDetails.SubscriptionOfferDetails offer = offers.get(0);
                if (offer.getPricingPhases() != null && offer.getPricingPhases().getPricingPhaseList() != null && !offer.getPricingPhases().getPricingPhaseList().isEmpty()) {
                    List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
                    return phases.get(phases.size() - 1).getFormattedPrice();
                }
            }
            return "";
        }

        List<ProductDetails.OneTimePurchaseOfferDetails> offers = productDetails.getOneTimePurchaseOfferDetailsList();
        if (offers != null && !offers.isEmpty()) {
            return offers.get(0).getFormattedPrice();
        }
        return "";
    }

    private String extractOfferToken(ProductDetails productDetails, String productType) {
        if (BillingClient.ProductType.SUBS.equals(productType)) {
            List<ProductDetails.SubscriptionOfferDetails> offers = productDetails.getSubscriptionOfferDetails();
            if (offers != null && !offers.isEmpty()) {
                return safeTrim(offers.get(0).getOfferToken());
            }
            return "";
        }

        List<ProductDetails.OneTimePurchaseOfferDetails> offers = productDetails.getOneTimePurchaseOfferDetailsList();
        if (offers != null && !offers.isEmpty()) {
            return safeTrim(offers.get(0).getOfferToken());
        }
        return "";
    }

    private Purchase findMatchingPurchase(List<Purchase> purchases, String productId) {
        if (productId == null || productId.isEmpty()) {
            return purchases.isEmpty() ? null : purchases.get(0);
        }
        for (Purchase purchase : purchases) {
            List<String> productIds = purchase.getProducts();
            if (productIds != null && productIds.contains(productId)) {
                return purchase;
            }
        }
        return purchases.isEmpty() ? null : purchases.get(0);
    }

    private String toProductType(String kind) {
        String normalized = safeTrim(kind).toLowerCase();
        if ("subscription".equals(normalized)) return BillingClient.ProductType.SUBS;
        if ("consumable".equals(normalized)) return BillingClient.ProductType.INAPP;
        return null;
    }

    private String cacheKey(String productId, String productType) {
        return productType + "::" + productId;
    }

    private String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private void clearPendingPurchase() {
        pendingPurchaseCall = null;
        pendingPurchaseProductId = null;
        pendingPurchaseProductType = null;
    }

    private void rejectWithBillingResult(PluginCall call, String message, String code, BillingResult billingResult) {
        JSObject data = new JSObject();
        data.put("responseCode", billingResult.getResponseCode());
        data.put("debugMessage", billingResult.getDebugMessage());
        call.reject(message, code, data);
    }

    private abstract static class BillingClientStateListenerAdapter implements com.android.billingclient.api.BillingClientStateListener {}
}
