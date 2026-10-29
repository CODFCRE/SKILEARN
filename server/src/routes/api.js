const express = require("express");
const supabase = require("../config/supabase");
const authenticate = require("../middleware/auth");

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

module.exports = router;
