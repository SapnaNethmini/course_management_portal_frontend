"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppDispatch } from "./useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { apiRequest, ApiRequestError } from "@/infrastructure/api/request";
import type { CellDetail } from "./useCells";

/**
 * Fetch a single cell with its full member roster (GET /cells/:id).
 */
export function useCell(cellId: string | undefined) {
  const [cell, setCell] = useState<CellDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiRequestError | null>(null);

  const fetchCell = useCallback(async () => {
    if (!cellId) return;
    setLoading(true);
    try {
      const data = await apiRequest<CellDetail>(`/cells/${cellId}`);

      // Enrich leaderName if backend didn't return it or returned the UID.
      let enriched = data;
      if (data.leaderUid && (!data.leaderName || data.leaderName === data.leaderUid)) {
        try {
          const leader = await apiRequest<{ firstName?: string; lastName?: string }>(
            `/users/${data.leaderUid}`,
          );
          const name = [leader.firstName, leader.lastName].filter(Boolean).join(" ").trim();
          if (name) enriched = { ...data, leaderName: name };
        } catch { /* silent — fall back to UID if user fetch fails */ }
      }

      setCell(enriched);
      setError(null);
    } catch (err) {
      if (err instanceof ApiRequestError) setError(err);
      setCell(null);
    } finally {
      setLoading(false);
    }
  }, [cellId]);

  useEffect(() => { fetchCell(); }, [fetchCell]);

  return { cell, loading, error, refetch: fetchCell };
}

/**
 * Add / remove cell members (Leader / G12 / Admin only).
 */
export function useCellMembers(cellId: string | undefined) {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);

  const addMembers = async (userUids: string[]): Promise<{ added: string[]; memberCount: number } | null> => {
    if (!cellId) return null;
    setBusy(true);
    try {
      const res = await apiRequest<{ added: string[]; memberCount: number }>(
        `/cells/${cellId}/members`,
        { method: "POST", body: { userUids } },
      );
      dispatch(pushToast({ tone: "success", title: `${res.added.length} member${res.added.length === 1 ? "" : "s"} added` }));
      return res;
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to add members.";
      dispatch(pushToast({ tone: "warning", title: "Couldn't add members", message: msg }));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (uid: string): Promise<boolean> => {
    if (!cellId) return false;
    setBusy(true);
    try {
      await apiRequest(`/cells/${cellId}/members/${uid}`, { method: "DELETE" });
      dispatch(pushToast({ tone: "success", title: "Member removed" }));
      return true;
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to remove member.";
      dispatch(pushToast({ tone: "warning", title: "Couldn't remove member", message: msg }));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, addMembers, removeMember };
}
