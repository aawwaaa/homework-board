import { randomId } from "@renderer/util";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./Student.css";

const GROUP_PLACEHOLDER = "未分组";
const FEEDBACK_DISPLAY_MS = 4000;
const CLEAR_CONFIRM_MS = 3500;

const getGroupLabel = (value: string) => (value?.trim().length ? value.trim() : GROUP_PLACEHOLDER);

const parseCsv = (input: string): string[][] => {
    const rows: string[][] = [];
    let current = "";
    let row: string[] = [];
    let quoting = false;

    for (let i = 0; i < input.length; i += 1) {
        const char = input[i];
        if (char === "\"") {
            if (quoting && input[i + 1] === "\"") {
                current += "\"";
                i += 1;
            } else {
                quoting = !quoting;
            }
            continue;
        }
        if (!quoting && (char === "\n" || char === "\r")) {
            if (char === "\r" && input[i + 1] === "\n") {
                i += 1;
            }
            row.push(current.trim());
            if (row.some((cell) => cell.length > 0)) {
                rows.push(row);
            }
            current = "";
            row = [];
            continue;
        }
        if (!quoting && char === ",") {
            row.push(current.trim());
            current = "";
            continue;
        }
        current += char;
    }

    if (current.length || row.length) {
        row.push(current.trim());
        if (row.some((cell) => cell.length > 0)) {
            rows.push(row);
        }
    }

    return rows;
};

const guessColumnIndex = (columns: string[], keywords: string[]): string | null => {
    const normalized = columns.map((value) => value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, ""));
    for (const keyword of keywords) {
        const index = normalized.findIndex((value) => value.includes(keyword));
        if (index !== -1) {
            return String(index);
        }
    }
    return null;
};

const StudentRow = ({ student, onChange, onRemove }: { student: Student; onChange: (student: Student) => void; onRemove: (id: string) => void }) => {
    const handleChange = (key: keyof Student) => (event: ChangeEvent<HTMLInputElement>) => {
        onChange({ ...student, [key]: event.target.value });
    };

    return (
        <div className="student-row">
            <span className="student-id" title={student.id}>
                {student.id}
            </span>
            <input type="text" value={student.group} placeholder="组别" onChange={handleChange("group")} />
            <input type="text" value={student.name} placeholder="姓名" onChange={handleChange("name")} />
            <button className="danger" onClick={() => onRemove(student.id)}>
                删除
            </button>
        </div>
    );
};

type ImportSummary = {
    added: number;
    updated: number;
};

type StudentImportPanelProps = {
    students: Student[];
    onImported: (summary: ImportSummary | null) => void;
};

