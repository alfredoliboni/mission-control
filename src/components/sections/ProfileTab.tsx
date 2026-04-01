"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface KeyValueListProps {
  data: Record<string, string>;
  exclude?: string[];
}

export function KeyValueList({ data, exclude = [] }: KeyValueListProps) {
  const entries = Object.entries(data).filter(
    ([key, value]) => value && !exclude.includes(key)
  );

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-xs font-medium text-warm-400 uppercase tracking-wider mb-0.5">
            {key.replace(/_/g, " ")}
          </dt>
          <dd className="text-sm text-foreground">{value}</dd>
        </div>
      ))}
    </div>
  );
}

interface DataTableProps {
  headers: string[];
  rows: Record<string, string>[];
  keyField?: string;
}

export function DataTable({ headers, rows, keyField }: DataTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-warm-400 italic">No data available</p>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead
                key={h}
                className="text-xs font-semibold uppercase tracking-wider"
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={keyField ? row[keyField] : i}>
              {headers.map((h) => {
                const key = h.toLowerCase().replace(/\s+/g, "_");
                return (
                  <TableCell key={h} className="text-sm">
                    {row[key] || "—"}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
