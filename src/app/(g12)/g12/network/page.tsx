"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { pushToast } from "@/application/slices/uiSlice";
import { useCells } from "@/application/hooks/useCells";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";

interface LeaderUser {
  uid: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
  profilePhotoUrl?: string | null;
  roles?: string[];
  phone?: string;
}

interface PagedResponse {
  items: LeaderUser[];
  nextCursor: string | null;
  total: number;
}

const PAGE_SIZE = 25;

export default function G12NetworkPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const sessionUser = useAppSelector((s) => s.session.user);

  const [allLeaders, setAllLeaders] = useState<LeaderUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ uid: string; name: string } | null>(null);

  // Cells in the G12's scope — used to count cells per leader.
  const { cells } = useCells();

  // Fetch every Leader in the org via GET /users?role=leader.
  useEffect(() => {
    if (!sessionUser) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const collected: LeaderUser[] = [];
        let cursor: string | undefined;
        for (let i = 0; i < 20; i++) {
          const params = new URLSearchParams({ role: "leader", limit: "100" });
          if (cursor) params.append("cursor", cursor);
          const data = await apiRequest<PagedResponse>(`/users?${params}`);
          collected.push(...(data.items ?? []));
          cursor = data.nextCursor ?? undefined;
          if (!cursor) break;
        }
        // Drop anyone who already holds G12 (or admin) — only "Leader only" rows here.
        const leadersOnly = collected.filter((u) => {
          const roles = u.roles ?? [];
          return roles.includes("leader") && !roles.includes("g12") && !roles.includes("admin") && !roles.includes("super_admin");
        });
        if (!cancelled) setAllLeaders(leadersOnly);
      } catch (err) {
        if (err instanceof ApiRequestError && err.status !== 401) {
          dispatch(pushToast({ tone: "warning", title: "Failed to load leaders" }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionUser, dispatch]);

  const cellCountByLeader = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cells ?? []) {
      map.set(c.leaderUid, (map.get(c.leaderUid) ?? 0) + 1);
    }
    return map;
  }, [cells]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allLeaders;
    const q = search.trim().toLowerCase();
    return allLeaders.filter((u) =>
      `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q),
    );
  }, [allLeaders, search]);

  useEffect(() => { setPage(0); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const runPromote = async (uid: string) => {
    setPromoting(uid);
    try {
      const updated = await apiRequest<{ roles?: string[] } | undefined>(`/users/${uid}/roles`, {
        method: "PATCH",
        body: { role: "g12", action: "add" },
      });
      // The promoted leader now has g12, so they drop out of this list.
      setAllLeaders((prev) => prev.filter((u) => u.uid !== uid));
      void updated; // returned roles[] is irrelevant — the row is gone
      dispatch(pushToast({ tone: "success", title: "Promoted to G12 Leader" }));
    } catch (err) {
      let title = "Promote failed";
      let message: string | undefined;
      if (err instanceof ApiRequestError) {
        if (err.status === 403) title = "Not permitted";
        else if (err.status === 409) { title = "Role conflict"; message = err.message; }
        else if (err.message) message = err.message;
      }
      dispatch(pushToast({ tone: "warning", title, message }));
    } finally {
      setPromoting(null);
      setConfirm(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Leaders network</h1>
          <div className="greeting">
            <b style={{ color: "#152A24" }}>{loading ? "…" : allLeaders.length}</b> leaders in your network.
            Promote a Leader to G12 to extend their authority — roles are additive.
          </div>
        </div>
        <Button icon="user-plus" onClick={() => router.push("/g12/promote")}>
          Promote member
        </Button>
      </div>

      <div className="audit-toolbar">
        <div className="audit-search">
          <Icon name="search" size={16} />
          <input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="tbl-card">
        <table className="tbl" style={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            <col style={{ width: "36%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "22%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Leader</th>
              <th>Email</th>
              <th>Cells</th>
              <th style={{ textAlign: "right" }}>Promote</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--color-muted)" }}>
                    <Icon name="loader" size={18} />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 14 }}>Loading…</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="empty">
                    <h3>No leaders to show</h3>
                    <p>{search ? "Try a different search term." : "There are no leaders in your network yet."}</p>
                  </div>
                </td>
              </tr>
            )}
            {rows.map((u) => {
              const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.uid;
              const isSuspended = u.status === "suspended";
              const isThisRowPromoting = promoting === u.uid;
              const promoteDisabled = isThisRowPromoting || isSuspended;
              const cellCount = cellCountByLeader.get(u.uid) ?? 0;
              return (
                <tr key={u.uid}>
                  <td>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <Avatar src={u.profilePhotoUrl ?? undefined} size="sm" name={fullName} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {fullName}
                        </div>
                        {isSuspended && <Badge tone="error">Suspended</Badge>}
                      </div>
                    </div>
                  </td>
                  <td className="muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {u.email ?? "—"}
                  </td>
                  <td>{cellCount}</td>
                  <td style={{ textAlign: "right" }} title={isSuspended ? "Reactivate before promoting" : undefined}>
                    <Button size="sm" icon="chevron-up" disabled={promoteDisabled}
                      onClick={() => setConfirm({ uid: u.uid, name: fullName })}>
                      {isThisRowPromoting ? "…" : "Promote to G12"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length > PAGE_SIZE && (
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderTop: "1px solid var(--color-stroke)",
            fontFamily: "var(--font-body)",
            fontSize: 13,
            color: "var(--color-body-green)",
            flexWrap: "wrap",
            gap: 10,
          }}>
            <span>
              Showing <b>{safePage * PAGE_SIZE + 1}</b>–<b>{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)}</b> of <b>{filtered.length}</b>
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="sm" variant="secondary" icon="chevron-left" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" iconAfter="chevron-right" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={`Promote ${confirm?.name} to G12 Leader?`}
        message={confirm
          ? `This adds the G12 role to ${confirm.name}. Roles are additive — they keep their Leader role and existing access.`
          : undefined}
        confirmLabel="Yes, promote to G12"
        onConfirm={() => { if (confirm) runPromote(confirm.uid); }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
