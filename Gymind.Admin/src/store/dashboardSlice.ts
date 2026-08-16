import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { ownerDashboardApi, type OwnerDashboard } from "../api/ownerDashboardApi";
import { managerDashboardApi, type ManagerDashboard } from "../api/managerDashboardApi";
import { dashboardApi, type AdminWorkspace } from "../api/dashboardApi";
import { auditLogsApi, type AuditLog } from "../api/auditLogsApi";

interface SliceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

export interface DashboardState {
  owner: SliceState<OwnerDashboard>;
  manager: SliceState<ManagerDashboard>;
  superadmin: SliceState<AdminWorkspace>;
  auditLogs: SliceState<AuditLog[]>;
}

const initialSliceState = <T>(): SliceState<T> => ({
  data: null,
  loading: false,
  error: null,
  lastFetched: null
});

const initialState: DashboardState = {
  owner: initialSliceState<OwnerDashboard>(),
  manager: initialSliceState<ManagerDashboard>(),
  superadmin: initialSliceState<AdminWorkspace>(),
  auditLogs: initialSliceState<AuditLog[]>()
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

const isCacheFresh = (lastFetched: number | null) => {
  return lastFetched !== null && Date.now() - lastFetched < CACHE_TTL_MS;
};

export const fetchOwnerDashboard = createAsyncThunk(
  "dashboard/fetchOwnerDashboard",
  async (arg: { forceRefetch?: boolean } | undefined, { rejectWithValue }) => {
    try {
      return await ownerDashboardApi.getDashboard();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to load owner dashboard");
    }
  },
  {
    condition: (arg, { getState }) => {
      if (arg?.forceRefetch) return true;
      const { dashboard } = getState() as { dashboard: DashboardState };
      if (dashboard.owner.data && isCacheFresh(dashboard.owner.lastFetched)) {
        return false; // Skip execution (will use cached data)
      }
      return true;
    }
  }
);

export const fetchManagerDashboard = createAsyncThunk(
  "dashboard/fetchManagerDashboard",
  async (arg: { forceRefetch?: boolean } | undefined, { rejectWithValue }) => {
    try {
      return await managerDashboardApi.getDashboard();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to load manager dashboard");
    }
  },
  {
    condition: (arg, { getState }) => {
      if (arg?.forceRefetch) return true;
      const { dashboard } = getState() as { dashboard: DashboardState };
      if (dashboard.manager.data && isCacheFresh(dashboard.manager.lastFetched)) {
        return false;
      }
      return true;
    }
  }
);

export const fetchSuperAdminDashboard = createAsyncThunk(
  "dashboard/fetchSuperAdminDashboard",
  async (arg: { forceRefetch?: boolean } | undefined, { rejectWithValue }) => {
    try {
      return await dashboardApi.getWorkspace();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to load superadmin workspace");
    }
  },
  {
    condition: (arg, { getState }) => {
      if (arg?.forceRefetch) return true;
      const { dashboard } = getState() as { dashboard: DashboardState };
      if (dashboard.superadmin.data && isCacheFresh(dashboard.superadmin.lastFetched)) {
        return false;
      }
      return true;
    }
  }
);

export const fetchAuditLogs = createAsyncThunk(
  "dashboard/fetchAuditLogs",
  async (arg: { forceRefetch?: boolean } | undefined, { rejectWithValue }) => {
    try {
      return await auditLogsApi.getAuditLogs();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to load audit logs");
    }
  },
  {
    condition: (arg, { getState }) => {
      if (arg?.forceRefetch) return true;
      const { dashboard } = getState() as { dashboard: DashboardState };
      if (dashboard.auditLogs.data && isCacheFresh(dashboard.auditLogs.lastFetched)) {
        return false;
      }
      return true;
    }
  }
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearAllCache(state) {
      state.owner = initialSliceState<OwnerDashboard>();
      state.manager = initialSliceState<ManagerDashboard>();
      state.superadmin = initialSliceState<AdminWorkspace>();
      state.auditLogs = initialSliceState<AuditLog[]>();
    },
    clearOwnerCache(state) {
      state.owner = initialSliceState<OwnerDashboard>();
    },
    clearManagerCache(state) {
      state.manager = initialSliceState<ManagerDashboard>();
    },
    clearSuperAdminCache(state) {
      state.superadmin = initialSliceState<AdminWorkspace>();
      state.auditLogs = initialSliceState<AuditLog[]>();
    }
  },
  extraReducers: (builder) => {
    // Owner
    builder
      .addCase(fetchOwnerDashboard.pending, (state) => {
        state.owner.loading = true;
        state.owner.error = null;
      })
      .addCase(fetchOwnerDashboard.fulfilled, (state, action) => {
        state.owner.loading = false;
        state.owner.data = action.payload;
        state.owner.lastFetched = Date.now();
      })
      .addCase(fetchOwnerDashboard.rejected, (state, action) => {
        state.owner.loading = false;
        state.owner.error = (action.payload as string) || action.error.message || "Failed to load owner dashboard";
      });

    // Manager
    builder
      .addCase(fetchManagerDashboard.pending, (state) => {
        state.manager.loading = true;
        state.manager.error = null;
      })
      .addCase(fetchManagerDashboard.fulfilled, (state, action) => {
        state.manager.loading = false;
        state.manager.data = action.payload;
        state.manager.lastFetched = Date.now();
      })
      .addCase(fetchManagerDashboard.rejected, (state, action) => {
        state.manager.loading = false;
        state.manager.error = (action.payload as string) || action.error.message || "Failed to load manager dashboard";
      });

    // SuperAdmin Workspace
    builder
      .addCase(fetchSuperAdminDashboard.pending, (state) => {
        state.superadmin.loading = true;
        state.superadmin.error = null;
      })
      .addCase(fetchSuperAdminDashboard.fulfilled, (state, action) => {
        state.superadmin.loading = false;
        state.superadmin.data = action.payload;
        state.superadmin.lastFetched = Date.now();
      })
      .addCase(fetchSuperAdminDashboard.rejected, (state, action) => {
        state.superadmin.loading = false;
        state.superadmin.error = (action.payload as string) || action.error.message || "Failed to load superadmin workspace";
      });

    // Audit Logs
    builder
      .addCase(fetchAuditLogs.pending, (state) => {
        state.auditLogs.loading = true;
        state.auditLogs.error = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.auditLogs.loading = false;
        state.auditLogs.data = action.payload;
        state.auditLogs.lastFetched = Date.now();
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.auditLogs.loading = false;
        state.auditLogs.error = (action.payload as string) || action.error.message || "Failed to load audit logs";
      });
  }
});

export const { clearAllCache, clearOwnerCache, clearManagerCache, clearSuperAdminCache } = dashboardSlice.actions;
export default dashboardSlice.reducer;
