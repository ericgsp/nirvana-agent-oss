import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sortLevels(levels: string[]): string[] {
  return [...levels].sort((a, b) => {
    const aNum = parseFloat(a);
    const bNum = parseFloat(b);
    if (aNum !== bNum) return aNum - bNum;
    return a.localeCompare(b);
  });
}

const unique = (arr: (string | null | undefined)[]) =>
  [...new Set(arr.filter(Boolean) as string[])].sort();

function base() {
  return supabaseAdmin
    .from("product_availability_with_price")
    .select("*")
    .eq("available", true)
    .not("price_list_id", "is", null)
    .limit(10000);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p = request.nextUrl.searchParams;
  const step    = p.get("step")    ?? "sites";
  const site    = p.get("site")    ?? "";
  const product = p.get("product") ?? "";
  const block   = p.get("block")   ?? "";
  const section = p.get("section") ?? "";

  if (step === "sites") {
    const { data } = await base().select("site");
    return NextResponse.json({ options: unique((data ?? []).map((r: any) => r.site)) });
  }

  if (step === "products") {
    const { data, error } = await supabaseAdmin.rpc("get_available_zones", { p_site: site });
    if (error) return NextResponse.json({ options: [], error: error.message });

    // Fetch religion per zone from product_price_list (not in the view)
    const zoneNames = (data ?? []).map((r: any) => r.zone as string);
    const { data: relData } = await supabaseAdmin
      .from("product_price_list")
      .select("product_name, block, religion")
      .eq("active", true)
      .not("religion", "is", null);
    const religionMap: Record<string, string> = {};
    (relData ?? []).forEach((r: any) => {
      const k = (r.product_name as string).toLowerCase();
      if (!religionMap[k]) religionMap[k] = r.religion;
      if (r.block) { const b = (r.block as string).toLowerCase(); if (!religionMap[b]) religionMap[b] = r.religion; }
    });

    const options = (data ?? []).map((r: any) => {
      const zoneLc = (r.zone as string).toLowerCase();
      let religion = religionMap[zoneLc] ?? null;
      if (!religion) {
        for (const [k, v] of Object.entries(religionMap)) {
          if (zoneLc.startsWith(k + '-')) { religion = v; break; }
        }
      }
      return { name: r.zone, category: r.product_category, available: Number(r.available_count), religion };
    }).sort((a: any, b: any) => {
      const aC = a.religion === "Christian" ? 1 : 0;
      const bC = b.religion === "Christian" ? 1 : 0;
      if (aC !== bC) return aC - bC;
      return a.name.localeCompare(b.name);
    });

    // Merge in price-list-only products (e.g. NLP, EBL) not in the portal view
    // These products have price_list_id = null in the availability view so get_available_zones skips them.
    const { data: plProducts } = await supabaseAdmin
      .from("product_price_list")
      .select("product_name, product_category")
      .eq("site_code", site)
      .eq("active", true)
      .in("product_category", ["NLP", "EBL"]);
    const existingNames = new Set(options.map((o: any) => (o.name as string).toLowerCase()));
    const seen = new Set<string>();
    (plProducts ?? []).forEach((r: any) => {
      const name = r.product_name as string;
      if (!existingNames.has(name.toLowerCase()) && !seen.has(name)) {
        seen.add(name);
        options.push({ name, category: r.product_category ?? "", available: null, religion: null });
      }
    });

    // Expand multi-section products from zone_layouts (e.g. EBL → EBL-A, EBL-F).
    // When a product's layouts are stored as "PRODUCT-SECTION" rows, replace the base
    // product option with one entry per section. The existing prefix-grouping code in the
    // agent app then automatically groups them under "EBL" exactly like DZW-A / DZW-B / DZW-D.
    const semenyihVariants = ["Semenyih", "Semenyih-NMG", "Semenyih-NMP"];
    const layoutSites = semenyihVariants.includes(site) ? semenyihVariants : [site];
    const { data: layoutZoneRows } = await supabaseAdmin
      .from("zone_layouts")
      .select("zone")
      .in("site_code", layoutSites)
      .ilike("zone", "%-%");

    const sectionMap: Record<string, string[]> = {};
    const seenSections = new Set<string>();
    for (const r of (layoutZoneRows ?? [])) {
      const z = r.zone as string;
      const lastDash = z.lastIndexOf("-");
      if (lastDash < 0) continue;
      const base = z.slice(0, lastDash);
      if (!sectionMap[base]) sectionMap[base] = [];
      if (!seenSections.has(z)) { seenSections.add(z); sectionMap[base].push(z); }
    }

    // Build a set of zone names that have real lots in get_available_zones.
    const optionNames = new Set((options ?? []).map((o: any) => o.name as string));

    // Query per-section availability for ALL niche zones.
    // This covers both zone_layouts-sourced sections (e.g. S3A with D6/D7/D8/D9/D10)
    // AND zones whose wall sections only exist as niche_section values in the data
    // (e.g. BK-A-LG1-HB-S1 with niche_section = S1, S2, S3 ...).
    const nicheZoneNames = options
      .filter((o: any) => ['niche', 'pedestal', 'pet niche'].includes((o.category || '').toLowerCase()))
      .map((o: any) => o.name as string);

    const sectionAvailMap: Record<string, Record<string, number>> = {};
    if (nicheZoneNames.length > 0) {
      const { data: sectAvail } = await supabaseAdmin
        .rpc('get_section_avail_counts', { p_site: site, p_zones: nicheZoneNames })
        .limit(10000);
      for (const r of (sectAvail ?? [])) {
        const z = r.zone as string;
        const sec = r.niche_section as string;
        const cnt = Number(r.cnt);
        if (!z || !sec) continue;
        if (!sectionAvailMap[z]) sectionAvailMap[z] = {};
        sectionAvailMap[z][sec] = (sectionAvailMap[z][sec] || 0) + cnt;
      }
    }

    // Query lot_section for all zones that didn't get sections from the niche path.
    // This covers any product type that uses lot_section (burial, urn burial, package plot, etc.)
    // regardless of what product_category label is stored in the DB.
    const zonesWithoutSections = options
      .filter((o: any) => !sectionAvailMap[o.name])
      .map((o: any) => o.name as string);

    // Track which zones got sections from the lot_section path so we can show the
    // Sec/Row picker even when there is only 1 section (>= 1, not > 1).
    // Query each zone individually in parallel to avoid the PostgREST 1000-row server cap
    // cutting off zones that sort later (e.g. zone P alone has 700+ lots in Klang).
    const lotSectionZones = new Set<string>();
    if (zonesWithoutSections.length > 0) {
      await Promise.all(zonesWithoutSections.map(async (zoneName) => {
        const { data: rows } = await supabaseAdmin
          .from('product_availability_with_price')
          .select('lot_section')
          .eq('site', site)
          .eq('zone', zoneName)
          .eq('available', true)
          .not('lot_section', 'is', null)
          .limit(2000);
        for (const r of (rows ?? [])) {
          const sec = r.lot_section as string;
          if (!sec) continue;
          if (!sectionAvailMap[zoneName]) sectionAvailMap[zoneName] = {};
          sectionAvailMap[zoneName][sec] = (sectionAvailMap[zoneName][sec] || 0) + 1;
          lotSectionZones.add(zoneName);
        }
      }));
    }

    // Pet Niche: 2-part lot codes → niche_section is NULL, price_level holds the level/section.
    // Neither the niche path nor the lot_section burial path captures these — query price_level directly.
    const petNicheZones = options
      .filter((o: any) => (o.category || '').toLowerCase() === 'pet niche' && !sectionAvailMap[o.name])
      .map((o: any) => o.name as string);
    if (petNicheZones.length > 0) {
      await Promise.all(petNicheZones.map(async (zoneName) => {
        const { data: rows } = await supabaseAdmin
          .from('product_availability_with_price')
          .select('price_level')
          .eq('site', site)
          .eq('zone', zoneName)
          .eq('available', true)
          .not('price_level', 'is', null)
          .limit(2000);
        for (const r of (rows ?? [])) {
          const sec = r.price_level as string;
          if (!sec) continue;
          if (!sectionAvailMap[zoneName]) sectionAvailMap[zoneName] = {};
          sectionAvailMap[zoneName][sec] = (sectionAvailMap[zoneName][sec] || 0) + 1;
          lotSectionZones.add(zoneName);
        }
      }));
    }

    // Shah Alam HC: identify which niche_sections have no pre_need_price (instant case only).
    // These sections need a flag so the UI can label them in the picker.
    const instantCaseSections: Record<string, Set<string>> = {};
    if (site === 'Shah Alam') {
      const hcZones = options
        .filter((o: any) => (o.name as string).toUpperCase().startsWith('HC'))
        .map((o: any) => o.name as string);
      if (hcZones.length > 0) {
        const { data: hcRows } = await supabaseAdmin
          .from('product_availability_with_price')
          .select('zone, niche_section, pre_need_price')
          .eq('site', site)
          .in('zone', hcZones)
          .eq('available', true)
          .limit(5000);
        // A section is instant-case-only when NONE of its lots have pre_need_price
        const hasPreneedMap: Record<string, Record<string, boolean>> = {};
        for (const r of (hcRows ?? [])) {
          const z = r.zone as string;
          const sec = r.niche_section as string;
          if (!z || !sec) continue;
          if (!hasPreneedMap[z]) hasPreneedMap[z] = {};
          if (r.pre_need_price != null) hasPreneedMap[z][sec] = true;
          else if (hasPreneedMap[z][sec] == null) hasPreneedMap[z][sec] = false;
        }
        for (const [z, secMap] of Object.entries(hasPreneedMap)) {
          for (const [sec, hasPreneed] of Object.entries(secMap)) {
            if (!hasPreneed) {
              if (!instantCaseSections[z]) instantCaseSections[z] = new Set();
              instantCaseSections[z].add(sec);
            }
          }
        }
      }
    }

    const expandedBases = new Set<string>();
    const finalOptions: any[] = [];
    for (const opt of options) {
      const variants = sectionMap[opt.name];
      const secBySection = sectionAvailMap[opt.name] ?? {};
      const dbSectionCount = Object.keys(secBySection).length;

      // 3-level trigger:
      // A) zone_layouts has comma or virtual sub-entries, OR
      // B) the zone has 2+ distinct niche_section values in the availability data, OR
      // C) the zone has 1+ lot_section values (burial/urn/package plot — always show Sec/Row)
      const hasCommaVariant   = (variants ?? []).some((v: string) => v.includes(','));
      const hasVirtualVariant = (variants ?? []).some((v: string) => !optionNames.has(v));
      const hasMultiSection   = dbSectionCount > 1;
      const hasBurialSection  = lotSectionZones.has(opt.name) && dbSectionCount >= 1;
      const hasPedestalSection = ['pedestal', 'pet niche'].includes((opt.category || '').toLowerCase()) && dbSectionCount >= 1;
      const use3Level = hasCommaVariant || hasVirtualVariant || hasMultiSection || hasBurialSection || hasPedestalSection;

      if (use3Level && !expandedBases.has(opt.name)) {
        // Non-niche products (e.g. EBL) have no section-level availability data.
        // Fetch per-sub-zone counts directly (bypassing base() which filters price_list_id IS NOT NULL).
        if (Object.keys(secBySection).length === 0 && variants?.length > 0) {
          const { data: lotAvail } = await supabaseAdmin.rpc("get_zone_lot_availability", {
            p_site: site, p_zone: opt.name,
          });
          const countBySec: Record<string, number> = {};
          Object.entries((lotAvail as Record<string, boolean>) ?? {}).forEach(([lotCode, isAvail]) => {
            if (isAvail) {
              const sec = lotCode.split("-")[0];
              if (sec) countBySec[sec] = (countBySec[sec] || 0) + 1;
            }
          });
          const subsections = variants
            .sort()
            .map((v: string) => {
              const sec = v.slice(opt.name.length + 1);
              return { section: sec, available: countBySec[sec] ?? null };
            });
          finalOptions.push({ ...opt, subsections });
          continue;
        }
        // 3-level behavior: attach subsections so the picker shows a folder → sub-section list.
        expandedBases.add(opt.name);
        const subsections: { section: string; available: number }[] = [];

        const _instantSet = instantCaseSections[opt.name];
        if (variants?.length) {
          // Build subsections from zone_layouts entries (preserves explicit ordering / grouping).
          for (const v of variants) {
            const sectionPart = v.slice(opt.name.length + 1);
            if (v.includes(',')) {
              for (const sec of sectionPart.split(',').map((s: string) => s.trim()).filter(Boolean)) {
                subsections.push({ section: sec, available: secBySection[sec] ?? 0, instant_case: _instantSet?.has(sec) ?? false });
              }
            } else {
              subsections.push({ section: sectionPart, available: secBySection[sectionPart] ?? 0, instant_case: _instantSet?.has(sectionPart) ?? false });
            }
          }
        } else {
          // No zone_layouts sub-entries — discover sections from niche_section values in the data.
          for (const [sec, count] of Object.entries(secBySection)) {
            subsections.push({ section: sec, available: count, instant_case: _instantSet?.has(sec) ?? false });
          }
        }

        subsections.sort((a, b) => {
          const an = parseInt(a.section.replace(/\D/g, ''), 10) || 0;
          const bn = parseInt(b.section.replace(/\D/g, ''), 10) || 0;
          return an !== bn ? an - bn : a.section.localeCompare(b.section);
        });
        const availableSubsections = subsections.filter(s => s.available > 0);
        if (availableSubsections.length === 0) continue;
        finalOptions.push({ ...opt, subsections: availableSubsections });
      } else if (!use3Level && variants?.length > 1 && !expandedBases.has(opt.name)) {
        // Existing behavior: expand to individual flat options (e.g. EBL-A, EBL-B, EBL-F).
        expandedBases.add(opt.name);
        variants.sort();
        for (const s of variants) {
          finalOptions.push({ name: s, category: opt.category, available: null, religion: opt.religion });
        }
      } else {
        finalOptions.push(opt);
      }
    }
    // Drop zones with zero available lots (sold out) — available===null means unknown (e.g. NLP), keep those.
    const visibleOptions = finalOptions.filter((o: any) => o.available !== 0);

    visibleOptions.sort((a: any, b: any) => {
      const aC = a.religion === "Christian" ? 1 : 0;
      const bC = b.religion === "Christian" ? 1 : 0;
      if (aC !== bC) return aC - bC;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ options: visibleOptions });
  }

  if (step === "blocks") {
    const { data } = await base().eq("site", site).eq("zone", product).select("price_block");
    return NextResponse.json({ options: unique((data ?? []).map((r: any) => r.price_block)) });
  }

  if (step === "sections") {
    const { data } = await base()
      .eq("site", site).eq("zone", product).eq("price_block", block)
      .select("price_section_group");
    return NextResponse.json({ options: unique((data ?? []).map((r: any) => r.price_section_group)) });
  }

  if (step === "levels") {
    const { data } = await base()
      .eq("site", site).eq("zone", product).eq("price_block", block).eq("price_section_group", section)
      .select("price_level");
    return NextResponse.json({ options: sortLevels(unique((data ?? []).map((r: any) => r.price_level))) });
  }

  return NextResponse.json({ options: [] });
}
