import { Prisma, type PrismaClient } from "@prisma/client";
import type { AccountDeletionInput, AddressInput, DeviceInput, Session, UpdateProfile } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";
import { withSerializableTransaction, type TransactionClient } from "../../infrastructure/database/transaction.js";
import type { VerifiedIdentity } from "./identity.types.js";

const sessionInclude = {
  profile: true,
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
  vendorMemberships: { where: { status: "active" }, include: { permissions: true } }
} satisfies Prisma.UserInclude;

type SessionUser = Prisma.UserGetPayload<{ include: typeof sessionInclude }>;

function normalized(value: string | undefined) {
  return value?.trim().toLowerCase() || null;
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function serializeAddress(address: {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  division: string;
  district: string;
  upazila: string | null;
  unionName: string | null;
  postalCode: string | null;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...address,
    latitude: address.latitude === null ? null : address.latitude.toNumber(),
    longitude: address.longitude === null ? null : address.longitude.toNumber(),
    createdAt: address.createdAt.toISOString(),
    updatedAt: address.updatedAt.toISOString()
  };
}

function serializeDevice(device: {
  id: string;
  installationId: string;
  platform: string;
  appVersion: string | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...device,
    revokedAt: device.revokedAt?.toISOString() ?? null,
    createdAt: device.createdAt.toISOString(),
    updatedAt: device.updatedAt.toISOString()
  };
}

function profileData(input: UpdateProfile) {
  const data: Partial<{
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    locale: string;
    currency: string;
  }> = {};
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.displayName !== undefined) data.displayName = input.displayName;
  if (input.locale !== undefined) data.locale = input.locale;
  if (input.currency !== undefined) data.currency = input.currency;
  return data;
}

function addressData(input: AddressInput) {
  return {
    label: input.label,
    recipientName: input.recipientName,
    phone: input.phone,
    line1: input.line1,
    line2: input.line2 ?? null,
    division: input.division,
    district: input.district,
    upazila: input.upazila ?? null,
    unionName: input.unionName ?? null,
    postalCode: input.postalCode ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    isDefault: input.isDefault
  };
}

function toSession(user: SessionUser): Session {
  const roles = user.roles.map(({ role }) => role.name);
  const vendorMemberships = user.vendorMemberships.map((membership) => ({
    vendorId: membership.vendorId,
    role: membership.role,
    permissions: membership.permissions.filter(({ granted }) => granted).map(({ permissionKey }) => permissionKey)
  }));
  const permissions = new Set(user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key)));
  vendorMemberships.forEach((membership) => membership.permissions.forEach((permission) => permissions.add(permission)));
  const profile = user.profile;

  return {
    principal: { userId: user.id, roles, vendorIds: vendorMemberships.map(({ vendorId }) => vendorId) },
    status: user.status,
    email: user.normalizedEmail,
    phone: user.normalizedPhone,
    profile: {
      firstName: profile?.firstName ?? null,
      lastName: profile?.lastName ?? null,
      displayName: profile?.displayName ?? null,
      avatarStorageKey: profile?.avatarStorageKey ?? null,
      locale: profile?.locale ?? "en",
      currency: profile?.currency ?? "BDT"
    },
    permissions: [...permissions].sort(),
    vendorMemberships
  };
}

async function writeAudit(
  transaction: TransactionClient,
  input: { actorUserId: string; action: string; resourceType: string; resourceId: string; correlationId?: string; before?: unknown; after?: unknown }
) {
  await transaction.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      actorType: "user",
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      ...(input.before === undefined ? {} : { before: json(input.before) }),
      ...(input.after === undefined ? {} : { after: json(input.after) })
    }
  });
}

export class IdentityService {
  constructor(private readonly client: PrismaClient) {}

