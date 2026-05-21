"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { CellCard } from "@/components/cells/CellCard";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { useCells, type CellType } from "@/application/hooks/useCells";

const TYPE_FILTERS: { id: "all" | CellType; label: string }[] = [
  { id: "all",      label: "All types" },
  { id: "care",     label: "Care" },
  { id: "outreach", label: "Outreach" },
  { id: "children", label: "Children" },
  { id: "g12",      label: "G12" },
];

export default function LeaderCellsPage() {
  const router = useRouter();
  const user = useAppSelector((s) => s.session.user);
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CellType>("all");

  // Backend scopes /cells by role: G12 callers see their network's cells,
  // Leader callers see only the cells they personally lead. The "Other
  // available cells" section therefore stays empty for plain Leaders until
  // backend widens the scope.
  const { cells: rawCells, loading } = useCells();

  // Client-side filter to active only — preserves the previous UX where
  // archived cells didn't show up in the leader's list.
  const activeCells = rawCells.filter((c) => c.state !== "archived");

  const filtered = useMemo(() => activeCells.filter((c) => {
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    if (search.trim() && !c.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  }), [activeCells, typeFilter, search]);

  // Cells the user leads — they have full access (edit, manage members, archive).
  const myCells    = filtered.filter((c) => c.leaderUid === user?.uid);
  // Other active cells — read-only (can see but cannot edit or manage).
  const otherCells = filtered.filter((c) => c.leaderUid !== user?.uid);

  return (
    <div className="page">
      <header className="page-header" style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 32, color: "var(--color-primary)", letterSpacing: "-0.01em" }}>Cells</h1>
          <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-body-green)" }}>
            {loading ? "Loading…" : <><b style={{ color: "var(--color-primary)" }}>{myCells.length}</b> cells you lead · <b style={{ color: "var(--color-primary)" }}>{otherCells.length}</b> others available.</>}
          </p>
        </div>
        <Link href="/cells/new" className="btn btn--primary">
          <Icon name="plus" size={16} /> Create Cell
        </Link>
      </header>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Input placeholder="Search by cell name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ display: "inline-flex", padding: 3, gap: 2, background: "var(--color-light-gray)", borderRadius: 9999 }}>
          {TYPE_FILTERS.map((f) => (
            <button type="button" key={f.id} onClick={() => setTypeFilter(f.id)}
              style={{ border: 0, background: typeFilter === f.id ? "#fff" : "transparent", color: typeFilter === f.id ? "var(--color-primary)" : "var(--color-body-green)", padding: "6px 12px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12, borderRadius: 9999, cursor: "pointer", boxShadow: typeFilter === f.id ? "0 1px 2px 0 rgba(21,42,36,0.08)" : "none" }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--color-muted)" }}><Icon name="loader" size={24} /></div>
      ) : (
        <>
          {/* ── My cells — full access ── */}
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ margin: "0 0 14px", fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, color: "var(--color-primary)" }}>
              Cells I lead
            </h2>
            {myCells.length === 0 ? (
              <EmptyState icon="users" title="No cells yet" message="Create your first cell to get started." />
            ) : (
              <div className="cell-grid">
                {myCells.map((c) => (
                  <CellCard key={c.id} cell={c} onClick={() => router.push(`/cells/${c.id}`)} />
                ))}
              </div>
            )}
          </section>

          {/* ── Other available cells — dimmed and NOT clickable for everyone ── */}
          {otherCells.length > 0 && (
            <section>
              <h2 style={{ margin: "0 0 4px", fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, color: "var(--color-primary)" }}>
                Other available cells
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)", fontWeight: 500, marginLeft: 8 }}>· view only</span>
              </h2>
              <p style={{ margin: "0 0 14px", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
                You can see other cells but cannot open or manage them.
              </p>
              <div
                className="cell-grid"
                style={{ opacity: 0.65, filter: "saturate(0.7)", pointerEvents: "none", userSelect: "none" }}
                aria-disabled="true"
              >
                {otherCells.map((c) => (
                  <CellCard key={c.id} cell={c} readonly />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
