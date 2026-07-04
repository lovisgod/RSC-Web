import { type NextRequest, NextResponse } from "next/server";

const OPENCAGE_KEY = process.env.NEXT_GEOCODE_KEY;
const OPENCAGE_URL = "https://api.opencagedata.com/geocode/v1/json";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");

  if (!q?.trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  if (!OPENCAGE_KEY) {
    return NextResponse.json({ error: "Geocoding not configured" }, { status: 503 });
  }

  const url = `${OPENCAGE_URL}?q=${encodeURIComponent(q)}&key=${OPENCAGE_KEY}&countrycode=ng&limit=1&no_annotations=1&language=en`;

  const res = await fetch(url, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Upstream geocoding error" }, { status: 502 });
  }

  const data: unknown = await res.json();
  return NextResponse.json(data);
}
