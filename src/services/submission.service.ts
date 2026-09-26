import { getSupabaseClient } from "../lib/supabase/client";
import { buildSalesmanCode } from "../lib/validation/codes";
import type { SubmissionDraftInput } from "../lib/validation/submission";

async function syncSpreadsheetBestEffort(submissionId?: string) {
  if (!submissionId) return;

  try {
    const supabase = getSupabaseClient();
    await supabase.functions.invoke("spreadsheet-sync", {
      body: { submission_id: submissionId },
    });
  } catch (error) {
    console.warn("spreadsheet_sync_deferred", error);
  }
}

function rpcRow(data: any) {
  return Array.isArray(data) ? data[0] : data;
}

export async function createDraft(input: SubmissionDraftInput) {
  const supabase = getSupabaseClient();

  const result = await supabase.rpc("create_submission_draft", {
    p_stockpoint_id: input.stockpointId,
    p_salesman_part_1: input.salesmanPart1,
    p_salesman_part_2: input.salesmanPart2,
    p_salesman_part_3: input.salesmanPart3.toUpperCase(),
    p_salesman_code: buildSalesmanCode(
      input.salesmanPart1,
      input.salesmanPart2,
      input.salesmanPart3
    ),
    p_store_code: input.storeCode,
    p_store_name: input.storeName,
    p_owner_name: input.ownerName,
    p_owner_phone: input.ownerPhone,
    p_store_address: input.storeAddress,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_location_accuracy_meters: input.accuracyMeters,
    p_store_type: input.storeType,
    p_has_chiller: input.hasChiller,
    p_branding_status: input.brandingStatus,
    p_not_brandable_reason: input.notBrandableReason,
  });

  if (!result.error) {
    const row = rpcRow(result.data);
    await syncSpreadsheetBestEffort(row?.id);
  }

  return result;
}

export async function submitDraft(
  submissionId: string,
  expectedVersion: number
) {
  const supabase = getSupabaseClient();

  const result = await supabase.rpc("submit_submission", {
    p_submission_id: submissionId,
    p_expected_version: expectedVersion,
  });

  if (!result.error) {
    const row = rpcRow(result.data);
    await syncSpreadsheetBestEffort(row?.id ?? submissionId);
  }

  return result;
}
