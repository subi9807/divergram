package com.divergram.googlepay

import android.content.Context
import com.google.android.gms.wallet.button.ButtonConstants
import com.google.android.gms.wallet.button.ButtonOptions
import com.google.android.gms.wallet.button.PayButton
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

class DivergramGooglePayButton(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onButtonPress by EventDispatcher()
  private val button = PayButton(context)

  init {
    button.initialize(ButtonOptions.newBuilder()
      .setButtonTheme(ButtonConstants.ButtonTheme.DARK)
      .setButtonType(ButtonConstants.ButtonType.PLAIN)
      .setCornerRadius(12)
      .build())
    button.setOnClickListener { onButtonPress(emptyMap<String, Any>()) }
    addView(button, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }
}
