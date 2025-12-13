import { useCallback, useEffect, useState } from "react";
import "./Operation.css";

const PAGE_SIZE = 50;

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const getSafeTime = (value: Date) => {
  const time = value.getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

const formatTimestamp = (value: Date) => {
  const time = value.getTime();
  if (Number.isNaN(time)) {
    return "未知时间";
  }
  return `${dateFormatter.format(value)} ${timeFormatter.format(value)}`;
};
const formatChanges = (input: string) => {
  if (!input?.trim()) {
    return "";
  }
  try {
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    return input;
  }
};

const getFilterDate = (value: string) =>
  value ? new Date(`${value}T00:00:00`) : undefined;

type OperationLogItem = OperationLog & { created: Date };

export const ManageOperationPage = () => {
  const [logs, setLogs] = useState<OperationLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const requestLogs = useCallback(
    async ({ offset, replace }: { offset: number; replace: boolean }) => {
      if (replace) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      try {
        const keyword = search.trim();
        const selectedDate = getFilterDate(dateFilter);
        const result = await window.data.operation.list(
          PAGE_SIZE,
          offset,
          selectedDate,
          keyword.length ? keyword : undefined,
        );
        const normalized = result
          .map((log) => ({
            ...log,
            created: new Date(log.created),
          }))
          .sort((a, b) => getSafeTime(b.created) - getSafeTime(a.created));
        setLogs((current) => {
          if (replace) {
            return normalized;
          }
          if (current.length !== offset) {
            return current;
          }
          return [...current, ...normalized];
        });
        setHasMore(result.length === PAGE_SIZE);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (replace) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [dateFilter, search],
  );

  const loadLatest = useCallback(
    () => requestLogs({ offset: 0, replace: true }),
    [requestLogs],
  );

  useEffect(() => {
    loadLatest();
  }, [loadLatest]);

  useEffect(() => {
    const dispose = window.data.onChanged(() => {
      loadLatest();
    });
    return () => {
      dispose?.();
    };
  }, [loadLatest]);

  useEffect(() => {
    setExpanded(new Set());
  }, [dateFilter, search]);

  useEffect(() => {
    setExpanded((current) => {
      if (!current.size) {
        return current;
      }
      const ids = new Set(logs.map((log) => log.id));
      let changed = false;
      const next = new Set<string>();
      current.forEach((id) => {
        if (ids.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [logs]);

  const toggleExpanded = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const applyAction = async (log: OperationLogItem) => {
    if (pendingAction) {
      return;
    }
    const latest = logs.find((item) => item.id === log.id);
    if (!latest) {
      setError("操作记录不存在或已更新。");
      return;
    }
    const isUndoAction = !latest.reverted;

    const targetIndex = logs.findIndex((item) => item.id === log.id);
    if (targetIndex === -1) {
      setError("无法定位到该操作记录。");
      return;
    }
    const laterLogs = targetIndex <= 0 ? [] : logs.slice(0, targetIndex);
    const restoredLater: OperationLogItem[] = [];

    setPendingAction(log.id);
    setError(null);
    try {
      for (const entry of laterLogs) {
        if (!entry.reverted) {
          await window.data.operation.undo(entry.id);
          restoredLater.push(entry);
        }
      }

      if (isUndoAction) {
        await window.data.operation.undo(latest.id);
      } else {
        await window.data.operation.redo(latest.id);
      }

      for (let index = restoredLater.length - 1; index >= 0; index -= 1) {
        await window.data.operation.redo(restoredLater[index].id);
      }

      await loadLatest();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPendingAction(null);
    }
  };

  const handleClearDate = () => setDateFilter("");
  const trimmedSearch = search.trim();

  return (
    <div className="operation-panel">
      <h2>操作日志</h2>
      <div className="operation-controls">
        <div className="operation-control-group">
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            aria-label="按日期筛选"
          />
          <button
            type="button"
            className="flat"
            onClick={handleClearDate}
            disabled={!dateFilter}
          >
            清除日期
          </button>
        </div>
        <input
          type="search"
          placeholder="搜索描述、类型或详情"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
          type="button"
          className="outline"
          onClick={loadLatest}
          disabled={loading}
        >
          {loading ? "刷新中" : "刷新"}
        </button>
      </div>

      <div className="operation-stats">
        <span>已加载 {logs.length} 条</span>
        {dateFilter && <span>筛选日期：{dateFilter}</span>}
        {trimmedSearch && <span>搜索：{trimmedSearch}</span>}
        {!loading && hasMore && <span>可继续加载更多</span>}
      </div>

      {error && <div className="operation-error">{error}</div>}

      <div className="operation-list">
        {loading && !logs.length ? (
          <div className="operation-placeholder">正在加载操作日志…</div>
        ) : null}
        {!loading && !logs.length ? (
          <div className="operation-placeholder">没有匹配的操作记录。</div>
        ) : null}
        {logs.map((log) => {
          const expandedRow = expanded.has(log.id);
          const actionLabel = log.reverted ? "重做" : "撤销";
          const changes = formatChanges(log.changes);
          return (
            <div
              key={log.id}
              className={`operation-entry${log.reverted ? " operation-entry--reverted" : ""}`}
            >
              <div className="operation-row">
                <button
                  type="button"
                  className="operation-row-trigger"
                  onClick={() => toggleExpanded(log.id)}
                  aria-expanded={expandedRow}
                >
                  <span className="operation-row-time">
                    {formatTimestamp(log.created)}
                  </span>
                  <span className="operation-row-description">
                    {log.description || "（无描述）"}
                  </span>
                </button>
                <button
                  type="button"
                  className={`operation-row-action ${log.reverted ? "redo" : "undo"}`}
                  onClick={() => applyAction(log)}
                  disabled={Boolean(pendingAction)}
                >
                  {pendingAction === log.id ? "执行中…" : actionLabel}
                </button>
              </div>
              {expandedRow && (
                <div className="operation-details">
                  <div className="operation-detail-meta">
                    <span>类型：{log.type}</span>
                    <span>状态：{log.reverted ? "已撤销" : "已生效"}</span>
                  </div>
                  {changes ? (
                    <pre className="operation-detail-data">{changes}</pre>
                  ) : (
                    <div className="operation-detail-data">
                      没有附加变更数据。
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasMore && logs.length > 0 && (
        <div className="operation-load-more">
          <button
            type="button"
            className="outline"
            onClick={() => requestLogs({ offset: logs.length, replace: false })}
            disabled={loadingMore || Boolean(pendingAction)}
          >
            {loadingMore ? "加载中…" : `加载更多（+${PAGE_SIZE}）`}
          </button>
        </div>
      )}
    </div>
  );
};
