import ExpoModulesCore
import Foundation
import PassKit

private func paymentNetworks(_ values: [String]) -> [PKPaymentNetwork] {
  values.compactMap { value in
    switch value.lowercased() {
    case "visa": return .visa
    case "mastercard", "master_card": return .masterCard
    case "amex", "americanexpress": return .amex
    case "discover": return .discover
    case "jcb": return .JCB
    case "mada":
      if #available(iOS 12.1.1, *) { return .mada }
      return nil
    default: return nil
    }
  }
}

private final class ApplePayAuthorizationDelegate: NSObject, PKPaymentAuthorizationControllerDelegate {
  private let promise: Promise
  private let authorizationURL: URL
  private let authorizationToken: String
  private let bookingId: String
  private let idempotencyKey: String
  private var settled = false
  var onFinish: (() -> Void)?

  init(promise: Promise, authorizationURL: URL, authorizationToken: String, bookingId: String, idempotencyKey: String) {
    self.promise = promise
    self.authorizationURL = authorizationURL
    self.authorizationToken = authorizationToken
    self.bookingId = bookingId
    self.idempotencyKey = idempotencyKey
  }

  func paymentAuthorizationController(
    _ controller: PKPaymentAuthorizationController,
    didAuthorizePayment payment: PKPayment,
    handler completion: @escaping (PKPaymentAuthorizationResult) -> Void
  ) {
    let token = payment.token.paymentData.base64EncodedString()
    let payload: [String: Any] = [
      "applePayToken": token,
      "transactionIdentifier": payment.token.transactionIdentifier,
      "idempotencyKey": idempotencyKey
    ]
    guard let body = try? JSONSerialization.data(withJSONObject: payload) else {
      completion(PKPaymentAuthorizationResult(status: .failure, errors: nil))
      finishWithError(code: "apple_pay_payload_failed", message: "Could not encode the Apple Pay authorization payload.")
      return
    }

    var request = URLRequest(url: authorizationURL)
    request.httpMethod = "POST"
    request.httpBody = body
    request.timeoutInterval = 25
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("Bearer \(authorizationToken)", forHTTPHeaderField: "Authorization")
    request.setValue(idempotencyKey, forHTTPHeaderField: "Idempotency-Key")

    URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
      DispatchQueue.main.async {
        guard let self else { return }
        let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
        let responseBody = data.flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any]
        if error == nil, (200..<300).contains(statusCode), responseBody?["status"] as? String == "succeeded" {
          completion(PKPaymentAuthorizationResult(status: .success, errors: nil))
          self.settled = true
          self.promise.resolve([
            "status": "succeeded",
            "bookingId": self.bookingId,
            "paymentIntentId": responseBody?["paymentIntentId"] as? String ?? "",
            "receiptUrl": responseBody?["receiptUrl"] as? String ?? ""
          ])
        } else {
          completion(PKPaymentAuthorizationResult(status: .failure, errors: nil))
          let code = responseBody?["error"] as? String ?? (error == nil ? "apple_pay_authorization_failed" : "apple_pay_network_failed")
          self.finishWithError(code: code, message: "The booking deposit was not charged.")
        }
      }
    }.resume()
  }

  func paymentAuthorizationControllerDidFinish(_ controller: PKPaymentAuthorizationController) {
    controller.dismiss {
      if !self.settled {
        self.finishWithError(code: "apple_pay_cancelled", message: "Apple Pay was cancelled.")
      }
      self.onFinish?()
    }
  }

  private func finishWithError(code: String, message: String) {
    guard !settled else { return }
    settled = true
    promise.reject(code, message)
  }
}

public final class DivergramApplePayModule: Module {
  private var authorizationDelegate: ApplePayAuthorizationDelegate?

  public func definition() -> ModuleDefinition {
    Name("DivergramApplePay")

    AsyncFunction("isAvailableAsync") { (networks: [String]) -> Bool in
      PKPaymentAuthorizationController.canMakePayments(usingNetworks: paymentNetworks(networks))
    }

    AsyncFunction("authorizeAsync") { (options: [String: Any], promise: Promise) in
      guard self.authorizationDelegate == nil else {
        promise.reject("apple_pay_in_progress", "Another Apple Pay authorization is already in progress.")
        return
      }
      guard
        let merchantIdentifier = options["merchantIdentifier"] as? String,
        let countryCode = options["countryCode"] as? String,
        let currencyCode = options["currencyCode"] as? String,
        let amountText = options["amount"] as? String,
        let amount = Decimal(string: amountText, locale: Locale(identifier: "en_US_POSIX")), amount > 0,
        let label = options["label"] as? String,
        let bookingId = options["bookingId"] as? String,
        let authorizationUrlText = options["authorizationUrl"] as? String,
        let authorizationURL = URL(string: authorizationUrlText), authorizationURL.scheme == "https",
        let authorizationToken = options["authorizationToken"] as? String, !authorizationToken.isEmpty,
        let idempotencyKey = options["idempotencyKey"] as? String,
        let networkNames = options["supportedNetworks"] as? [String]
      else {
        promise.reject("invalid_apple_pay_options", "Apple Pay configuration is incomplete.")
        return
      }

      let networks = paymentNetworks(networkNames)
      guard !networks.isEmpty, PKPaymentAuthorizationController.canMakePayments(usingNetworks: networks) else {
        promise.reject("apple_pay_unavailable", "Apple Pay is not available for the configured card networks.")
        return
      }

      let request = PKPaymentRequest()
      request.merchantIdentifier = merchantIdentifier
      request.countryCode = countryCode
      request.currencyCode = currencyCode
      request.supportedNetworks = networks
      request.merchantCapabilities = [.capability3DS]
      request.paymentSummaryItems = [PKPaymentSummaryItem(label: label, amount: NSDecimalNumber(decimal: amount))]

      let controller = PKPaymentAuthorizationController(paymentRequest: request)
      let delegate = ApplePayAuthorizationDelegate(
        promise: promise,
        authorizationURL: authorizationURL,
        authorizationToken: authorizationToken,
        bookingId: bookingId,
        idempotencyKey: idempotencyKey
      )
      delegate.onFinish = { [weak self] in self?.authorizationDelegate = nil }
      self.authorizationDelegate = delegate
      controller.delegate = delegate
      controller.present { presented in
        if !presented {
          self.authorizationDelegate = nil
          promise.reject("apple_pay_present_failed", "Could not present Apple Pay.")
        }
      }
    }.runOnQueue(.main)

    View(DivergramApplePayButton.self) {
      Events("onButtonPress")
    }
  }
}
