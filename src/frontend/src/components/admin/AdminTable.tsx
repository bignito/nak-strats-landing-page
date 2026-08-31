import type React from "react";

interface AdminTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
}

interface AdminTableProps<T> {
  columns: Array<AdminTableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}

/**
 * Shared dense admin table. Uses the `.admin-table-dense` design tokens:
 * tight 0.375rem/0.625rem cells, uppercase grey headers, and right-aligned
 * JetBrains Mono tabular numerics for any column with `align: "right"`.
 */
export function AdminTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "No records.",
}: AdminTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div
        className="admin-panel-body"
        style={{ color: "var(--muted-foreground)" }}
        data-ocid="admin.table_empty_state"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="admin-table-dense" data-ocid="admin.table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.align === "right" ? "num-col" : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row)} data-ocid={`admin.table.row.${index + 1}`}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={col.align === "right" ? "num-col" : undefined}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
