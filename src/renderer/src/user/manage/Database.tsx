import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TableColumnInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
};

const ROW_LIMIT = 200;

const quoteIdentifier = (value: string) => `"${value.replace(/"/g, '""')}"`;

const formatCellValue = (value: unknown) => {
  if (value === null || typeof value === "undefined") {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const DataGrid = ({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
}) => {
  if (!columns.length) {
    return <p>没有可展示的列。</p>;
  }

  return (
    <div style={{ overflow: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.9rem",
        }}
      >
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                style={{
                  textAlign: "left",
                  padding: "0.35rem 0.5rem",
                  borderBottom: "1px solid var(--gray-tinted-4)",
                  backgroundColor: "var(--gray-tinted-2)",
                  position: "sticky",
                  top: 0,
                }}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, idx) => (
              <tr key={idx}>
                {columns.map((column) => (
                  <td
                    key={column}
                    style={{
                      padding: "0.35rem 0.5rem",
                      borderBottom: "1px solid var(--gray-tinted-4)",
                      verticalAlign: "top",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {formatCellValue(row[column])}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: "0.4rem",
                  textAlign: "center",
                  color: "var(--gray-tinted-6)",
                }}
              >
                没有数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export const ManageDatabasePage = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);

  const [tableColumns, setTableColumns] = useState<TableColumnInfo[]>([]);
  const [tableRows, setTableRows] = useState<Record<string, unknown>[]>([]);
  const [tableError, setTableError] = useState<string | null>(null);
  const [tableLoading, setTableLoading] = useState(false);

  const [sql, setSql] = useState(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;",
  );
  const [sqlResultRows, setSqlResultRows] = useState<
    Record<string, unknown>[] | null
  >(null);
  const [sqlMessage, setSqlMessage] = useState<string>("");
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlRunning, setSqlRunning] = useState(false);

  const tableRequestRef = useRef(0);

  const loadTables = useCallback(async (): Promise<string> => {
    setTablesLoading(true);
    setTablesError(null);
    try {
      const rows = await window.data.database.all<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      );
      const names = rows.map((row) => row.name);
      setTables(names);
      let next = "";
      setSelectedTable((prev) => {
        const resolved = prev && names.includes(prev) ? prev : (names[0] ?? "");
        next = resolved;
        return resolved;
      });
      return next;
    } catch (error) {
      setTables([]);
      setSelectedTable("");
      setTablesError(error instanceof Error ? error.message : String(error));
      return "";
    } finally {
      setTablesLoading(false);
    }
  }, []);

  const loadTableData = useCallback(async (table: string) => {
    const requestId = ++tableRequestRef.current;
    if (!table) {
      setTableColumns([]);
      setTableRows([]);
      setTableError(null);
      setTableLoading(false);
      return;
    }
    setTableLoading(true);
    setTableError(null);
    try {
      const identifier = quoteIdentifier(table);
      const columns = await window.data.database.all<TableColumnInfo>(
        `PRAGMA table_info(${identifier})`,
      );
      const rows = await window.data.database.all<Record<string, unknown>>(
        `SELECT * FROM ${identifier} LIMIT ${ROW_LIMIT}`,
      );
      if (tableRequestRef.current !== requestId) {
        return;
      }
      setTableColumns(columns);
      setTableRows(rows);
    } catch (error) {
      if (tableRequestRef.current !== requestId) {
        return;
      }
      setTableColumns([]);
      setTableRows([]);
      setTableError(error instanceof Error ? error.message : String(error));
    } finally {
      if (tableRequestRef.current === requestId) {
        setTableLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadTables();
  }, [loadTables]);

  useEffect(() => {
    void loadTableData(selectedTable);
  }, [selectedTable, loadTableData]);

  const tableColumnNames = useMemo(() => {
    if (tableColumns.length) {
      return tableColumns.map((column) => column.name);
    }
    if (tableRows.length) {
      return Object.keys(tableRows[0]);
    }
    return [];
  }, [tableColumns, tableRows]);

  const sqlResultColumns = useMemo(() => {
    if (!sqlResultRows || !sqlResultRows.length) {
      return [];
    }
    const columns = new Set<string>();
    for (const row of sqlResultRows) {
      for (const key of Object.keys(row)) {
        columns.add(key);
      }
    }
    return Array.from(columns);
  }, [sqlResultRows]);

  const executeSql = useCallback(async () => {
    const statement = sql.trim();
    if (!statement) {
      return;
    }
    setSqlRunning(true);
    setSqlError(null);
    setSqlMessage("");
    try {
      if (/^select/i.test(statement)) {
        const rows =
          await window.data.database.all<Record<string, unknown>>(statement);
        setSqlResultRows(rows);
        setSqlMessage(`返回 ${rows.length} 行`);
      } else {
        await window.data.database.execute(statement);
        setSqlResultRows(null);
        setSqlMessage("执行完成");
        const previousTable = selectedTable;
        const nextTable = await loadTables();
        if (nextTable === previousTable) {
          await loadTableData(nextTable);
        }
      }
    } catch (error) {
      setSqlError(error instanceof Error ? error.message : String(error));
    } finally {
      setSqlRunning(false);
    }
  }, [sql, loadTables, loadTableData, selectedTable]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <section
        style={{
          padding: "0.75rem 0",
          borderBottom: "1px solid var(--gray-tinted-3)",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0 }}>数据表</h3>
          <button
            className="flat"
            onClick={() => void loadTables()}
            disabled={tablesLoading}
          >
            {tablesLoading ? "刷新中..." : "刷新"}
          </button>
        </header>
        {tablesError ? (
          <p style={{ color: "var(--color-danger, #b00020)" }}>{tablesError}</p>
        ) : null}
        <select
          value={selectedTable}
          onChange={(event) => setSelectedTable(event.target.value)}
          style={{ marginTop: "0.5rem", maxWidth: "20rem" }}
        >
          {tables.map((table) => (
            <option key={table} value={table}>
              {table}
            </option>
          ))}
        </select>
        {!tables.length && !tablesError ? <p>数据库中没有用户表。</p> : null}
      </section>

      <section
        style={{
          padding: "0.75rem 0",
          borderBottom: "1px solid var(--gray-tinted-3)",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>{selectedTable || "数据"}</h3>
            {selectedTable ? (
              <small style={{ color: "var(--gray-tinted-6)" }}>
                显示前 {ROW_LIMIT} 行
              </small>
            ) : null}
          </div>
          <button
            className="flat"
            onClick={() => void loadTableData(selectedTable)}
            disabled={tableLoading}
          >
            {tableLoading ? "加载中..." : "重新加载"}
          </button>
        </header>
        {tableError ? (
          <p style={{ color: "var(--color-danger, #b00020)" }}>{tableError}</p>
        ) : null}
        {selectedTable && tableColumns.length ? (
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>列：</strong>
            <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
              {tableColumns.map((column) => (
                <li key={column.cid}>
                  {column.name} ({column.type || "TEXT"})
                  {column.pk ? " · 主键" : ""}
                  {column.notnull ? " · NOT NULL" : ""}
                  {column.dflt_value !== null
                    ? ` · 默认 ${column.dflt_value}`
                    : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <DataGrid columns={tableColumnNames} rows={tableRows} />
      </section>

      <section style={{ padding: "0.75rem 0" }}>
        <h3 style={{ marginTop: 0 }}>执行 SQL</h3>
        <textarea
          value={sql}
          onChange={(event) => setSql(event.target.value)}
          rows={6}
          spellCheck={false}
          style={{ width: "100%", marginBottom: "0.5rem" }}
        />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="primary"
            onClick={() => void executeSql()}
            disabled={sqlRunning}
          >
            {sqlRunning ? "执行中..." : "执行"}
          </button>
          <button
            className="flat"
            onClick={() =>
              setSql(
                "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;",
              )
            }
            disabled={sqlRunning}
          >
            重置示例
          </button>
        </div>
        {sqlError ? (
          <p style={{ color: "var(--color-danger, #b00020)" }}>{sqlError}</p>
        ) : null}
        {sqlMessage ? <p>{sqlMessage}</p> : null}
        {sqlResultRows && sqlResultRows.length ? (
          <div style={{ marginTop: "0.5rem" }}>
            <DataGrid columns={sqlResultColumns} rows={sqlResultRows} />
          </div>
        ) : null}
      </section>
    </div>
  );
};