const StudentImportPanel = ({ students, onImported }: StudentImportPanelProps) => {
    const [csvText, setCsvText] = useState("");
    const [idColumn, setIdColumn] = useState<string>("");
    const [groupColumn, setGroupColumn] = useState<string>("");
    const [nameColumn, setNameColumn] = useState<string>("");
    const [importError, setImportError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const rows = useMemo(() => parseCsv(csvText), [csvText]);

    const { columns, dataRows } = useMemo(() => {
        if (!rows.length) {
            return { columns: [] as string[], dataRows: [] as string[][] };
        }
        if (rows.length === 1) {
            const fallback = rows[0].map((_, index) => `列 ${index + 1}`);
            return { columns: fallback, dataRows: [rows[0]] };
        }
        const [header, ...rest] = rows;
        const normalizedHeader = header.map((value, index) => value || `列 ${index + 1}`);
        const filteredRows = rest.filter((row) => row.some((cell) => cell.trim().length));
        return { columns: normalizedHeader, dataRows: filteredRows };
    }, [rows]);

    useEffect(() => {
        if (!columns.length) {
            setIdColumn("");
            setGroupColumn("");
            setNameColumn("");
            return;
        }
        setIdColumn((prev) => (prev && Number(prev) < columns.length ? prev : guessColumnIndex(columns, ["id", "学号", "编号"]) ?? ""));
        setGroupColumn((prev) => (prev && Number(prev) < columns.length ? prev : guessColumnIndex(columns, ["group", "班", "班级", "组"]) ?? ""));
        setNameColumn((prev) => (prev && Number(prev) < columns.length ? prev : guessColumnIndex(columns, ["name", "姓名", "学生"]) ?? ""));
    }, [columns]);

    const columnOptions = useMemo(
        () =>
            columns.map((title, index) => {
                const sample = dataRows.find((row) => row[index]?.trim().length)?.[index] ?? "";
                return {
                    value: String(index),
                    label: sample ? `${title} · ${sample}` : title,
                };
            }),
        [columns, dataRows]
    );

    const handleCsvChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setCsvText(event.target.value);
        setImportError(null);
    };

    const canSubmit = Boolean(dataRows.length && idColumn !== "" && groupColumn !== "" && nameColumn !== "");

    const handleImport = async () => {
        setImportError(null);
        if (!canSubmit) {
            setImportError("请先选择每一列对应的字段。");
            return;
        }
        const idIndex = Number(idColumn);
        const groupIndex = Number(groupColumn);
        const nameIndex = Number(nameColumn);
        const mapped = dataRows
            .map((row) => ({
                id: row[idIndex]?.trim() ?? "",
                group: row[groupIndex]?.trim() ?? "",
                name: row[nameIndex]?.trim() ?? "",
            }))
            .filter((student) => student.id.length && student.name.length);

        if (!mapped.length) {
            setImportError("没有可导入的数据行。");
            return;
        }

        const deduped = new Map<string, Student>();
        mapped.forEach((student) => {
            deduped.set(student.id, student);
        });

        const existing = new Map(students.map((student) => [student.id, student] as const));

        setSubmitting(true);
        try {
            let added = 0;
            let updated = 0;
            for (const student of deduped.values()) {
                if (existing.has(student.id)) {
                    await window.data.student.update(student);
                    updated += 1;
                } else {
                    await window.data.student.add(student);
                    added += 1;
                }
            }
            onImported({ added, updated });
            setCsvText("");
        } catch (error) {
            setImportError(error instanceof Error ? error.message : String(error));
        } finally {
            setSubmitting(false);
        }
    };

    const previewRows = dataRows.slice(0, 6);

    return (
        <div className="student-import-panel">
            <div className="student-import-grid">
                <label className="student-field">
                    <span>CSV 数据</span>
                    <textarea value={csvText} placeholder="粘贴带有表头的 CSV 内容" onChange={handleCsvChange} />
                </label>
                <div className="student-import-mapping">
                    <label>
                        <span>id 列</span>
                        <select value={idColumn} onChange={(event) => setIdColumn(event.target.value)}>
                            <option value="">请选择</option>
                            {columnOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span>group 列</span>
                        <select value={groupColumn} onChange={(event) => setGroupColumn(event.target.value)}>
                            <option value="">请选择</option>
                            {columnOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span>name 列</span>
                        <select value={nameColumn} onChange={(event) => setNameColumn(event.target.value)}>
                            <option value="">请选择</option>
                            {columnOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>
            {importError ? (
                <p className="student-error" role="alert">
                    {importError}
                </p>
            ) : null}
            <div className="student-import-preview">
                {columns.length ? (
                    <table>
                        <thead>
                            <tr>
                                {columns.map((column, index) => (
                                    <th key={column + index}>{column}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {previewRows.length ? (
                                previewRows.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {columns.map((_, columnIndex) => (
                                            <td key={`${rowIndex}-${columnIndex}`}>{row[columnIndex] ?? ""}</td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} className="student-import-empty">
                                        暂无可预览的数据
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <p className="student-import-placeholder">等待解析 CSV ...</p>
                )}
            </div>
            <div className="student-import-actions">
                <button className="primary" disabled={!canSubmit || submitting} onClick={handleImport}>
                    确认
                </button>
                <button className="flat" onClick={() => onImported(null)}>
                    取消
                </button>
            </div>
        </div>
    );
};

export const ManageStudentPage = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [addDrawerOpen, setAddDrawerOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [addDraft, setAddDraft] = useState<{ id: string; group: string; name: string }>({ id: "", group: "", name: "" });
    const [addError, setAddError] = useState<string | null>(null);
    const [addSubmitting, setAddSubmitting] = useState(false);
    const [clearConfirm, setClearConfirm] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const preventUpdateRef = useRef(false);
    const clearTimer = useRef<number | null>(null);
    const feedbackTimer = useRef<number | null>(null);

    const announce = useCallback((message: string) => {
        if (feedbackTimer.current) {
            window.clearTimeout(feedbackTimer.current);
        }
        setFeedback(message);
        feedbackTimer.current = window.setTimeout(() => {
            setFeedback(null);
        }, FEEDBACK_DISPLAY_MS);
    }, []);

    const loadStudents = useCallback(async () => {
        if (preventUpdateRef.current) {
            return;
        }
        const next = await window.data.student.list();
        setStudents(next);
    }, []);

    useEffect(() => {
        const dispose = window.data.onChanged(loadStudents);
        return () => {
            dispose?.();
            if (clearTimer.current) {
                window.clearTimeout(clearTimer.current);
            }
            if (feedbackTimer.current) {
                window.clearTimeout(feedbackTimer.current);
            }
        };
    }, [loadStudents]);

    const groupedStudents = useMemo(() => {
        const groups = new Map<string, Student[]>();
        students.forEach((student) => {
            const label = getGroupLabel(student.group);
            if (!groups.has(label)) {
                groups.set(label, []);
            }
            groups.get(label)!.push(student);
        });
        return Array.from(groups.entries()).map(([group, list]) => [group, [...list]] as const);
    }, [students]);

    const updateStudent = useCallback(async (student: Student) => {
        preventUpdateRef.current = true;
        setStudents((current) => current.map((item) => (item.id === student.id ? student : item)));
        try {
            await window.data.student.update(student);
        } finally {
            preventUpdateRef.current = false;
        }
    }, []);

    const removeStudent = useCallback(async (id: string) => {
        await window.data.student.remove(id);
        announce("已删除学生");
    }, [announce]);

    const handleAddInput = (key: keyof Student) => (event: ChangeEvent<HTMLInputElement>) => {
        setAddDraft((draft) => ({ ...draft, [key]: event.target.value }));
        setAddError(null);
    };

    const handleGenerateId = () => {
        setAddDraft((draft) => ({ ...draft, id: randomId() }));
    };

    const handleAddStudent = async () => {
        const payload = {
            id: addDraft.id.trim(),
            group: addDraft.group.trim(),
            name: addDraft.name.trim(),
        } satisfies Student;
        if (!payload.id || !payload.name) {
            setAddError("ID 和姓名不能为空。");
            return;
        }
        if (students.some((student) => student.id === payload.id)) {
            setAddError("ID 已存在。");
            return;
        }
        setAddSubmitting(true);
        try {
            await window.data.student.add(payload);
            setAddDraft({ id: "", group: "", name: "" });
            setAddDrawerOpen(false);
            announce("已添加新学生");
        } catch (error) {
            setAddError(error instanceof Error ? error.message : String(error));
        } finally {
            setAddSubmitting(false);
        }
    };

    const handleClear = async () => {
        if (!students.length || clearing) {
            return;
        }
        if (!clearConfirm) {
            setClearConfirm(true);
            if (clearTimer.current) {
                window.clearTimeout(clearTimer.current);
            }
            clearTimer.current = window.setTimeout(() => setClearConfirm(false), CLEAR_CONFIRM_MS);
            return;
        }
        setClearConfirm(false);
        if (clearTimer.current) {
            window.clearTimeout(clearTimer.current);
        }
        setClearing(true);
        try {
            await window.data.student.clear();
            announce("已清空学生列表");
        } finally {
            setClearing(false);
        }
    };

    const handleImportResult = (summary: ImportSummary | null) => {
        setImportOpen(false);
        if (summary) {
            const parts = [] as string[];
            if (summary.added) {
                parts.push(`新增 ${summary.added}`);
            }
            if (summary.updated) {
                parts.push(`更新 ${summary.updated}`);
            }
            announce(parts.length ? `${parts.join("，")} 名学生` : "没有可导入的数据");
        }
    };

    const addDisabled = !addDraft.id.trim() || !addDraft.name.trim();

    return (
        <div className="student-manage">
            {feedback ? (
                <div className="student-feedback" role="status">
                    {feedback}
                </div>
            ) : null}
            <div className="student-groups">
                {groupedStudents.length ? (
                    groupedStudents.map(([group, list]) => (
                        <section key={group} className="student-group">
                            <header className="student-group-header">
                                <span>{group}</span>
                                <span className="student-group-count">{list.length} 人</span>
                            </header>
                            {list.map((student) => (
                                <StudentRow key={student.id} student={student} onChange={updateStudent} onRemove={removeStudent} />
                            ))}
                        </section>
                    ))
                ) : (
                    <p className="student-empty">暂无学生，尝试手动添加或从 CSV 导入。</p>
                )}
            </div>
            <div className="student-toolbar">
                <div className="student-actions">
                    <button className="primary" onClick={() => setAddDrawerOpen((open) => !open)}>
                        添加
                    </button>
                    <button className={clearConfirm ? "danger" : "outline"} disabled={!students.length || clearing} onClick={handleClear}>
                        {clearConfirm ? "确认清空?" : "清空"}
                    </button>
                    <button className="secondary" onClick={() => setImportOpen((open) => !open)}>
                        从CSV导入
                    </button>
                </div>
                {addDrawerOpen ? (
                    <div className="student-add-panel">
                        <div className="student-add-grid">
                            <label className="student-field">
                                <div className="student-add-id">
                                    <input type="text" value={addDraft.id} onChange={handleAddInput("id")} placeholder="唯一 ID" />
                                    <button type="button" className="flat" onClick={handleGenerateId}>生成</button>
                                </div>
                            </label>
                            <label className="student-field">
                                <input type="text" value={addDraft.group} onChange={handleAddInput("group")} placeholder="班级 / 组" />
                            </label>
                            <label className="student-field">
                                <input type="text" value={addDraft.name} onChange={handleAddInput("name")} placeholder="姓名" />
                            </label>
                        </div>
                        {addError ? (
                            <p className="student-error" role="alert">
                                {addError}
                            </p>
                        ) : null}
                        <div className="student-add-actions">
                            <button className="primary" disabled={addDisabled || addSubmitting} onClick={handleAddStudent}>
                                确认添加
                            </button>
                            <button className="flat" onClick={() => setAddDrawerOpen(false)}>
                                取消
                            </button>
                        </div>
                    </div>
                ) : null}
                {importOpen ? <StudentImportPanel students={students} onImported={handleImportResult} /> : null}
            </div>
        </div>
    );
};