  async synchronizeSession(identity: VerifiedIdentity, correlationId?: string): Promise<Session> {
    return withSerializableTransaction(this.client, async (transaction) => {
      let user = await transaction.user.findUnique({ where: { providerSubject: identity.subject }, include: sessionInclude });
      if (!user) {
        const customerRole = await transaction.role.findUnique({ where: { name: "CUSTOMER" } });
        if (!customerRole) throw new ApiProblem(503, "IDENTITY_NOT_CONFIGURED", "The customer role has not been seeded");
        user = await transaction.user.create({
          data: {
            providerSubject: identity.subject,
            normalizedEmail: normalized(identity.email),
            normalizedPhone: normalized(identity.phone),
            lastLoginAt: new Date(),
            profile: { create: { ...(identity.displayName ? { displayName: identity.displayName } : {}) } },
            roles: { create: { roleId: customerRole.id } }
          },
          include: sessionInclude
        });
        await writeAudit(transaction, {
          actorUserId: user.id,
          action: "identity.user.created",
          resourceType: "user",
          resourceId: user.id,
          ...(correlationId ? { correlationId } : {}),
          after: { provider: "firebase", roles: ["CUSTOMER"] }
        });
      } else {
        user = await transaction.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            ...(!user.normalizedEmail && identity.email ? { normalizedEmail: normalized(identity.email) } : {}),
            ...(!user.normalizedPhone && identity.phone ? { normalizedPhone: normalized(identity.phone) } : {})
          },
          include: sessionInclude
        });
      }
      return toSession(user);
    });
  }

  async getSession(userId: string) {
    const user = await this.client.user.findUnique({ where: { id: userId }, include: sessionInclude });
    if (!user) throw new ApiProblem(404, "USER_NOT_FOUND", "User not found");
    return toSession(user);
  }

  async updateProfile(userId: string, input: UpdateProfile, correlationId?: string) {
    return withSerializableTransaction(this.client, async (transaction) => {
      const before = await transaction.userProfile.findUnique({ where: { userId } });
      const data = profileData(input);
      const profile = await transaction.userProfile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data
      });
      await writeAudit(transaction, {
        actorUserId: userId,
        action: "identity.profile.updated",
        resourceType: "user_profile",
        resourceId: userId,
        ...(correlationId ? { correlationId } : {}),
        before,
        after: profile
      });
      const user = await transaction.user.findUnique({ where: { id: userId }, include: sessionInclude });
      if (!user) throw new ApiProblem(404, "USER_NOT_FOUND", "User not found");
      return toSession(user);
    });
  }

  async listAddresses(userId: string) {
    const addresses = await this.client.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
    return addresses.map(serializeAddress);
  }

  async createAddress(userId: string, input: AddressInput, correlationId?: string) {
    return withSerializableTransaction(this.client, async (transaction) => {
      if (input.isDefault) await transaction.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      const address = await transaction.address.create({ data: { userId, ...addressData(input) } });
      await writeAudit(transaction, {
        actorUserId: userId,
        action: "identity.address.created",
        resourceType: "address",
        resourceId: address.id,
        ...(correlationId ? { correlationId } : {}),
        after: address
      });
      return serializeAddress(address);
    });
  }

  async updateAddress(userId: string, addressId: string, input: AddressInput, correlationId?: string) {
    return withSerializableTransaction(this.client, async (transaction) => {
      const before = await transaction.address.findFirst({ where: { id: addressId, userId } });
      if (!before) throw new ApiProblem(404, "ADDRESS_NOT_FOUND", "Address not found");
      if (input.isDefault) await transaction.address.updateMany({ where: { userId, isDefault: true, id: { not: addressId } }, data: { isDefault: false } });
      const address = await transaction.address.update({ where: { id: addressId }, data: addressData(input) });
      await writeAudit(transaction, {
        actorUserId: userId,
        action: "identity.address.updated",
        resourceType: "address",
        resourceId: addressId,
        ...(correlationId ? { correlationId } : {}),
        before,
        after: address
      });
      return serializeAddress(address);
    });
  }

  async deleteAddress(userId: string, addressId: string, correlationId?: string) {
    return withSerializableTransaction(this.client, async (transaction) => {
      const before = await transaction.address.findFirst({ where: { id: addressId, userId } });
      if (!before) throw new ApiProblem(404, "ADDRESS_NOT_FOUND", "Address not found");
      await transaction.address.delete({ where: { id: addressId } });
      await writeAudit(transaction, {
        actorUserId: userId,
        action: "identity.address.deleted",
        resourceType: "address",
        resourceId: addressId,
        ...(correlationId ? { correlationId } : {}),
        before
      });
    });
  }

  async listDevices(userId: string) {
    const devices = await this.client.device.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
    return devices.map(serializeDevice);
  }

  async registerDevice(userId: string, input: DeviceInput, correlationId?: string) {
    return withSerializableTransaction(this.client, async (transaction) => {
      const existing = await transaction.device.findUnique({ where: { installationId: input.installationId } });
      if (existing && existing.userId !== userId) throw new ApiProblem(409, "DEVICE_ALREADY_REGISTERED", "This installation belongs to another account");
      const device = existing
        ? await transaction.device.update({ where: { id: existing.id }, data: { platform: input.platform, appVersion: input.appVersion ?? null, revokedAt: null } })
        : await transaction.device.create({ data: { userId, installationId: input.installationId, platform: input.platform, appVersion: input.appVersion ?? null } });
      if (input.pushToken && input.pushProvider) {
        const token = await transaction.pushToken.findUnique({ where: { token: input.pushToken } });
        if (token && token.userId !== userId) throw new ApiProblem(409, "PUSH_TOKEN_ALREADY_REGISTERED", "This push token belongs to another account");
        await transaction.pushToken.upsert({
          where: { token: input.pushToken },
          create: { userId, deviceId: device.id, token: input.pushToken, provider: input.pushProvider },
          update: { deviceId: device.id, provider: input.pushProvider, revokedAt: null }
        });
      }
      await writeAudit(transaction, {
        actorUserId: userId,
        action: "identity.device.registered",
        resourceType: "device",
        resourceId: device.id,
        ...(correlationId ? { correlationId } : {}),
        after: { platform: device.platform, appVersion: device.appVersion }
      });
      return serializeDevice(device);
    });
  }

  async revokeDevice(userId: string, deviceId: string, correlationId?: string) {
    return withSerializableTransaction(this.client, async (transaction) => {
      const device = await transaction.device.findFirst({ where: { id: deviceId, userId } });
      if (!device) throw new ApiProblem(404, "DEVICE_NOT_FOUND", "Device not found");
      const revokedAt = new Date();
      const updated = await transaction.device.update({ where: { id: deviceId }, data: { revokedAt } });
      await transaction.pushToken.updateMany({ where: { deviceId, revokedAt: null }, data: { revokedAt } });
      await writeAudit(transaction, {
        actorUserId: userId,
        action: "identity.device.revoked",
        resourceType: "device",
        resourceId: deviceId,
        ...(correlationId ? { correlationId } : {}),
        before: device,
        after: updated
      });
      return serializeDevice(updated);
    });
  }

  async getDeletionRequest(userId: string) {
    const row = await this.client.accountDeletionRequest.findFirst({ where: { userId, status: { in: ["requested", "scheduled"] } }, orderBy: { requestedAt: "desc" } });
    return row ? { ...row, requestedAt: row.requestedAt.toISOString(), executeAfter: row.executeAfter.toISOString(), completedAt: row.completedAt?.toISOString() ?? null } : null;
  }

  async requestDeletion(userId: string, input: AccountDeletionInput, correlationId?: string) {
    const existing = await this.client.accountDeletionRequest.findFirst({ where: { userId, status: { in: ["requested", "scheduled"] } } });
    if (existing) return { ...existing, requestedAt: existing.requestedAt.toISOString(), executeAfter: existing.executeAfter.toISOString(), completedAt: existing.completedAt?.toISOString() ?? null };
    const executeAfter = new Date(Date.now() + 30 * 24 * 60 * 60_000);
    const row = await withSerializableTransaction(this.client, async (transaction) => {
      const created = await transaction.accountDeletionRequest.create({ data: { userId, reason: input.reason ?? null, executeAfter } });
      await writeAudit(transaction, { actorUserId: userId, action: "identity.deletion.requested", resourceType: "user", resourceId: userId, ...(correlationId ? { correlationId } : {}), after: { executeAfter: executeAfter.toISOString() } });
      return created;
    });
    return { ...row, requestedAt: row.requestedAt.toISOString(), executeAfter: row.executeAfter.toISOString(), completedAt: row.completedAt?.toISOString() ?? null };
  }

  async cancelDeletion(userId: string, correlationId?: string) {
    const row = await withSerializableTransaction(this.client, async (transaction) => {
      const existing = await transaction.accountDeletionRequest.findFirst({ where: { userId, status: { in: ["requested", "scheduled"] } }, orderBy: { requestedAt: "desc" } });
      if (!existing) throw new ApiProblem(404, "ACCOUNT_DELETION_REQUEST_NOT_FOUND", "No active account deletion request was found");
      if (existing.executeAfter <= new Date()) throw new ApiProblem(409, "ACCOUNT_DELETION_RECOVERY_EXPIRED", "The account deletion recovery window has expired");
      const cancelled = await transaction.accountDeletionRequest.update({ where: { id: existing.id }, data: { status: "cancelled" } });
      await writeAudit(transaction, { actorUserId: userId, action: "identity.deletion.cancelled", resourceType: "user", resourceId: userId, ...(correlationId ? { correlationId } : {}), before: { status: existing.status, executeAfter: existing.executeAfter.toISOString() }, after: { status: cancelled.status } });
      return cancelled;
    });
    return { ...row, requestedAt: row.requestedAt.toISOString(), executeAfter: row.executeAfter.toISOString(), completedAt: row.completedAt?.toISOString() ?? null };
  }
  async exportAccount(userId: string) {
    const user = await this.client.user.findUnique({ where: { id: userId }, include: { profile: true, addresses: true, orders: { orderBy: { createdAt: "desc" }, take: 500 }, returnRequests: { orderBy: { createdAt: "desc" }, take: 500 }, reviews: { orderBy: { createdAt: "desc" }, take: 500 }, supportTickets: { include: { messages: true }, orderBy: { createdAt: "desc" }, take: 500 } } });
    if (!user) throw new ApiProblem(404, "USER_NOT_FOUND", "User not found");
    return { generatedAt: new Date().toISOString(), profile: { id: user.id, email: user.normalizedEmail, phone: user.normalizedPhone, status: user.status, ...user.profile }, addresses: user.addresses, orders: user.orders.map((order) => ({ ...order, subtotalMinor: order.subtotalMinor.toString(), discountMinor: order.discountMinor.toString(), deliveryMinor: order.deliveryMinor.toString(), taxMinor: order.taxMinor.toString(), totalMinor: order.totalMinor.toString() })), returns: user.returnRequests.map((item) => ({ ...item, requestedMinor: item.requestedMinor.toString(), approvedMinor: item.approvedMinor?.toString() ?? null })), reviews: user.reviews, supportTickets: user.supportTickets };
  }
}
