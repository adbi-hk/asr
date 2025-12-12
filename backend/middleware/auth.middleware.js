// auth.middleware.js

import jwt from "jsonwebtoken";
import { redis } from "../lib/redis.js"; // Assuming redis is imported like in your controller

export const protect = async (req, res, next) => {
    // 1. Get the access token from the cookie
    const token = req.cookies.accessToken;

    if (!token) {
        // Check for refresh token to prompt a refresh attempt on the client
        if (req.cookies.refreshToken) {
            // Token is missing, but a refresh token exists, client should call /api/auth/refreshToken
            return res.status(401).json({ 
                message: "Access token expired or missing. Please refresh.", 
                requiresRefresh: true 
            });
        }
        return res.status(401).json({ message: "Not authorized, no token" });
    }

    try {
        // 2. Verify the access token
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // 3. Attach the user ID to the request
        req.userId = decoded.userId;

        // 4. Continue to the controller function
        next();
    } catch (error) {
        console.error("Access token verification failed:", error.message);
        // Specific check for token expiration
        if (error.name === 'TokenExpiredError' && req.cookies.refreshToken) {
            return res.status(401).json({ 
                message: "Access token expired. Please refresh.", 
                requiresRefresh: true 
            });
        }
        return res.status(401).json({ message: "Not authorized, token failed" });
    }
};