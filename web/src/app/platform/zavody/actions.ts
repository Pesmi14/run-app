
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function adminClient() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (
    error ||
    !user ||
    !process.env.ADMIN_USER_ID ||
    user.id !== process.env.ADMIN_USER_ID
  ) {
    throw new Error("Nemáš oprávnění upravovat závody.");
  }

  return supabase;
}

function stringValue(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(form: FormData, key: string) {
  return stringValue(form, key) || null;
}

function optionalNumber(form: FormData, key: string) {
  const value = stringValue(form, key);
  if (!value) return null;

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Neplatné číslo v poli ${key}.`);
  }

  return parsed;
}

function optionalInteger(form: FormData, key: string) {
  const value = optionalNumber(form, key);

  if (value !== null && (!Number.isInteger(value) || value < 0)) {
    throw new Error(`Neplatné celé číslo v poli ${key}.`);
  }

  return value;
}

function optionalUrl(form: FormData, key: string) {
  const value = optionalString(form, key);

  if (!value) return null;

  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error();
    }

    return value;
  } catch {
    throw new Error(`Neplatná webová adresa v poli ${key}.`);
  }
}

function optionalTimestamp(form: FormData, key: string) {
  const value = optionalString(form, key);

  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Neplatné datum nebo čas v poli ${key}.`);
  }

  return date.toISOString();
}

function requireId(form: FormData, key: string) {
  const id = stringValue(form, key);

  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)) {
    throw new Error(`Neplatné ID: ${key}`);
  }

  return id;
}

export async function saveRace(form: FormData) {
  const supabase = await adminClient();
  const id = requireId(form, "id");

  const values = {
    name: optionalString(form, "name"),
    sport: optionalString(form, "sport"),
    start_date: optionalString(form, "start_date"),
    end_date: optionalString(form, "end_date"),
    city: optionalString(form, "city"),
    region: optionalString(form, "region"),
    country_code: optionalString(form, "country_code"),
    distance_text: optionalString(form, "distance_text"),
    organizer_name: optionalString(form, "organizer_name"),
    website_url: optionalUrl(form, "website_url"),
    registration_url: optionalUrl(form, "registration_url"),
    cover_image_url: optionalUrl(form, "cover_image_url"),
    cover_image_credit: optionalString(form, "cover_image_credit"),
    status: optionalString(form, "status"),
    verification_status: optionalString(form, "verification_status"),
    registration_status: optionalString(form, "registration_status"),
    registration_opens_at: optionalTimestamp(form, "registration_opens_at"),
    registration_closes_at: optionalTimestamp(form, "registration_closes_at"),
    sold_out_at: optionalTimestamp(form, "sold_out_at"),
    capacity: optionalInteger(form, "capacity"),
    registered_count: optionalInteger(form, "registered_count"),
  };

  if (!values.name) {
    throw new Error("Název závodu nesmí být prázdný.");
  }

  const { data, error } = await supabase
    .from("races")
    .update(values)
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Závod se nepodařilo uložit.");
  }

  revalidatePath("/platform/zavody");
  revalidatePath(`/platform/zavody/${id}`);
  redirect(`/platform/zavody/${id}?saved=race`);
}

export async function saveDistance(form: FormData) {
  const supabase = await adminClient();

  const raceId = requireId(form, "race_id");
  const id = requireId(form, "id");

  const { data, error } = await supabase
    .from("race_distances")
    .update({
      label: optionalString(form, "label"),
      distance_km: optionalNumber(form, "distance_km"),
      raw_text: optionalString(form, "raw_text"),
      registration_status: optionalString(form, "registration_status"),
      capacity: optionalInteger(form, "capacity"),
      registered_count: optionalInteger(form, "registered_count"),
      sold_out_at: optionalTimestamp(form, "sold_out_at"),
    })
    .eq("id", id)
    .eq("race_id", raceId)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Trasu se nepodařilo uložit.");
  }

  revalidatePath(`/platform/zavody/${raceId}`);
  redirect(`/platform/zavody/${raceId}?saved=distance`);
}

export async function savePriceTier(form: FormData) {
  const supabase = await adminClient();

  const raceId = requireId(form, "race_id");
  const id = requireId(form, "id");

  const distanceId = optionalString(form, "race_distance_id");

  if (distanceId) {
    const { data: distance, error: distanceError } = await supabase
      .from("race_distances")
      .select("id")
      .eq("id", distanceId)
      .eq("race_id", raceId)
      .single();

    if (distanceError || !distance) {
      throw new Error("Zvolená trasa nepatří k tomuto závodu.");
    }
  }

  const values = {
    race_distance_id: distanceId,
    label: optionalString(form, "label"),
    variant_label: optionalString(form, "variant_label"),
    phase_label: optionalString(form, "phase_label"),
    price: optionalNumber(form, "price"),
    currency: optionalString(form, "currency"),
    valid_from: optionalTimestamp(form, "valid_from"),
    valid_until: optionalTimestamp(form, "valid_until"),
    registration_limit: optionalInteger(form, "registration_limit"),
    note: optionalString(form, "note"),
    source_url: optionalUrl(form, "source_url"),
    sort_order: optionalInteger(form, "sort_order"),
    status: optionalString(form, "status"),
    sold_out_at: optionalTimestamp(form, "sold_out_at"),
  };

  const { data, error } = await supabase
    .from("race_price_tiers")
    .update(values)
    .eq("id", id)
    .eq("race_id", raceId)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Cenovou vlnu se nepodařilo uložit.");
  }

  revalidatePath(`/platform/zavody/${raceId}`);
  redirect(`/platform/zavody/${raceId}?saved=price`);
}
