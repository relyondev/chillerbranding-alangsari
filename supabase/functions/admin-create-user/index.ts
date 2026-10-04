import { userFromRequest } from "../_shared/auth.ts";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      });
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

    if (actor.role === "admin" && !["pic", "client"].includes(body.role)) {
      return jsonResponse(
        { error: "admin_can_only_create_pic_or_client" },
        { status: 403 }
      );
    }

    if (body.role === "super_admin" && actor.role !== "super_admin") {
      return jsonResponse(
        { error: "super_admin_required" },
        { status: 403 }
      );
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email) {
      return jsonResponse({ error: "email_required" }, { status: 400 });
    }

    if (password.length < 8) {
      return jsonResponse(
        { error: "password_min_8_characters" },
        { status: 400 }
      );
    }

    const picNumber = body.role === "pic" ? Number(body.pic_number) : null;
    if (body.role === "pic") {
      if (!body.branch_id) {
        return jsonResponse({ error: "pic_branch_required" }, { status: 400 });
      }
      if (!Number.isInteger(picNumber) || picNumber < 1 || picNumber > 99) {
        return jsonResponse({ error: "pic_number_must_be_01_to_99" }, { status: 400 });
      }

      const { data: duplicatePic } = await admin
        .from("pic_profiles")
        .select("user_id")
        .eq("branch_id", body.branch_id)
        .eq("sequence_number", picNumber)
        .maybeSingle();

      if (duplicatePic) {
        return jsonResponse({ error: "pic_code_already_exists" }, { status: 409 });
      }
    }

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: body.full_name,
        },
      });

    if (createError || !created.user) {
      throw createError ?? new Error("create_auth_user_failed");
    }

    const { data: finalized, error: dbError } = await admin.rpc(
      "admin_finalize_user",
      {
        p_actor_user_id: user.id,
        p_auth_user_id: created.user.id,
        p_email: email,
        p_full_name: body.full_name,
        p_phone: body.phone ?? "",
        p_role: body.role,
        p_branch_id: body.branch_id ?? null,
        p_stockpoint_ids: body.stockpoint_ids ?? [],
        p_pic_number: picNumber,
      }
    );

    if (dbError) {
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
      throw dbError;
    }

    return jsonResponse({
      ok: true,
      account_active: true,
      ...finalized,
    });
  } catch (e) {
    return jsonResponse(
      { error: e instanceof Error ? e.message : "unknown_error" },
      { status: 400 }
    );
  }
});
