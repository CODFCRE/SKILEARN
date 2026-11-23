const express = require("express");
const supabase = require("../config/supabase");
const authenticate = require("../middleware/auth");
const webPush = require("web-push");

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@skilearn.app";

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

const router = express.Router();

router.get("/health", async (req, res, next) => {
  try {
    const { error } = await supabase.from("items").select("id").limit(1);

    if (error) {
      return res.status(503).json({
        error: "Supabase connection failed.",
        supabase: "disconnected",
      });
    }

    return res.json({
      message: "API and Supabase are healthy.",
      supabase: "connected",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/items", authenticate, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", req.user.id);

    if (error) {
      return next(error);
    }

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

router.get("/files/*path", authenticate, async (req, res, next) => {
  try {
    const storagePath = Array.isArray(req.params.path)
      ? req.params.path.join("/")
      : req.params.path;
    const { data, error } = await supabase.storage
      .from("files")
      .download(storagePath);

    if (error) {
      return next(error);
    }

    if (!data) {
      return res.status(404).json({ error: "File not found." });
    }

    const fileBuffer = Buffer.from(await data.arrayBuffer());
    res.attachment(storagePath.split("/").pop() || "download");
    return res.send(fileBuffer);
  } catch (error) {
    return next(error);
  }
});

router.post("/notifications/send", authenticate, async (req, res, next) => {
  try {
    const { recipientId, type, title, body, route, data = {} } = req.body || {};
    if (!recipientId || !title) {
      return res.status(400).json({ error: "recipientId and title are required." });
    }
    if (recipientId === req.user.id) {
      return res.status(400).json({ error: "You cannot send a push notification to yourself." });
    }
    if (!supabase.admin) {
      return res.status(503).json({
        error: "SUPABASE_SERVICE_ROLE_KEY is required on the server.",
      });
    }

    const { data: devices, error } = await supabase.admin
      .from("push_devices")
      .select("id,platform,token,subscription")
      .eq("user_id", recipientId);
    if (error) throw error;

    const expoMessages = (devices || [])
      .filter((device) => device.platform === "expo")
      .map((device) => ({
        to: device.token,
        title,
        body,
        sound: type === "call" ? "default" : "default",
        priority: "high",
        channelId: type === "call" ? "incoming-calls" : "skilearn-notifications",
        categoryId: type === "call" ? "incoming-call" : "skilearn-update",
        data: { type, route: route || "/", ...data },
      }));

    if (expoMessages.length) {
      const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(expoMessages),
      });
      if (!expoResponse.ok) {
        throw new Error(`Expo Push rejected the request: ${expoResponse.status}`);
      }
    }

    if (vapidPublicKey && vapidPrivateKey) {
      await Promise.all((devices || [])
        .filter((device) => device.platform === "web" && device.subscription)
        .map(async (device) => {
          try {
            await webPush.sendNotification(device.subscription, JSON.stringify({
              title,
              body,
              route: route || "/",
              type,
              tag: type === "call" ? `call-${data.callId || "incoming"}` : `message-${data.threadId || "update"}`,
            }));
          } catch (pushError) {
            if (pushError.statusCode === 404 || pushError.statusCode === 410) {
              await supabase.admin.from("push_devices").delete().eq("id", device.id);
            } else {
              console.warn("Unable to send browser push notification:", pushError);
            }
          }
        }));
    }

    return res.json({ sent: expoMessages.length, devices: devices?.length || 0 });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
