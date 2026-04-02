"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentMiddleware = exports.adminMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    // Accept token from Authorization header OR ?token= query param (for window.open links)
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token)
        return res.status(401).json({ message: "No token provided" });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "secret");
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({ message: "Invalid token" });
    }
};
exports.authMiddleware = authMiddleware;
const adminMiddleware = (req, res, next) => {
    (0, exports.authMiddleware)(req, res, () => {
        if (req.user?.role !== "admin")
            return res.status(403).json({ message: "Admin access only" });
        next();
    });
};
exports.adminMiddleware = adminMiddleware;
const studentMiddleware = (req, res, next) => {
    (0, exports.authMiddleware)(req, res, () => {
        if (req.user?.role !== "student" && req.user?.role !== "admin") {
            return res.status(403).json({ message: "Student access required" });
        }
        next();
    });
};
exports.studentMiddleware = studentMiddleware;
