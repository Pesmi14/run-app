
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  saveRace,
  saveDistance,
  savePriceTier,
} from "../actions";

type RowData = Record<string, unknown>;

type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "url";
  step?: string;
};

const raceFields: Field[] = [
  { key: "name", label: "Název závodu" },
  { key: "sport", label: "Sport" },
  { key: "start_date", label: "Datum začátku", type: "date" },
  { key: "end_date", label: "Datum konce", type: "date" },
  { key: "city", label: "Město" },
  { key: "region", label: "Region" },
  { key: "country_code", label: "Kód země" },
  { key: "distance_text", label: "Text vzdáleností" },
  { key: "organizer_name", label: "Pořadatel" },
  { key: "website_url", label: "Web závodu", type: "url" },
  {
    key: "registration_url",
    label: "Odkaz na registraci",
    type: "url",
  },
  {
    key: "cover_image_url",
    label: "URL obrázku",
    type: "url",
  },
  { key: "cover_image_credit", label: "Autor obrázku" },
  { key: "status", label: "Stav závodu" },
  { key: "verification_status", label: "Stav ověření" },
  { key: "registration_status", label: "Stav registrací" },
  {
    key: "registration_opens_at",
    label: "Otevření registrací (ISO datum a čas)",
  },
  {
    key: "registration_closes_at",
    label: "Uzavření registrací (ISO datum a čas)",
  },
  { key: "sold_out_at", label: "Vyprodáno od (ISO datum a čas)" },
  { key: "capacity", label: "Kapacita", type: "number", step: "1" },
  {
    key: "registered_count",
    label: "Počet registrovaných",
    type: "number",
    step: "1",
  },
];

const distanceFields: Field[] = [
  { key: "label", label: "Název trasy" },
  {
    key: "distance_km",
    label: "Délka (km)",
    type: "number",
    step: "any",
  },
  { key: "raw_text", label: "Původní text trasy" },
  { key: "registration_status", label: "Stav registrací" },
  { key: "capacity", label: "Kapacita", type: "number", step: "1" },
  {
    key: "registered_count",
    label: "Registrovaných",
    type: "number",
    step: "1",
  },
  { key: "sold_out_at", label: "Vyprodáno od (ISO datum a čas)" },
];

const priceFields: Field[] = [
  { key: "label", label: "Název cenové vlny" },
  { key: "variant_label", label: "Varianta" },
  { key: "phase_label", label: "Fáze registrace" },
  { key: "price", label: "Cena", type: "number", step: "any" },
  { key: "currency", label: "Měna" },
  { key: "valid_from", label: "Platí od (ISO datum a čas)" },
  { key: "valid_until", label: "Platí do (ISO datum a čas)" },
  {
    key: "registration_limit",
    label: "Limit registrací",
    type: "number",
    step: "1",
  },
  { key: "note", label: "Poznámka" },
  { key: "source_url", label: "Zdroj ceny", type: "url" },
  {
    key: "sort_order",
    label: "Pořadí",
    type: "number",
    step: "1",
  },
  { key: "status", label: "Stav cenové vlny" },
  { key: "sold_out_at", label: "Vyprodáno od (ISO datum a čas)" },
];

function valueToString(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function Fields({
  record,
  fields,
}: {
  record: RowData;
  fields: Field[];
}) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {fields.map((field) => (
        <label key={field.key} className="block min-w-0">
          <span className="mb-2 block text-xs font-semibold text-gray-600">
            {field.label}
          </span>

          <input
            name={field.key}
            type={field.type ?? "text"}
            step={field.step}
            defaultValue={valueToString(record[field.key])}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition-colors focus:border-gray-600"
          />
        </label>
      ))}
    </div>
  );
}

function SaveButton() {
  return (
    <button
      type="submit"
      className="inline-flex items-center gap-2 rounded-lg bg-[#171717] px-5 py-3 text-xs font-semibold text-white hover:bg-gray-800"
    >
      <Save size={15} />
      Uložit změny
    </button>
  );
}

