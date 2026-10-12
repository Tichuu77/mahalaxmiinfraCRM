import mongoose from 'mongoose';
import User from '../models/User.js';
import Role from '../models/Role.js';

/**
 * Traverses all downline users recursively for a given user.
 * Returns an array of User ObjectIds (excluding the root user themselves).
 */
export async function getDownlineUserIds(userId) {
  const objectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

  // Use MongoDB $graphLookup for high-performance recursive traversal of unlimited depth
  const result = await User.aggregate([
    { $match: { _id: objectId } },
    {
      $graphLookup: {
        from: 'users',
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'reportsTo',
        as: 'downline',
        restrictSearchWithMatch: { isDeleted: false },
      },
    },
    {
      $project: {
        downlineIds: '$downline._id',
      },
    },
  ]);

  if (!result || result.length === 0 || !result[0].downlineIds) {
    return [];
  }

  return result[0].downlineIds;
}

/**
 * Returns an array of user IDs representing the user and all their downline users.
 * If user is Admin (rank 0 or isRoot), returns null to indicate "unrestricted / all".
 */
export async function getScopedUserIds(user) {
  if (user.roleId?.isRoot || user.roleId?.rank === 0) {
    return null; // Admin has global access to all downline
  }

  const downlineIds = await getDownlineUserIds(user._id);
  return [user._id, ...downlineIds];
}

/**
 * Builds a query filter for models that are downline-scoped (Customers, Bookings, Registries, etc.)
 * @param {Object} user - The authenticated user with populated roleId
 * @param {String} userField - The field name referencing the user (e.g. 'createdBy' or 'sellerId')
 */
export async function buildDownlineFilter(user, userField = 'createdBy') {
  if (user.roleId?.isRoot || user.roleId?.rank === 0) {
    return {}; // No filter for Admin
  }

  const scopedIds = await getScopedUserIds(user);
  return { [userField]: { $in: scopedIds } };
}

/**
 * Walks "reportsTo" upward from a starting user to Admin (Rank 0).
 * Returns array of populated ancestor User objects in order: [immediateManager, grandManager, ..., Admin].
 */
export async function getUplineChain(userId) {
  const upline = [];
  const visited = new Set();
  visited.add(userId.toString());

  let currentUser = await User.findById(userId).populate('roleId').lean();
  if (!currentUser || !currentUser.reportsTo) return upline;

  while (currentUser && currentUser.reportsTo) {
    const managerId = currentUser.reportsTo._id || currentUser.reportsTo;
    const managerIdStr = managerId.toString();

    if (visited.has(managerIdStr)) {
      console.warn('[Hierarchy] Detected circular reportsTo reference for user:', managerIdStr);
      break;
    }
    visited.add(managerIdStr);

    const manager = await User.findById(managerId).populate('roleId').lean();
    if (!manager) break;

    upline.push(manager);
    if (manager.roleId?.isRoot || manager.roleId?.rank === 0) {
      break; // Reached Admin
    }
    currentUser = manager;
  }

  return upline;
}

/**
 * Checks if targetUserId is within currentUserId's downline.
 */
export async function isUserInDownline(currentUserId, targetUserId) {
  const downlineIds = await getDownlineUserIds(currentUserId);
  const targetStr = targetUserId.toString();
  return downlineIds.some((id) => id.toString() === targetStr);
}

/**
 * Validates whether actingUser has authority to manage/create a user with targetRole at reportsTo.
 */
export function validateHierarchyCreation(actingUser, targetRole, reportsToUser) {
  const actingRank = actingUser.roleId?.rank ?? 999;
  const targetRank = targetRole.rank ?? 999;

  // Rule: Can only create at a rank below their own (lower authority = higher rank number)
  if (!actingUser.roleId?.isRoot && targetRank <= actingRank) {
    return {
      allowed: false,
      error: `You cannot create or assign the role "${targetRole.name}". You can only assign roles subordinate to your own in the hierarchy.`,
    };
  }

  return { allowed: true };
}
