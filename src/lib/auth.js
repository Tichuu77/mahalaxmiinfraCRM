import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectDB } from './db.js';
import User from '../models/User.js';
import Role from '../models/Role.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mahalaxmi_infra_super_secret_jwt_key_2026_plot_sales';

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export function signToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Fast in-memory cache for getAuthUser to avoid redundant MongoDB Atlas roundtrips
const authUserCache = new Map();
const AUTH_CACHE_TTL = 15000; // 15 seconds

export function clearAuthCache(userId) {
  if (userId) {
    authUserCache.delete(userId.toString());
  } else {
    authUserCache.clear();
  }
}

/**
 * Extracts authenticated user from Next.js request headers or cookies.
 * Attaches populated role. Uses 15s in-memory TTL cache to eliminate redundant Atlas lookups.
 */
export async function getAuthUser(req) {
  try {
    let token = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      // Check cookies
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) return null;

    const now = Date.now();
    const cached = authUserCache.get(decoded.userId);
    if (cached && now - cached.timestamp < AUTH_CACHE_TTL) {
      return cached.user;
    }

    await connectDB();

    const user = await User.findById(decoded.userId)
      .populate('roleId')
      .populate('reportsTo', 'name email phone roleId')
      .lean();

    if (!user || user.isDeleted || user.status !== 'active') {
      authUserCache.delete(decoded.userId);
      return null;
    }

    authUserCache.set(decoded.userId, { user, timestamp: now });
    return user;
  } catch (error) {
    console.error('[Auth] getAuthUser error:', error.message);
    return null;
  }
}

