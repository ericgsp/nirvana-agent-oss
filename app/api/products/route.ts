import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server-admin";

import type { ProductGridRow } from "../../products/product-types";

export const dynamic = "force-dynamic";

const MAX_BATCH_SIZE = 500;

type ProductDatabaseRow = {
  product_record_id: string;
  product_id: string;
  product_display_id: string | null;
  product_category: string | null;
  product_range: string | null;
  religion_use: string | null;
  product_name: string | null;
  site_english: string | null;
  site_mandarin: string | null;
  area_zone_block: string | null;
  section_block_wall: string | null;
  unit_lot_side: string | null;
  level_tier: string | null;
  product_type: string | null;
  size: string | null;
  position_type: string | null;
  as_need_price: number | null;
  pre_need_price: number | null;
  trust_account_and_facility_cost: number | null;
  back_wall: number | null;
  pre_total_price: number | null;
  active: boolean | null;
  remark: string | null;
  manual_group_id: string | null;
  manual_group_color: string | null;
  manual_group_position: string | null;
};

function text(
  value: string | number | null
): string {
  return value === null ||
    value === undefined
    ? ""
    : String(value);
}

function mapRow(
  row: ProductDatabaseRow
): ProductGridRow {
  return {
    client_row_id: row.product_record_id,
    product_record_id: row.product_record_id,
    product_id: row.product_id ?? "",
    product_display_id: row.product_display_id ?? "",
    product_category:
      row.product_category ?? "",
    product_range: row.product_range ?? "",
    religion_use: row.religion_use ?? "",
    product_name: row.product_name ?? "",
    site_english: row.site_english ?? "",
    site_mandarin: row.site_mandarin ?? "",
    area_zone_block:
      row.area_zone_block ?? "",
    section_block_wall:
      row.section_block_wall ?? "",
    unit_lot_side: row.unit_lot_side ?? "",
    level_tier: row.level_tier ?? "",
    product_type: row.product_type ?? "",
    size: row.size ?? "",
    position_type: row.position_type ?? "",
    as_need_price: text(row.as_need_price),
    pre_need_price: text(row.pre_need_price),
    trust_account_and_facility_cost: text(
      row.trust_account_and_facility_cost
    ),
    back_wall: text(row.back_wall),
    pre_total_price: text(
      row.pre_total_price
    ),
    active: row.active ?? false,
    remark: row.remark ?? "",
    manual_group_id: row.manual_group_id ?? null,
    manual_group_color: row.manual_group_color ?? null,
    manual_group_position: row.manual_group_position ?? null,
    is_new: false,
  };
}

function cleanSearch(value: string): string {
  return value
    .replaceAll(",", " ")
    .replaceAll("(", " ")
    .replaceAll(")", " ")
    .trim();
}

export async function GET(
  request: NextRequest
) {
  const params =
    request.nextUrl.searchParams;

  const offset = Math.max(
    Number(params.get("offset") ?? "0"),
    0
  );

  const requestedLimit = Math.max(
    Number(params.get("limit") ?? "300"),
    1
  );

  const limit = Math.min(
    requestedLimit,
    MAX_BATCH_SIZE
  );

  let query = supabaseAdmin
    .from("products")
    .select(
      `
        product_record_id,
        product_id,
        product_display_id,
        product_category,
        product_range,
        religion_use,
        product_name,
        site_english,
        site_mandarin,
        area_zone_block,
        section_block_wall,
        unit_lot_side,
        level_tier,
        product_type,
        size,
        position_type,
        as_need_price,
        pre_need_price,
        trust_account_and_facility_cost,
        back_wall,
        pre_total_price,
        active,
        remark,
        manual_group_id,
        manual_group_color,
        manual_group_position
      `
    )
    .order("product_id", {
      ascending: true,
    })
    .range(offset, offset + limit - 1);

  const search = cleanSearch(
    params.get("search") ?? ""
  );

  if (search) {
    query = query.or(
      [
        `product_id.ilike.%${search}%`,
        `product_display_id.ilike.%${search}%`,
        `product_name.ilike.%${search}%`,
        `product_range.ilike.%${search}%`,
        `area_zone_block.ilike.%${search}%`,
        `section_block_wall.ilike.%${search}%`,
        `unit_lot_side.ilike.%${search}%`,
        `product_type.ilike.%${search}%`,
      ].join(",")
    );
  }

  const equalityFilters = [
    ["site_english", params.get("site")],
    [
      "product_category",
      params.get("category"),
    ],
    ["area_zone_block", params.get("area")],
    [
      "section_block_wall",
      params.get("section"),
    ],
    ["unit_lot_side", params.get("unit")],
    [
      "product_type",
      params.get("productType"),
    ],
  ] as const;

  for (const [column, value] of
    equalityFilters) {
    if (value) {
      query = query.eq(column, value);
    }
  }

  const active = params.get("active");

  if (active === "true") {
    query = query.eq("active", true);
  }

  if (active === "false") {
    query = query.eq("active", false);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
        rows: [],
      },
      {
        status: 500,
      }
    );
  }

  const rows = (
    (data ?? []) as ProductDatabaseRow[]
  ).map(mapRow);

  return NextResponse.json({
    success: true,
    rows,
    nextOffset: offset + rows.length,
    hasMore: rows.length === limit,
  });
}
