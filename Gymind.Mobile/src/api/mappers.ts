import { BranchAccess } from "@/types/branch";
import { Booking, GymClass } from "@/types/class";
import { CheckInHistoryItem } from "@/types/checkIn";
import { BodyInsights } from "@/types/insights";
import { Membership, MembershipPlan } from "@/types/membership";
import { NotificationItem } from "@/types/notification";
import { PaymentItem } from "@/types/payment";
import { MemberProfile } from "@/types/profile";
import { asNumber } from "@/utils/formatNumber";

const text = (value: unknown, fallback = "") => (typeof value === "string" && value.trim() ? value : fallback);
const bool = (value: unknown, fallback = false) => (typeof value === "boolean" ? value : fallback);
const id = (value: unknown) => asNumber(value, 0);

export function mapMembership(json: any): Membership {
  const current = json?.currentMembership ?? null;
  const rawBranches = Array.isArray(current?.branches)
    ? current.branches
    : Array.isArray(json?.branchAccess)
      ? json.branchAccess
      : Array.isArray(json?.allowedBranches)
        ? json.allowedBranches
        : Array.isArray(json?.branches)
          ? json.branches
          : [];
  const branchAccess = rawBranches.map(mapMembershipBranch);
  const memberships = Array.isArray(json?.memberships) ? json.memberships.map(mapMembershipHistoryItem) : [];
  return {
    planName: text(current?.planName ?? json?.planName ?? json?.membershipPlan, "Membership"),
    status: text(current?.status ?? json?.status ?? json?.membershipStatus, "Unknown"),
    isActive: bool(current?.isActive ?? json?.isActive ?? json?.membershipActive, false),
    remainingDays: asNumber(current?.remainingDays ?? json?.remainingDays, 0),
    visitsThisMonth: asNumber(json?.visitsThisMonth, 0),
    branchAccess,
    currentMembership: current ? { ...mapMembershipHistoryItem(current), branches: branchAccess } : null,
    memberships
  };
}

function mapMembershipHistoryItem(json: any) {
  return {
    id: id(json?.id),
    planId: json?.planId === undefined || json?.planId === null ? null : id(json.planId),
    planName: text(json?.planName, "Membership"),
    status: text(json?.status, "Unknown"),
    startDate: json?.startDate ?? null,
    endDate: json?.endDate ?? null,
    remainingDays: asNumber(json?.remainingDays, 0),
    isActive: bool(json?.isActive, false),
    freezeDays: asNumber(json?.freezeDays, 0)
  };
}

function mapMembershipBranch(item: any) {
  return {
    branchId: id(item?.branchId ?? item?.id),
    branchName: text(item?.branchName ?? item?.name, "Branch"),
    address: text(item?.address),
    openTime: text(item?.openTime),
    closeTime: text(item?.closeTime),
    capacity: asNumber(item?.capacity, 0),
    currentOccupancy: asNumber(item?.currentOccupancy, 0),
    remainingSpots: asNumber(item?.remainingSpots, 0),
    capacityPercentage: asNumber(item?.capacityPercentage, 0),
    status: text(item?.status, "Unknown"),
    isOpenNow: bool(item?.isOpenNow, false),
    canCheckIn: bool(item?.canCheckIn, false)
  };
}

export function mapMembershipPlan(json: any): MembershipPlan {
  const branches = Array.isArray(json?.branches)
    ? json.branches.map((branch: any) => ({
        id: id(branch?.id ?? branch?.branchId),
        name: text(branch?.name ?? branch?.branchName, "Branch")
      }))
    : [];

  return {
    id: id(json?.id),
    gymId: json?.gymId === undefined || json?.gymId === null ? null : id(json.gymId),
    name: text(json?.name ?? json?.planName, "Membership plan"),
    price: json?.price === undefined || json?.price === null ? null : asNumber(json.price),
    durationMonth: json?.durationMonth === undefined || json?.durationMonth === null ? null : asNumber(json.durationMonth),
    durationMonths: json?.durationMonths === undefined || json?.durationMonths === null ? null : asNumber(json.durationMonths),
    accessType: json?.accessType ?? null,
    includesClasses: bool(json?.includesClasses, false),
    includesPt: bool(json?.includesPt, false),
    isActive: bool(json?.isActive, true),
    branchIds: Array.isArray(json?.branchIds) ? json.branchIds.map(id) : [],
    branches
  };
}

