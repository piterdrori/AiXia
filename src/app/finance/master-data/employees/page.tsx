import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Shield,
  User2,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type FilterStatus = "all" | "active" | "inactive" | "archived";

type FinanceEmployeeRow = {
  id: string;
  user_id: string;
  code: string;
  status: "active" | "inactive" | "archived";
  mark: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  profile: {
    user_id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    status: string | null;
    company: string | null;
    member_type: string | null;
    job_title: string | null;
    phone: string | null;
    city: string | null;
    country: string | null;
  } | null;
};

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function getStatusBadgeClass(status: string) {
  if (status === "archived") return "rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-200 shadow-none";
  if (status === "inactive") return "rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200 shadow-none";
  return "rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200 shadow-none";
}

function getRoleIcon(role: string | null) {
  if (role === "admin") return Shield;
  if (role === "manager") return Users;
  return User2;
}

export default function FinanceMasterDataEmployeesPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<FinanceEmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [selected, setSelected] = useState<FinanceEmployeeRow | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance_employee_refs")
        .select(`
          id,
          user_id,
          code,
          status,
          mark,
          notes,
          metadata,
          created_at,
          updated_at,
          profile:profiles (
            user_id,
            full_name,
            email,
            role,
            status,
            company,
            member_type,
            job_title,
            phone,
            city,
            country
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRows(((data || []) as unknown) as FinanceEmployeeRow[]);
    } catch (error) {
      console.error("Failed to load finance employees:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!query) return true;
      const source = [row.code, row.mark, row.status, row.profile?.full_name, row.profile?.email, row.profile?.company, row.profile?.job_title]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return source.includes(query);
    });
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((row) => row.status === "active").length,
      inactive: rows.filter((row) => row.status === "inactive").length,
      archived: rows.filter((row) => row.status === "archived").length,
    };
  }, [rows]);

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-8 pt-2 sm:px-6 xl:px-8">
          <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/70 shadow-none">Master Data</Badge>
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200 shadow-none">Finance Employees</Badge>
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-white">Employees</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-white/55">
                    Finance reference view of operational employee records, aligned to finance employee codes and marks.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 xl:justify-end">
                <Button variant="outline" onClick={() => navigate("/finance/master-data")} className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10">
                  <ArrowLeft className="mr-2 h-4 w-4" />Back
                </Button>
                <Button variant="outline" onClick={() => void loadData()} className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10">
                  <RefreshCw className="mr-2 h-4 w-4" />Refresh
                </Button>
              </div>
            </div>
          </section>

          <section>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[
                ["Total Employees", stats.total, Users],
                ["Active", stats.active, User2],
                ["Inactive", stats.inactive, Briefcase],
                ["Archived", stats.archived, Shield],
              ].map(([label, value, Icon], index) => (
                <Card key={index} className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div><div className="text-xs uppercase tracking-[0.18em] text-white/35">{label}</div><div className="mt-2 text-3xl font-semibold text-white">{loading ? "—" : value}</div></div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/70"><Icon className="h-5 w-5" /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <Badge className="w-fit rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/65 shadow-none">Finance Reference Registry</Badge>
                  <CardTitle className="text-white">Employee Reference Records</CardTitle>
                  <CardDescription className="text-white/45">Search, filter, inspect, and open source employee records when needed.</CardDescription>
                </div>
                <div className="flex w-full flex-col gap-3 lg:max-w-[760px] lg:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees, codes, marks..." className="h-11 rounded-2xl border-white/10 bg-black/15 pl-10 text-white" />
                  </div>
                  <div className="flex gap-2">
                    {(["all", "active", "inactive", "archived"] as FilterStatus[]).map((value) => (
                      <Button key={value} type="button" variant="outline" onClick={() => setStatusFilter(value)} className={`h-11 rounded-2xl border-white/10 px-4 text-white ${statusFilter === value ? "bg-white/10" : "bg-black/15 hover:bg-white/10"}`}>
                        {value}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {loading ? (
                  <div className="col-span-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-10 text-center text-slate-400">Loading employees...</div>
                ) : filteredRows.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-10 text-center text-slate-400">No finance employee references found.</div>
                ) : (
                  filteredRows.map((row) => {
                    const Icon = getRoleIcon(row.profile?.role || null);
                    return (
                      <button key={row.id} type="button" onClick={() => setSelected(row)} className="rounded-[24px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.07]">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-lg font-semibold text-white">{row.profile?.full_name || "Unnamed User"}</div>
                              <Badge className={getStatusBadgeClass(row.status)}>{row.status}</Badge>
                              {row.mark ? <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200 shadow-none">{row.mark}</Badge> : null}
                            </div>
                            <div className="mt-2 text-sm text-white/45">{row.code}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/15 text-white/70"><Icon className="h-4 w-4" /></div>
                            <Button type="button" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/employees/${row.user_id}`); }} className="h-10 rounded-xl border-white/10 bg-black/15 px-3 text-white hover:bg-white/10">
                              <ExternalLink className="mr-2 h-4 w-4" />Source
                            </Button>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                          <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-white/80">{row.profile?.email || "—"}</div>
                          <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-white/80">{row.profile?.job_title || "—"}</div>
                          <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-white/80">{[row.profile?.city, row.profile?.country].filter(Boolean).join(", ") || "—"}</div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-[30px] border border-white/10 bg-[#0f1726] shadow-[0_25px_80px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
              <div><div className="text-xl font-semibold text-white">{selected.profile?.full_name || "Unnamed User"}</div><div className="mt-1 text-sm text-white/45">{selected.code}</div></div>
              <Button variant="outline" onClick={() => setSelected(null)} className="h-10 rounded-xl border-white/10 bg-black/15 px-3 text-white hover:bg-white/10"><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-black/15 p-4 text-white/80">Finance Status: <span className="text-white">{selected.status}</span></div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-4 text-white/80">Finance Mark: <span className="text-white">{selected.mark || "—"}</span></div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-4 text-white/80">Role: <span className="text-white">{selected.profile?.role || "—"}</span></div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-4 text-white/80">Source Status: <span className="text-white">{selected.profile?.status || "—"}</span></div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-4 text-white/80">Email: <span className="text-white">{selected.profile?.email || "—"}</span></div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-4 text-white/80">Phone: <span className="text-white">{selected.profile?.phone || "—"}</span></div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-4 text-white/80">Company: <span className="text-white">{selected.profile?.company || "—"}</span></div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-4 text-white/80">Job Title: <span className="text-white">{selected.profile?.job_title || "—"}</span></div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-4 text-white/80">Member Type: <span className="text-white">{selected.profile?.member_type || "—"}</span></div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-4 text-white/80">Location: <span className="text-white">{[selected.profile?.city, selected.profile?.country].filter(Boolean).join(", ") || "—"}</span></div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-4 text-white/80 md:col-span-2">Notes: <span className="text-white">{selected.notes || "—"}</span></div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-4 text-white/80 md:col-span-2">Updated: <span className="text-white">{formatDateLabel(selected.updated_at)}</span></div>
            </div>
            <div className="flex justify-end gap-3 border-t border-white/8 px-6 py-5">
              <Button variant="outline" onClick={() => navigate(`/employees/${selected.user_id}`)} className="h-11 rounded-2xl border-white/10 bg-black/15 px-4 text-white hover:bg-white/10">
                <ExternalLink className="mr-2 h-4 w-4" />Open Source Record
              </Button>
              <Button variant="outline" onClick={() => setSelected(null)} className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10">Close</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
