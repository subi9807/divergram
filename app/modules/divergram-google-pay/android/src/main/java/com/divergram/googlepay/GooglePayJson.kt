package com.divergram.googlepay

import org.json.JSONArray
import org.json.JSONObject

internal fun baseCardPaymentMethod(options: Map<String, Any?>, includeTokenization: Boolean): JSONObject {
  val networks = JSONArray((options["supportedNetworks"] as? List<*>)?.map { it.toString().uppercase() } ?: emptyList<String>())
  val method = JSONObject()
    .put("type", "CARD")
    .put("parameters", JSONObject()
      .put("allowedAuthMethods", JSONArray(listOf("PAN_ONLY", "CRYPTOGRAM_3DS")))
      .put("allowedCardNetworks", networks))
  if (includeTokenization) {
    method.put("tokenizationSpecification", JSONObject()
      .put("type", "PAYMENT_GATEWAY")
      .put("parameters", JSONObject()
        .put("gateway", options["gateway"]?.toString().orEmpty())
        .put("gatewayMerchantId", options["gatewayMerchantId"]?.toString().orEmpty())))
  }
  return method
}

internal fun readyToPayJson(options: Map<String, Any?>) = JSONObject()
  .put("apiVersion", 2)
  .put("apiVersionMinor", 0)
  .put("existingPaymentMethodRequired", true)
  .put("allowedPaymentMethods", JSONArray().put(baseCardPaymentMethod(options, false)))
  .toString()

internal fun paymentDataRequestJson(options: Map<String, Any?>) = JSONObject()
  .put("apiVersion", 2)
  .put("apiVersionMinor", 0)
  .put("merchantInfo", JSONObject().apply {
    put("merchantName", options["merchantName"]?.toString().orEmpty())
    options["merchantId"]?.toString()?.takeIf { it.isNotBlank() }?.let { put("merchantId", it) }
  })
  .put("allowedPaymentMethods", JSONArray().put(baseCardPaymentMethod(options, true)))
  .put("transactionInfo", JSONObject()
    .put("totalPriceStatus", "FINAL")
    .put("totalPrice", options["amount"]?.toString().orEmpty())
    .put("currencyCode", options["currencyCode"]?.toString().orEmpty())
    .put("countryCode", options["countryCode"]?.toString().orEmpty()))
  .toString()
