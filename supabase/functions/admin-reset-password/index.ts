import { userFromRequest } from "../_shared/auth.ts";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const { user, admin } = await userFromRequest(req);
    const { data: actor } = await admin
      .from("profiles")
      .select("role,is_active")
      .eq("id", user.id)
      .single();

    if (!actor?.is_active || !["super_admin", "admin"].includes(actor.role)) {
      return jsonResponse({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const targetUserId = String(body.user_id ?? "").trim();
    const password = String(body.password ?? "");

    if (!targetUserId) return jsonResponse({ error: "user_id_required" }, { status: 400 });
    if (password.length < 8) return jsonResponse({ error: "password_min_8_characters" }, { status: 400 });
    if (targetUserId === user.id) return jsonResponse({ error: "use_account_page_for_own_password" }, { status: 400 });

    const { data: target, error: targetError } = await admin
      .from("profiles")
      .select("id,full_name,email,role,is_active")
      .eq("id", targetUserId)
      .single();

    if (targetError || !target) return jsonResponse({ error: "target_user_not_found" }, { status: 404 });

    if (actor.role === "admin" && !["pic", "client"].includes(target.role)) {
      return jsonResponse({ error: "admin_can_only_reset_pic_or_client" }, { status: 403 });
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(targetUserId, { password });
    if (updateError) throw updateError;

    await admin.from("audit_events").insert({
      actor_user_id: user.id,
      event_type: "user_password_reset",
      entity_type: "user",
      entity_id: targetUserId,
      after_data: { target_role: target.role, target_email: target.email, reset_by_role: actor.role },
    });

    return jsonResponse({ ok: true, user_id: targetUserId, full_name: target.full_name });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "unknown_error" }, { status: 400 });
  }
});
