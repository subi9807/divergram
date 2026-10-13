package com.divergram.googlepay

import android.app.Activity
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.ResultReceiver
import com.google.android.gms.wallet.IsReadyToPayRequest
import com.google.android.gms.wallet.Wallet
import com.google.android.gms.wallet.WalletConstants
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DivergramGooglePayModule : Module() {
  private val activity: Activity
    get() = appContext.currentActivity ?: throw Exceptions.MissingActivity()

  override fun definition() = ModuleDefinition {
    Name("DivergramGooglePay")

    AsyncFunction("isAvailableAsync") { options: Map<String, Any?>, promise: Promise ->
      val environment = if (options["environment"] == "PRODUCTION") WalletConstants.ENVIRONMENT_PRODUCTION else WalletConstants.ENVIRONMENT_TEST
      val client = Wallet.getPaymentsClient(activity, Wallet.WalletOptions.Builder().setEnvironment(environment).build())
      val request = IsReadyToPayRequest.fromJson(readyToPayJson(options))
      client.isReadyToPay(request).addOnCompleteListener { task ->
        if (task.isSuccessful) promise.resolve(task.result == true) else promise.resolve(false)
      }
    }

    AsyncFunction("authorizeAsync") { options: Map<String, Any?>, promise: Promise ->
      val required = listOf("amount", "bookingId", "authorizationUrl", "authorizationToken", "idempotencyKey", "gateway", "gatewayMerchantId")
      if (required.any { options[it]?.toString().isNullOrBlank() }) {
        promise.reject("google_pay_invalid_options", "Google Pay is not fully configured.", null)
        return@AsyncFunction
      }
      val receiver = object : ResultReceiver(Handler(Looper.getMainLooper())) {
        override fun onReceiveResult(resultCode: Int, resultData: Bundle?) {
          if (resultCode == Activity.RESULT_OK) {
            promise.resolve(mapOf(
              "status" to "succeeded",
              "bookingId" to resultData?.getString("bookingId").orEmpty(),
              "paymentIntentId" to resultData?.getString("paymentIntentId").orEmpty(),
              "receiptUrl" to resultData?.getString("receiptUrl").orEmpty()
            ))
          } else {
            val code = resultData?.getString("error") ?: "google_pay_failed"
            promise.reject(code, "The booking deposit was not charged.", null)
          }
        }
      }
      val intent = Intent(activity, GooglePayActivity::class.java)
        .putExtra("options", HashMap(options))
        .putExtra("receiver", receiver)
      activity.startActivity(intent)
    }

    View(DivergramGooglePayButton::class) {
      Events("onButtonPress")
    }
  }
}

@Suppress("DEPRECATION")
internal fun Intent.resultReceiver(name: String): ResultReceiver? =
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) getParcelableExtra(name, ResultReceiver::class.java) else getParcelableExtra(name)
