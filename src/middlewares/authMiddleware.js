import jwt from "jsonwebtoken";

export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1]; // "Bearer <token>"

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token." });
    }
    req.user = decoded; // store decoded payload in request
    next();
  });
};


//TAXCRM SUTHETICATION USING JWT
export const authenticateJWTCRM = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Access denied. No token provided.",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      error: "Invalid token format.",
    });
  }

  try {
    const decoded = jwt.decode(token);

    if (!decoded) {
      return res.status(403).json({
        error: "Invalid token.",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      error: "Unable to decode token.",
    });
  }
};
