import crypto from "crypto";

function sanitizeSegment(value, fallback = "file") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
}

function makeCloudinarySignature(params, apiSecret) {
  const signable = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto.createHash("sha1").update(`${signable}${apiSecret}`).digest("hex");
}

function extractCloudinaryPublicId(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";

  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    return raw.replace(/\.[a-z0-9]+$/i, "");
  }

  try {
    const url = new URL(raw);
    const marker = "/upload/";
    const idx = url.pathname.indexOf(marker);
    if (idx < 0) return "";

    const rest = url.pathname.slice(idx + marker.length).replace(/^\/+/, "");
    const segments = rest.split("/").filter(Boolean);
    if (!segments.length) return "";

    const versionIndex = segments.findIndex((segment) => /^v\d+$/i.test(segment));
    const publicSegments = versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;
    if (!publicSegments.length) return "";

    const last = publicSegments[publicSegments.length - 1].replace(/\.[a-z0-9]+$/i, "");
    publicSegments[publicSegments.length - 1] = last;

    return decodeURIComponent(publicSegments.join("/")).trim();
  } catch {
    return "";
  }
}

function buildCloudinaryConfig() {
  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
  const uploadPreset = String(process.env.CLOUDINARY_UPLOAD_PRESET || "").trim();
  const missing = [];

  if (!cloudName) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!apiKey) missing.push("CLOUDINARY_API_KEY");
  if (!apiSecret) missing.push("CLOUDINARY_API_SECRET");

  return {
    cloudName,
    apiKey,
    apiSecret,
    uploadPreset,
    missing,
    ready: missing.length === 0,
    canUnsignedUpload: Boolean(cloudName && uploadPreset),
  };
}

export function registerMediaRoutes(app, { getAuthUserId, authRateLimit }) {
  app.post("/api/media/cloudinary/sign-upload", authRateLimit(60, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const config = buildCloudinaryConfig();
    if (!config.ready) {
      return res.status(503).json({
        error: "cloudinary_not_configured",
        required: config.missing,
        available: {
          cloudName: Boolean(config.cloudName),
          apiKey: Boolean(config.apiKey),
          apiSecret: Boolean(config.apiSecret),
          uploadPreset: Boolean(config.uploadPreset),
        },
        canUnsignedUpload: config.canUnsignedUpload,
      });
    }

    const resourceType = ["image", "video", "raw", "auto"].includes(String(req.body?.resourceType || ""))
      ? String(req.body.resourceType)
      : "image";

    const fileName = sanitizeSegment(req.body?.fileName, "media");
    const folderInput = sanitizeSegment(req.body?.folder, "divergram");
    const folder = `${folderInput}/${sanitizeSegment(userId, "user")}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `${Date.now()}-${fileName}-${Math.random().toString(36).slice(2, 8)}`;

    const paramsToSign = {
      folder,
      public_id: publicId,
      timestamp,
      upload_preset: config.uploadPreset || undefined,
    };

    const signature = makeCloudinarySignature(paramsToSign, config.apiSecret);

    return res.json({
      ok: true,
      data: {
        cloudName: config.cloudName,
        apiKey: config.apiKey,
        timestamp,
        signature,
        uploadPreset: config.uploadPreset || undefined,
        folder,
        resourceType,
        publicId,
      },
    });
  });

  app.post("/api/media/cloudinary/delete", authRateLimit(40, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const config = buildCloudinaryConfig();
    if (!config.ready) {
      return res.status(503).json({
        error: "cloudinary_not_configured",
        required: config.missing,
        available: {
          cloudName: Boolean(config.cloudName),
          apiKey: Boolean(config.apiKey),
          apiSecret: Boolean(config.apiSecret),
          uploadPreset: Boolean(config.uploadPreset),
        },
        canUnsignedUpload: config.canUnsignedUpload,
      });
    }

    const resourceType = ["image", "video", "raw"].includes(String(req.body?.resourceType || ""))
      ? String(req.body.resourceType)
      : "image";

    const incomingPublicId = String(req.body?.publicId || "").trim();
    const incomingUrl = String(req.body?.url || "").trim();
    const publicId = incomingPublicId || extractCloudinaryPublicId(incomingUrl);

    if (!publicId) {
      return res.status(400).json({ error: "public_id_required" });
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const invalidate = req.body?.invalidate === false ? "false" : "true";
      const paramsToSign = {
        public_id: publicId,
        timestamp,
        invalidate,
      };
      const signature = makeCloudinarySignature(paramsToSign, config.apiSecret);

      const endpoint = `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/destroy`;
      const payload = new URLSearchParams({
        public_id: publicId,
        timestamp: String(timestamp),
        signature,
        api_key: config.apiKey,
        invalidate,
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: payload.toString(),
      });

      const bodyText = await response.text();
      let parsed = {};
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        parsed = { raw: bodyText };
      }

      if (!response.ok) {
        return res.status(response.status).json({
          error: "cloudinary_delete_failed",
          detail: parsed,
        });
      }

      return res.json({
        ok: true,
        data: {
          publicId,
          result: String(parsed.result || "ok"),
          resourceType,
        },
      });
    } catch (error) {
      return res.status(500).json({
        error: "cloudinary_delete_failed",
        detail: String(error?.message || error),
      });
    }
  });
}
