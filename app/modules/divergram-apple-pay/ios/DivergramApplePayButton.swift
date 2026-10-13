import ExpoModulesCore
import PassKit

public final class DivergramApplePayButton: ExpoView {
  let onButtonPress = EventDispatcher()
  private let paymentButton = PKPaymentButton(paymentButtonType: .plain, paymentButtonStyle: .black)

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    paymentButton.translatesAutoresizingMaskIntoConstraints = false
    paymentButton.addTarget(self, action: #selector(onTouchUp), for: .touchUpInside)
    addSubview(paymentButton)
    NSLayoutConstraint.activate([
      paymentButton.topAnchor.constraint(equalTo: topAnchor),
      paymentButton.bottomAnchor.constraint(equalTo: bottomAnchor),
      paymentButton.leadingAnchor.constraint(equalTo: leadingAnchor),
      paymentButton.trailingAnchor.constraint(equalTo: trailingAnchor)
    ])
  }

  @objc
  private func onTouchUp() {
    onButtonPress()
  }
}
