const supabase = require("../config/supabase");

// Check the token and make the user available to protected routes.
const authenticate = async (req, res, next) => {
  const authorization = req.get("authorization");
  const token =
    authorization && authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : null;

  if (!token) {
    return res.status(401).json({ error: "Authorization token is required." });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    req.user = data.user;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = authenticate;
