import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DELIVERY_STATUS_OPTIONS,
  PDF_STATUS_OPTIONS,
  REQUEST_STATUS_OPTIONS,
  deliveryStatusLabel,
  pdfStatusLabel,
  requestStatusLabel,
} from "@/lib/admin/labels";
import {
  DeliveryStatusBadge,
  PdfStatusBadge,
  RequestStatusBadge,
} from "./status-badge";

export interface AdminRequestRow {
  id: string;
  instagram_username: string;
  request_status: string;
  pdf_status: string;
  delivery_status: string;
  pdf_storage_path: string | null;
  email_sent_at: string | null;
  pdf_generated_at: string | null;
  is_free_request: boolean;
  analysis_snapshot_id: string | null;
  created_at: string;
  updated_at: string;
  lead: { id: string; name: string | null; email: string | null } | null;
}

interface ListResponse {
  success: boolean;
  rows: AdminRequestRow[];
  total: number;
  page: number;
  pageSize: number;
}

interface RequestListProps {
  onSelect: (row: AdminRequestRow) => void;
  refreshKey: number;
}

const ANY_VALUE = "__any__";

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "short",
  timeStyle: "short",
});

export function RequestList({ onSelect, refreshKey }: RequestListProps) {
  const [status, setStatus] = useState<string>("");
  const [pdf, setPdf] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (pdf) sp.set("pdf", pdf);
    if (email) sp.set("email", email);
    if (q.trim()) sp.set("q", q.trim());
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    return sp.toString();
  }, [status, pdf, email, q, page, pageSize]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/report-requests?${queryString}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as Partial<ListResponse> & {
          message?: string;
        };
        if (!res.ok || !body.success) {
          throw new Error(body.message ?? "Falha ao carregar pedidos.");
        }
        if (!cancelled) setData(body as ListResponse);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro inesperado.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryString, refreshKey]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  function resetFilters() {
    setStatus("");
    setPdf("");
    setEmail("");
    setQ("");
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[2fr_repeat(3,1fr)_auto]">
        <Input
          placeholder="Procurar por username ou email"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={status || ANY_VALUE}
          onValueChange={(v) => {
            setStatus(v === ANY_VALUE ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Estado do pedido" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>Estado do pedido — todos</SelectItem>
            {REQUEST_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {requestStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={pdf || ANY_VALUE}
          onValueChange={(v) => {
            setPdf(v === ANY_VALUE ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Estado do PDF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>Estado do PDF — todos</SelectItem>
            {PDF_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {pdfStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={email || ANY_VALUE}
          onValueChange={(v) => {
            setEmail(v === ANY_VALUE ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Estado do email" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>Estado do email — todos</SelectItem>
            {DELIVERY_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {deliveryStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={resetFilters} type="button">
          Limpar
        </Button>
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface-elevated">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>PDF</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-content-secondary">
                  A carregar…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-signal-danger">
                  {error}
                </TableCell>
              </TableRow>
            ) : !data || data.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-content-secondary">
                  Sem pedidos registados.
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-content-secondary">
                    {dateFormatter.format(new Date(row.created_at))}
                  </TableCell>
                  <TableCell className="font-medium text-content-primary">
                    @{row.instagram_username}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm text-content-primary">
                        {row.lead?.name ?? "—"}
                      </span>
                      <span className="text-xs text-content-tertiary">
                        {row.lead?.email ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RequestStatusBadge value={row.request_status} />
                  </TableCell>
                  <TableCell>
                    <PdfStatusBadge value={row.pdf_status} />
                  </TableCell>
                  <TableCell>
                    <DeliveryStatusBadge value={row.delivery_status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelect(row)}
                    >
                      Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-content-secondary">
        <span>
          {data ? `${data.total} pedido${data.total === 1 ? "" : "s"}` : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="font-mono text-xs">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Seguinte
          </Button>
        </div>
      </div>
    </div>
  );
}
