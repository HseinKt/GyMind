import { MemberProfile } from "@/types/profile";
import { ProfileDashboardStats } from "@/types/profileDashboard";
import { deleteJson, getJson, postMultipart, putJson } from "./apiClient";
import { endpoints } from "./endpoints";
import { mapProfile } from "./mappers";

export async function getProfile(): Promise<MemberProfile> {
  return mapProfile(await getJson(endpoints.profile));
}

export async function getProfileDashboard(): Promise<ProfileDashboardStats> {
  return getJson<ProfileDashboardStats>(endpoints.profileDashboard);
}

export async function updateProfile(profile: MemberProfile, tab?: string): Promise<MemberProfile> {
  const url = tab ? `${endpoints.profile}?tab=${tab}` : endpoints.profile;
  return mapProfile(await putJson(url, profile));
}

export async function uploadProfilePhoto(asset: { uri: string; fileName?: string | null; mimeType?: string | null }): Promise<{ profilePhotoUrl: string | null }> {
  const data = new FormData();
  const name = asset.fileName ?? `profile-${Date.now()}.jpg`;
  data.append("file", {
    uri: asset.uri,
    name,
    type: asset.mimeType ?? "image/jpeg"
  } as unknown as Blob);
  return postMultipart<{ profilePhotoUrl: string | null }>(endpoints.profilePhoto, data);
}

export async function removeProfilePhoto(): Promise<{ profilePhotoUrl: string | null }> {
  return deleteJson<{ profilePhotoUrl: string | null }>(endpoints.profilePhoto);
}