export default async function RaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (
    authError ||
    !user ||
    !process.env.ADMIN_USER_ID ||
    user.id !== process.env.ADMIN_USER_ID
  ) {
    redirect("/");
  }

  const [
    raceResult,
    distancesResult,
    pricesResult,
  ] = await Promise.all([
    supabase.from("races").select("*").eq("id", id).maybeSingle(),

    supabase
      .from("race_distances")
      .select("*")
      .eq("race_id", id)
      .order("created_at", { ascending: true }),

    supabase
      .from("race_price_tiers")
      .select("*")
      .eq("race_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  if (raceResult.error) {
    throw new Error(raceResult.error.message);
  }

  if (distancesResult.error) {
    throw new Error(distancesResult.error.message);
  }

  if (pricesResult.error) {
    throw new Error(pricesResult.error.message);
  }

  if (!raceResult.data) notFound();

  const race = raceResult.data as RowData;
  const distances = (distancesResult.data ?? []) as RowData[];
  const prices = (pricesResult.data ?? []) as RowData[];

  return (
    <main className="min-h-screen bg-[#fafafa] px-5 py-10 text-[#171717] md:px-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/platform/zavody"
          className="mb-10 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black"
        >
          <ArrowLeft size={16} />
          Všechny závody
        </Link>

        <div className="mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            SPRINTUY / ZÁVODY / EDITACE
          </p>

          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {valueToString(race.name) || "Nepojmenovaný závod"}
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            {valueToString(race.city)} · {valueToString(race.start_date)}
          </p>
        </div>

        {saved && (
          <div
            role="status"
            className="mb-8 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800"
          >
            Změny byly uloženy do Supabase.
          </div>
        )}

        <div className="space-y-8">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
            <div className="mb-7">
              <h2 className="text-xl font-bold">Informace o závodu</h2>
              <p className="mt-2 text-sm text-gray-500">
                Základní údaje, termín, místo, odkazy a registrace.
              </p>
            </div>

            <form action={saveRace}>
              <input
                type="hidden"
                name="id"
                value={id}
              />

              <Fields record={race} fields={raceFields} />

              <div className="mt-7 flex justify-end">
                <SaveButton />
              </div>
            </form>
          </section>

          <section>
            <div className="mb-6">
              <h2 className="text-xl font-bold">
                Trasy a vzdálenosti
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {distances.length} tras u tohoto závodu
              </p>
            </div>

            <div className="space-y-5">
              {distances.map((distance, index) => (
                <div
                  key={String(distance.id)}
                  className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8"
                >
                  <h3 className="mb-6 text-base font-bold">
                    {valueToString(distance.label) ||
                      `Trasa ${index + 1}`}
                  </h3>

                  <form action={saveDistance}>
                    <input
                      type="hidden"
                      name="id"
                      value={String(distance.id)}
                    />
                    <input
                      type="hidden"
                      name="race_id"
                      value={id}
                    />

                    <Fields
                      record={distance}
                      fields={distanceFields}
                    />

                    <div className="mt-6 flex justify-end">
                      <SaveButton />
                    </div>
                  </form>
                </div>
              ))}

              {distances.length === 0 && (
                <p className="rounded-xl border bg-white p-6 text-sm text-gray-500">
                  Tento závod zatím nemá evidované samostatné trasy.
                </p>
              )}
            </div>
          </section>

          <section>
            <div className="mb-6">
              <h2 className="text-xl font-bold">
                Startovné a cenové vlny
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {prices.length} cenových záznamů
              </p>
            </div>

            <div className="space-y-5">
              {prices.map((price, index) => (
                <div
                  key={String(price.id)}
                  className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8"
                >
                  <h3 className="mb-6 text-base font-bold">
                    {valueToString(price.label) ||
                      `Cenová vlna ${index + 1}`}
                  </h3>

                  <form action={savePriceTier}>
                    <input
                      type="hidden"
                      name="id"
                      value={String(price.id)}
                    />
                    <input
                      type="hidden"
                      name="race_id"
                      value={id}
                    />

                    <div className="mb-5">
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold text-gray-600">
                          Přiřazená trasa
                        </span>

                        <select
                          name="race_distance_id"
                          defaultValue={valueToString(
                            price.race_distance_id
                          )}
                          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                        >
                          <option value="">Celý závod / bez trasy</option>

                          {distances.map((distance) => (
                            <option
                              key={String(distance.id)}
                              value={String(distance.id)}
                            >
                              {valueToString(distance.label) ||
                                valueToString(distance.distance_km) + " km"}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <Fields record={price} fields={priceFields} />

                    <div className="mt-6 flex justify-end">
                      <SaveButton />
                    </div>
                  </form>
                </div>
              ))}

              {prices.length === 0 && (
                <p className="rounded-xl border bg-white p-6 text-sm text-gray-500">
                  Tento závod zatím nemá evidované cenové vlny.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
