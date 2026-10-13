import Foundation
import Vision
import ImageIO

guard CommandLine.arguments.count > 1 else { exit(2) }
let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { exit(3) }

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
request.recognitionLanguages = ["ko-KR", "en-US"]
let handler = VNImageRequestHandler(cgImage: image, options: [:])
try handler.perform([request])
let results = (request.results ?? []).compactMap { observation -> [String: Any]? in
  guard let candidate = observation.topCandidates(1).first else { return nil }
  let box = observation.boundingBox
  return ["text": candidate.string, "x": box.origin.x, "y": box.origin.y,
          "w": box.size.width, "h": box.size.height]
}
let data = try JSONSerialization.data(withJSONObject: results, options: [.prettyPrinted])
print(String(data: data, encoding: .utf8)!)
