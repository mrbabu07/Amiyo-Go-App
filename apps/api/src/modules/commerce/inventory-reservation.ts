import type { Prisma, ReservationStatus } from "@prisma/client";
import { ApiProblem } from "../../middleware/api-problem.js";

type Reservation = { id: string; variantId: string; quantity: number; status: ReservationStatus };
type PackageItem = { variantId: string; quantity: number };

async function inventoryForUpdate(transaction: Prisma.TransactionClient, reservation: Reservation) {
  await transaction.$queryRaw`SELECT id FROM inventory_items WHERE variant_id = ${reservation.variantId}::uuid FOR UPDATE`;
  const inventory = await transaction.inventoryItem.findUnique({ where: { variantId: reservation.variantId }, select: { id: true, onHand: true, reserved: true } });
  if (!inventory) throw new ApiProblem(409, "INVENTORY_RESERVATION_INCONSISTENT", "Reserved inventory is no longer available");
  return inventory;
}

export async function consumeOrderReservations(transaction: Prisma.TransactionClient, orderId: string) {
  const reservations = await transaction.inventoryReservation.findMany({ where: { orderId, status: "ACTIVE" }, select: { id: true, variantId: true, quantity: true, status: true } });
  for (const reservation of reservations) {
    if (reservation.status !== "ACTIVE" && reservation.status !== "CONSUMED") throw new ApiProblem(409, "INVENTORY_RESERVATION_CHANGED", "Inventory reservation can no longer be released");
    const inventory = await inventoryForUpdate(transaction, reservation);
    if (inventory.onHand < reservation.quantity || inventory.reserved < reservation.quantity) throw new ApiProblem(409, "INVENTORY_RESERVATION_INCONSISTENT", "Reserved stock changed before payment confirmation");
    await transaction.inventoryItem.update({ where: { id: inventory.id }, data: { onHand: { decrement: reservation.quantity }, reserved: { decrement: reservation.quantity }, version: { increment: 1 }, movements: { create: { type: "SALE", quantity: -reservation.quantity, referenceType: "order", referenceId: orderId, idempotencyKey: `reservation-consume:${reservation.id}`, metadata: { reservationId: reservation.id } } } } });
    const changed = await transaction.inventoryReservation.updateMany({ where: { id: reservation.id, status: "ACTIVE" }, data: { status: "CONSUMED" } });
    if (!changed.count) throw new ApiProblem(409, "INVENTORY_RESERVATION_CHANGED", "Inventory reservation changed during payment confirmation");
  }
  return reservations.length;
}

export async function releaseOrderReservations(transaction: Prisma.TransactionClient, orderId: string, reservations: Reservation[]) {
  for (const reservation of reservations) {
    if (reservation.status !== "ACTIVE" && reservation.status !== "CONSUMED") throw new ApiProblem(409, "INVENTORY_RESERVATION_CHANGED", "Inventory reservation can no longer be released");
    const inventory = await inventoryForUpdate(transaction, reservation);
    if (reservation.status === "ACTIVE") {
      if (inventory.reserved < reservation.quantity) throw new ApiProblem(409, "INVENTORY_RESERVATION_INCONSISTENT", "Reserved stock cannot be released safely");
      await transaction.inventoryItem.update({ where: { id: inventory.id }, data: { reserved: { decrement: reservation.quantity }, version: { increment: 1 }, movements: { create: { type: "RELEASE", quantity: reservation.quantity, referenceType: "order", referenceId: orderId, idempotencyKey: `reservation-release:${reservation.id}`, metadata: { reservationId: reservation.id, priorStatus: reservation.status } } } } });
    } else {
      await transaction.inventoryItem.update({ where: { id: inventory.id }, data: { onHand: { increment: reservation.quantity }, version: { increment: 1 }, movements: { create: { type: "RELEASE", quantity: reservation.quantity, referenceType: "order", referenceId: orderId, idempotencyKey: `reservation-release:${reservation.id}`, metadata: { reservationId: reservation.id, priorStatus: reservation.status } } } } });
    }
    const changed = await transaction.inventoryReservation.updateMany({ where: { id: reservation.id, status: reservation.status }, data: { status: "RELEASED" } });
    if (!changed.count) throw new ApiProblem(409, "INVENTORY_RESERVATION_CHANGED", "Inventory reservation changed during order cancellation");
  }
}

export async function releaseVendorOrderReservations(transaction: Prisma.TransactionClient, orderId: string, items: PackageItem[], reservations: Reservation[]) {
  const packageQuantities = new Map<string, number>();
  for (const item of items) packageQuantities.set(item.variantId, (packageQuantities.get(item.variantId) ?? 0) + item.quantity);
  const selected = reservations.filter((reservation) => packageQuantities.has(reservation.variantId));
  for (const [variantId, quantity] of packageQuantities) {
    const reserved = selected.filter((reservation) => reservation.variantId === variantId).reduce((sum, reservation) => sum + reservation.quantity, 0);
    if (reserved !== quantity) throw new ApiProblem(409, "PACKAGE_RESERVATION_INCONSISTENT", "Package inventory reservation no longer matches its ordered quantity");
  }
  await releaseOrderReservations(transaction, orderId, selected);
  return selected.length;
}
