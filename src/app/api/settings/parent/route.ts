import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, phone, address, city, postalCode, province, language, preferredContact, privacy } = body;

  const admin = createAdminClient();
  const existing = user.user_metadata || {};

  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...existing,
      full_name: name || existing.full_name,
      phone: phone ?? existing.phone,
      address: address ?? existing.address,
      city: city ?? existing.city,
      postal_code: postalCode ?? existing.postal_code,
      province: province ?? existing.province,
      preferred_language: language ?? existing.preferred_language,
      preferred_contact: preferredContact ?? existing.preferred_contact,
      ...(privacy ? { privacy } : {}),
    },
  });

  return NextResponse.json({ success: true });
}
