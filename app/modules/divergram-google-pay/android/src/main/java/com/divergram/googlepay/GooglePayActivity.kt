package com.divergram.googlepay

import android.os.Bundle
import androidx.activity.ComponentActivity
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.wallet.PaymentData
import com.google.android.gms.wallet.PaymentDataRequest
import com.google.android.gms.wallet.Wallet
import com.google.android.gms.wallet.WalletConstants
import com.google.android.gms.wallet.contract.TaskResultContracts
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class GooglePayActivity : ComponentActivity() {
  private val receiver by lazy { intent.resultReceiver("receiver") }
  private val options by lazy {
    @Suppress("UNCHECKED_CAST", "DEPRECATION")
    (intent.getSerializableExtra("options") as? HashMap<String, Any?>) ?: hashMapOf()
  }
  private val paymentDataLauncher = registerForActivityResult(TaskResultContracts.GetPaymentDataResult()) { taskResult ->
    val paymentData: PaymentData? = taskResult.result
    if (paymentData != null) {
      val token = runCatching {
        JSONObject(paymentData.toJson()).getJSONObject("paymentMethodData").getJSONObject("tokenizationData").getString("token")
      }.getOrNull()
      if (token.isNullOrBlank()) finishWithError("google_pay_token_missing") else authorizeOnServer(token)
    } else if (taskResult.status.statusCode == CommonStatusCodes.CANCELED) {
      finishWithError("google_pay_cancelled")
    } else {
      finishWithError("google_pay_sheet_failed")
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (savedInstanceState != null) return
    val environment = if (options["environment"] == "PRODUCTION") WalletConstants.ENVIRONMENT_PRODUCTION else WalletConstants.ENVIRONMENT_TEST
    val client = Wallet.getPaymentsClient(this, Wallet.WalletOptions.Builder().setEnvironment(environment).build())
    val request = PaymentDataRequest.fromJson(paymentDataRequestJson(options))
    paymentDataLauncher.launch(client.loadPaymentData(request))
  }

  private fun authorizeOnServer(googlePayToken: String) {
    Thread {
      try {
        val body = JSONObject()
          .put("googlePayToken", googlePayToken)
          .put("idempotencyKey", options["idempotencyKey"])
          .toString()
        val connection = (URL(options["authorizationUrl"].toString()).openConnection() as HttpURLConnection).apply {
          requestMethod = "POST"
          connectTimeout = 20_000
          readTimeout = 25_000
          doOutput = true
          setRequestProperty("Content-Type", "application/json")
          setRequestProperty("Authorization", "Bearer ${options["authorizationToken"]}")
          setRequestProperty("Idempotency-Key", options["idempotencyKey"].toString())
        }
        connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
        val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
        val response = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
        val parsed = runCatching { JSONObject(response) }.getOrElse { JSONObject() }
        if (connection.responseCode in 200..299 && parsed.optString("status") == "succeeded") {
          receiver?.send(RESULT_OK, Bundle().apply {
            putString("bookingId", options["bookingId"].toString())
            putString("paymentIntentId", parsed.optString("paymentIntentId"))
            putString("receiptUrl", parsed.optString("receiptUrl"))
          })
          runOnUiThread { finish() }
        } else {
          finishWithError(parsed.optString("error", "google_pay_authorization_failed"))
        }
      } catch (_: Exception) {
        finishWithError("google_pay_network_failed")
      }
    }.start()
  }

  private fun finishWithError(code: String) {
    receiver?.send(RESULT_CANCELED, Bundle().apply { putString("error", code) })
    runOnUiThread { finish() }
  }
}