export function mapBranchAccess(json: any): BranchAccess {
  return {
    branchId: id(json?.branchId ?? json?.id),
    branchName: text(json?.branchName ?? json?.name, "Branch"),
    address: text(json?.address, "Address not available"),
    openTime: text(json?.openTime),
    closeTime: text(json?.closeTime),
    isOpenNow: bool(json?.isOpenNow, false),
    capacity: asNumber(json?.capacity, 0),
    currentOccupancy: asNumber(json?.currentOccupancy, 0),
    remainingSpots: asNumber(json?.remainingSpots, 0),
    capacityPercentage: asNumber(json?.capacityPercentage, 0),
    status: text(json?.status, "Unknown"),
    canCheckIn: bool(json?.canCheckIn, false),
    membershipAccess: bool(json?.membershipAccess, false),
    lat: json?.lat === undefined || json?.lat === null ? null : asNumber(json.lat),
    lng: json?.lng === undefined || json?.lng === null ? null : asNumber(json.lng)
  };
}

export function mapClass(json: any): GymClass {
  return {
    id: id(json?.id ?? json?.classId),
    classId: id(json?.classId ?? json?.id),
    bookingId: json?.bookingId === undefined ? null : id(json.bookingId),
    title: text(json?.title ?? json?.name, "Class"),
    coach: text(json?.coach ?? json?.trainerName ?? json?.trainer),
    trainerName: text(json?.trainerName ?? json?.coach),
    startAt: text(json?.startAt ?? json?.startTime),
    endAt: text(json?.endAt ?? json?.endTime),
    availableSpots: json?.availableSpots === undefined ? undefined : asNumber(json.availableSpots),
    capacity: json?.capacity === undefined ? undefined : asNumber(json.capacity),
    booked: bool(json?.booked, false),
    description: text(json?.description),
    branchId: json?.branchId === undefined ? undefined : id(json.branchId),
    branchName: text(json?.branchName)
  };
}

export function mapBooking(json: any): Booking {
  return {
    id: id(json?.bookingId ?? json?.id),
    bookingId: json?.bookingId === undefined ? id(json?.id) : id(json.bookingId),
    classId: id(json?.classId ?? json?.id),
    title: text(json?.title ?? json?.className ?? json?.name, "Booking"),
    coach: text(json?.coach ?? json?.trainerName),
    startAt: text(json?.startAt ?? json?.startTime),
    endAt: text(json?.endAt ?? json?.endTime),
    availableSpots: json?.availableSpots === undefined ? undefined : asNumber(json.availableSpots),
    capacity: json?.capacity === undefined ? undefined : asNumber(json.capacity),
    branchId: json?.branchId === undefined ? undefined : id(json.branchId),
    branchName: text(json?.branchName),
    booked: bool(json?.booked, true)
  };
}

export function mapNotification(json: any): NotificationItem {
  return {
    id: id(json?.id ?? json?.notificationId),
    title: text(json?.title, "Notification"),
    message: text(json?.message ?? json?.body),
    priority: text(json?.priority),
    createdAt: text(json?.createdAt ?? json?.sentAt),
    readAt: json?.readAt ?? null,
    isRead: bool(json?.isRead ?? json?.read, Boolean(json?.readAt))
  };
}

export function mapProfile(json: any): MemberProfile {
  return { ...json };
}

export function mapInsights(json: any): BodyInsights {
  return { ...json, missingFields: Array.isArray(json?.missingFields) ? json.missingFields.map(String) : [] };
}

export function mapHistory(json: any): CheckInHistoryItem {
  return {
    id: id(json?.id ?? json?.checkInId),
    branchName: text(json?.branchName),
    checkInTime: text(json?.checkInTime ?? json?.checkInTimeUtc ?? json?.createdAt),
    checkOutTime: json?.checkOutTime ?? json?.checkOutTimeUtc ?? null,
    method: text(json?.method)
  };
}

export function mapPayment(json: any): PaymentItem {
  return {
    id: id(json?.id ?? json?.paymentId),
    gymId: json?.gymId === undefined || json?.gymId === null ? null : id(json.gymId),
    branchId: json?.branchId === undefined || json?.branchId === null ? null : id(json.branchId),
    memberId: json?.memberId === undefined || json?.memberId === null ? null : id(json.memberId),
    membershipId: json?.membershipId === undefined || json?.membershipId === null ? null : id(json.membershipId),
    amount: json?.amount ?? json?.amountValue ?? 0,
    amountValue: json?.amountValue === undefined ? null : asNumber(json.amountValue),
    method: text(json?.method, "Payment"),
    status: text(json?.status, "Paid"),
    paidAt: json?.paidAt ?? null,
    at: json?.at ?? null,
    notes: json?.notes ?? null
  };
}
