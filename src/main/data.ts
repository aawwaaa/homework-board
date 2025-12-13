import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

const randomId = () => Math.random().toString(36).slice(2);

const dbPath = path.join(app.getPath('userData'), 'data.db');
const db = new Database(dbPath);

type SQLParams = unknown[];

const run = (sql: string, params: SQLParams = []) => {
    const stmt = db.prepare(sql);
    return stmt.run(...(params as unknown[]));
};

const getRow = <T>(sql: string, params: SQLParams = []) => {
    const stmt = db.prepare(sql);
    return stmt.get(...(params as unknown[])) as T | undefined;
};

const allRows = <T>(sql: string, params: SQLParams = []) => {
    const stmt = db.prepare(sql);
    return stmt.all(...(params as unknown[])) as T[];
};

const onChangedHandlers: Array<() => void> = [];
function emitChange() {
    for (const handler of onChangedHandlers) {
        handler();
    }
}

const ready = (async () => {
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    run('CREATE TABLE IF NOT EXISTS subjects (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL, config TEXT NOT NULL)');
    run(`CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        created INTEGER NOT NULL,
        deadline INTEGER NOT NULL,
        estimated INTEGER NOT NULL,
        spent INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        priority INTEGER NOT NULL,
        config TEXT NOT NULL,
        FOREIGN KEY(subject) REFERENCES subjects(id) ON DELETE CASCADE
    )`);
    run('CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, name TEXT NOT NULL, [group] TEXT NOT NULL)');
    run(`CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        assignment TEXT NOT NULL,
        student TEXT NOT NULL,
        created INTEGER NOT NULL,
        spent INTEGER,
        feedback TEXT,
        FOREIGN KEY(assignment) REFERENCES assignments(id) ON DELETE CASCADE,
        FOREIGN KEY(student) REFERENCES students(id) ON DELETE CASCADE
    )`);
    run('CREATE TABLE IF NOT EXISTS operation_logs (id TEXT PRIMARY KEY, description TEXT NOT NULL, created INTEGER NOT NULL, type TEXT NOT NULL, changes TEXT NOT NULL, reverted BOOLEAN NOT NULL)');
    run('CREATE TABLE IF NOT EXISTS identities (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL)');
    run('CREATE TABLE IF NOT EXISTS components (id TEXT PRIMARY KEY, x INTEGER NOT NULL, y INTEGER NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, type TEXT NOT NULL, config TEXT NOT NULL)');
    run(`CREATE TABLE IF NOT EXISTS day_record (
        date TEXT,
        assignment TEXT,
        subject TEXT,
        taken INTEGER NOT NULL,
        FOREIGN KEY(assignment) REFERENCES assignments(id) ON DELETE SET NULL,
        FOREIGN KEY(subject) REFERENCES subjects(id) ON DELETE SET NULL
    )`);
    run(`CREATE TABLE IF NOT EXISTS assignment_tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL
    )`);

    await ensureAdminIdentity();
})().catch(err => {
    console.error('Failed to initialize database', err);
    throw err;
});

type SubjectRow = Omit<Subject, 'config'> & {
    config: string;
};

type AssignmentRow = {
    id: string;
    subject: string;
    created: number;
    deadline: number;
    estimated: number;
    spent: number;
    title: string;
    description: string;
    priority: number;
    config: string;
};

type AssignmentJoinedRow = AssignmentRow & {
    subject_name: string;
    subject_color: string;
    subject_config: string;
};

type SubmissionRow = {
    id: string;
    assignment: string;
    student: string;
    created: number;
    spent: number | null;
    feedback: string | null;
};

type SubmissionJoinedRow = SubmissionRow & {
    student_name: string;
    student_group: string;
};

type OperationLogRow = Omit<OperationLog, 'created' | 'reverted'> & {
    created: number;
    reverted: number;
};

type ComponentRow = Omit<ComponentConfig, 'config'> & {
    config: string;
};
type DayRow = {
    date: string;
    assignment: string | null;
    subject: string | null;
    taken: number;
};

const ensureDate = (value: Date | string | number | null | undefined) => {
    if (value instanceof Date) {
        return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
        return new Date(value);
    }
    return new Date(0);
};
const formatDayDate = (value: Date) => value.toISOString().split('T')[0];

const ensureAssignmentConfig = (value: AssignmentConfig | null | undefined): AssignmentConfig => {
    return value && typeof value === 'object' ? value : ({} as AssignmentConfig);
};

const ensureSubjectConfig = (value: SubjectConfig | null | undefined): SubjectConfig => {
    return value && typeof value === 'object' ? value : ({} as SubjectConfig);
};

function parseJSON<T>(value: string, fallback: T): T {
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}

function mapSubjectRow(row: SubjectRow): Subject {
    return {
        id: row.id,
        name: row.name,
        color: row.color,
        config: parseJSON(row.config, {} as SubjectConfig),
    };
}

function fetchSubject(id: string) {
    const row = getRow<SubjectRow>('SELECT * FROM subjects WHERE id = ?', [id]);
    if (!row) {
        throw new Error('Subject not found');
    }
    return mapSubjectRow(row);
}

function mapAssignmentRow(row: AssignmentJoinedRow): Assignment {
    const subject = mapSubjectRow({
        id: row.subject,
        name: row.subject_name,
        color: row.subject_color,
        config: row.subject_config,
    });
    return {
        id: row.id,
        subject,
        created: ensureDate(row.created),
        deadline: ensureDate(row.deadline),
        estimated: row.estimated,
        spent: row.spent,
        title: row.title,
        description: row.description,
        priority: row.priority,
        config: parseJSON(row.config, {} as AssignmentConfig),
    };
}

function normalizeAssignment(assignment: Assignment): Assignment {
    return {
        ...assignment,
        subject: {
            ...assignment.subject,
            config: ensureSubjectConfig(assignment.subject.config),
        },
        created: ensureDate(assignment.created),
        deadline: ensureDate(assignment.deadline),
        config: ensureAssignmentConfig(assignment.config),
    };
}

function mapSubmissionRow(row: SubmissionJoinedRow, assignment: Assignment): Submission {
    const student: Student = {
        id: row.student,
        name: row.student_name,
        group: row.student_group,
    };
    return {
        id: row.id,
        assignment,
        student,
        created: ensureDate(row.created),
        spent: row.spent ?? null,
        feedback: row.feedback ?? null,
    };
}

function mapOperationLogRow(row: OperationLogRow): OperationLog {
    return {
        id: row.id,
        description: row.description,
        created: ensureDate(row.created),
        type: row.type,
        changes: row.changes,
        reverted: Boolean(row.reverted),
    };
}

function mapComponentRow(row: ComponentRow): ComponentConfig {
    const { config, ...rest } = row;
    return {
        ...rest,
        config: parseJSON(config, {}),
    };
}

function mapDayRow(row: DayRow): DayRecord {
    if (!row.assignment) {
        throw new Error(`Day ${row.date} does not reference an assignment`);
    }
    const assignment = fetchAssignment(row.assignment);
    const subject = row.subject ? fetchSubject(row.subject) : assignment.subject;
    return {
        date: row.date,
        assignment,
        subject,
        taken: row.taken,
    };
}

async function ensureAdminIdentity() {
    const admin = getRow<Identity>('SELECT * FROM identities WHERE role = ?', ['admin']);
    if (!admin) {
        const identity = { id: "0admin", name: '管理员', role: 'admin' } satisfies Identity;
        run('INSERT INTO identities (id, name, role) VALUES (?, ?, ?)', [identity.id, identity.name, identity.role]);
        emitChange();
    }
}

function assignmentSelect(where = '', params: SQLParams = []) {
    const rows = allRows<AssignmentJoinedRow>(
        `SELECT assignments.*, subjects.name AS subject_name, subjects.color AS subject_color, subjects.config AS subject_config
        FROM assignments
        JOIN subjects ON assignments.subject = subjects.id
        ${where}
        ORDER BY assignments.created`,
        params,
    );
    return rows.map(mapAssignmentRow);
}

function fetchAssignment(id: string) {
    const row = getRow<AssignmentJoinedRow>(
        `SELECT assignments.*, subjects.name AS subject_name, subjects.color AS subject_color, subjects.config AS subject_config
        FROM assignments
        JOIN subjects ON assignments.subject = subjects.id
        WHERE assignments.id = ?`,
        [id],
    );
    if (!row) {
        throw new Error('Assignment not found');
    }
    return mapAssignmentRow(row);
}

function insertAssignmentRecord(assignment: Assignment) {
    const normalized = normalizeAssignment(assignment);
    run('INSERT INTO assignments (id, subject, created, deadline, estimated, spent, title, description, priority, config) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        normalized.id,
        normalized.subject.id,
        normalized.created.getTime(),
        normalized.deadline.getTime(),
        normalized.estimated,
        normalized.spent,
        normalized.title,
        normalized.description,
        normalized.priority,
        JSON.stringify(normalized.config ?? {}),
    ]);
}

function updateAssignmentRecord(assignment: Assignment) {
    const normalized = normalizeAssignment(assignment);
    run('UPDATE assignments SET subject = ?, created = ?, deadline = ?, estimated = ?, spent = ?, title = ?, description = ?, priority = ?, config = ? WHERE id = ?', [
        normalized.subject.id,
        normalized.created.getTime(),
        normalized.deadline.getTime(),
        normalized.estimated,
        normalized.spent,
        normalized.title,
        normalized.description,
        normalized.priority,
        JSON.stringify(normalized.config ?? {}),
        normalized.id,
    ]);
}

function deleteAssignmentRecord(id: string) {
    run('DELETE FROM assignments WHERE id = ?', [id]);
}

function fetchSubmissionsForAssignment(assignment: Assignment) {
    const rows = allRows<SubmissionJoinedRow>(
        `SELECT submissions.*, students.name AS student_name, students.[group] AS student_group
        FROM submissions
        JOIN students ON students.id = submissions.student
        WHERE submissions.assignment = ?
        ORDER BY submissions.created`,
        [assignment.id],
    );
    return rows.map(row => mapSubmissionRow(row, assignment));
}

function fetchSubmissionsForStudent(student: Student) {
    const rows = allRows<SubmissionJoinedRow>(
        `SELECT submissions.*, students.name AS student_name, students.[group] AS student_group, assignments.id AS assignment
        FROM submissions
        JOIN assignments ON assignments.id = submissions.assignment
        JOIN students ON students.id = submissions.student
        WHERE submissions.student = ?
        ORDER BY submissions.created`,
        [student.id],
    );
    return rows.map(row => mapSubmissionRow(row, fetchAssignment(row.assignment)));
}

function fetchAssignmentTagsForAssignment(assignment: Assignment) {
    if (!assignment.config.tags?.length) {
        return [];
    }
    const placeholders = assignment.config.tags.map(() => '?').join(',');
    const rows = allRows<AssignmentTag>(
        `SELECT * FROM assignment_tags WHERE id IN (${placeholders})`, 
        assignment.config.tags
    );
    return rows;
}

function insertSubmissionRecord(submission: Submission) {
    const created = ensureDate(submission.created).getTime();
    run('INSERT INTO submissions (id, assignment, student, created, spent, feedback) VALUES (?, ?, ?, ?, ?, ?)', [
        submission.id,
        submission.assignment.id,
        submission.student.id,
        created,
        submission.spent ?? null,
        submission.feedback ?? null,
    ]);
}

function deleteSubmissionRecord(id: string) {
    run('DELETE FROM submissions WHERE id = ?', [id]);
}

function deleteDayRecord(assignmentId: string) {
    run('DELETE FROM day_record WHERE assignment = ?', [assignmentId]);
}

function insertDayRecord(day: Date, assignment: Assignment, taken: number) {
    const date = formatDayDate(day);
    run('INSERT INTO day_record (date, assignment, subject, taken) VALUES (?, ?, ?, ?)', [
        date,
        assignment.id,
        assignment.subject.id,
        taken
    ]);
}

function createDayRecordForAssignment(assignment: Assignment) {
    const created = ensureDate(assignment.created);
    const deadline = ensureDate(assignment.deadline);

    const days = Math.ceil((deadline.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let day = created; day <= deadline; day.setDate(day.getDate() + 1)) {
        insertDayRecord(day, assignment, assignment.estimated / days);
    }
}

function recomputeDayRecordForAssignment(assignment: Assignment) {
    deleteDayRecord(assignment.id);
    createDayRecordForAssignment(assignment);
}

function cutoffSubject(subject: Subject) {
    if (subject == null || subject === void 0) return subject;
    if ("config" in subject) subject.config = {} as any;
    return subject;
}

function cutoffAssignment(assignment: Assignment, noDetail = false) {
    if (assignment == null || assignment === void 0) return assignment;
    if ("submissions" in assignment) delete assignment.submissions;
    if ("totalRequiredSubmissions" in assignment) delete assignment.totalRequiredSubmissions;
    cutoffSubject(assignment.subject)
    if (noDetail) {
        const a = assignment as any;
        delete a.subject;
        delete a.title;
        delete a.description;
        delete a.priority;
        delete a.spent;
        delete a.estimated;
        delete a.created;
        delete a.deadline;
        delete a.config;
    }
    return assignment;
}

function cutoffSubmission(submission: Submission) {
    if (submission == null || submission === void 0) return submission;
    if ("assignment" in submission) cutoffAssignment(submission.assignment, true);
    return submission;
}

function cutoffUselessInfo(changes: any) {
    if (typeof(changes) !== "object") return changes;
    if ("priority" in changes) return cutoffAssignment(changes);
    if ("student" in changes) return cutoffSubmission(changes);
    return changes;
}

export function cutoffAllUselessInfoInOperationLogs() {
    const operations = allRows<OperationLogRow>('SELECT * FROM operation_logs');
    for (const operation of operations) {
        const cutted = cutoffUselessInfo(JSON.parse(operation.changes));
        operation.changes = JSON.stringify(cutted);
        run('UPDATE operation_logs SET changes = ? WHERE id = ?', [operation.changes, operation.id]);
    }
}

type Operation<T, R = T> = {
    type: string;
    apply(changes: T): Promise<R> | R;
    revert(changes: R): Promise<T> | T;
};

const operations: Record<string, Operation<any, any>> = {};

const addOperation = <T, R = T>(op: Operation<T, R>) => {
    operations[op.type] = op;
    return op;
};

const createAssignmentOp = addOperation<Assignment>({
    type: 'create-assignment',
    async apply(changes) {
        const normalized = normalizeAssignment(changes);
        insertAssignmentRecord(normalized);
        createDayRecordForAssignment(normalized);
        return normalized;
    },
    async revert(changes) {
        deleteAssignmentRecord(changes.id);
        deleteDayRecord(changes.id);
        return changes;
    }
});

const modifyAssignmentOp = addOperation<Assignment>({
    type: 'modify-assignment',
    async apply(changes) {
        const old = fetchAssignment(changes.id);
        const normalized = normalizeAssignment(changes);
        updateAssignmentRecord(normalized);
        recomputeDayRecordForAssignment(normalized);
        return old;
    },
    async revert(changes) {
        const current = fetchAssignment(changes.id);
        const normalized = normalizeAssignment(changes);
        updateAssignmentRecord(normalized);
        recomputeDayRecordForAssignment(normalized);
        return current;
    }
});

const removeAssignmentOp = addOperation<string, Assignment>({
    type: 'remove-assignment',
    async apply(changes) {
        const old = fetchAssignment(changes);
        deleteDayRecord(changes);
        deleteAssignmentRecord(changes);
        return old;
    },
    async revert(changes) {
        insertAssignmentRecord(changes);
        createDayRecordForAssignment(changes);
        return changes.id;
    }
});

const createSubmissionOp = addOperation<Submission>({
    type: 'create-submission',
    async apply(changes) {
        insertSubmissionRecord(changes);
        return changes;
    },
    async revert(changes) {
        deleteSubmissionRecord(changes.id);
        return changes;
    }
});

const updateProgressOp = addOperation<[number, string][]>({
    type: 'finish-progress',
    async apply(changes) {
        for (const [progress, id] of changes) {
            run('UPDATE assignments SET spent = spent + ? WHERE id = ?', [progress, id]);
        }
        return changes;
    },
    async revert(changes) {
        for (const [progress, id] of changes) {
            run('UPDATE assignments SET spent = spent - ? WHERE id = ?', [progress, id]);
        }
        return changes;
    },
});

async function doOperation<T, R>(op: Operation<T, R>, changes: T, description: string) {
    await ready;
    const id = randomId();
    run('INSERT INTO operation_logs (id, description, created, type, changes, reverted) VALUES (?, ?, ?, ?, ?, ?)', [
        id,
        description,
        Date.now(),
        op.type,
        JSON.stringify(cutoffUselessInfo(changes)),
        1,
    ]);
    await redoOperation(id);
}

const op2func = <T, R>(op: Operation<T, R>) => {
    return (changes: T, description: string) => doOperation(op, changes, description);
};

async function undoOperation(id: string) {
    await ready;
    const log = getRow<OperationLogRow>('SELECT * FROM operation_logs WHERE id = ?', [id]);
    if (!log || Boolean(log.reverted)) {
        return;
    }
    const op = operations[log.type];
    if (!op) {
        return;
    }
    const changes: any = JSON.parse(log.changes);
    const applied = cutoffUselessInfo(await op.revert(changes));
    run('UPDATE operation_logs SET reverted = ?, changes = ? WHERE id = ?', [1, JSON.stringify(applied), id]);
    emitChange();
}

async function redoOperation(id: string) {
    await ready;
    const log = getRow<OperationLogRow>('SELECT * FROM operation_logs WHERE id = ?', [id]);
    if (!log || !Boolean(log.reverted)) {
        return;
    }
    const op = operations[log.type];
    if (!op) {
        return;
    }
    const changes: any = JSON.parse(log.changes);
    const applied = cutoffUselessInfo(await op.apply(changes));
    run('UPDATE operation_logs SET reverted = ?, changes = ? WHERE id = ?', [0, JSON.stringify(applied), id]);
    emitChange();
}

async function fetchAssignmentData(assignment: Assignment): Promise<AssignmentData> {
    const submissions = fetchSubmissionsForAssignment(assignment);
    const tags = fetchAssignmentTagsForAssignment(assignment);
    return {
        ...assignment,
        submissions,
        totalRequiredSubmissions: (await data.student.list()).length,
        tags,
    };
}

const data: DataAPI = {
    assignment: {
        async get(id) {
            await ready;
            const assignment = fetchAssignment(id);
            return await fetchAssignmentData(assignment)
        },
        async list(begin: Date | null = null, end: Date | null = null) {
            await ready;
            begin ??= new Date(0);
            end ??= new Date("2099-12-31");
            return await Promise.all(assignmentSelect('WHERE assignments.deadline >= ? AND assignments.created <= ?', [
                begin.getTime(),
                end.getTime(),
            ]).map(assignment => fetchAssignmentData(assignment)));
        },
        create: op2func(createAssignmentOp),
        modify: op2func(modifyAssignmentOp),
        remove: op2func(removeAssignmentOp),
    },
    student: {
        async list() {
            await ready;
            const rows = allRows<Student>('SELECT * FROM students');
            return rows.sort((a, b) => (a.group !== b.group ? a.group.localeCompare(b.group) : a.name.localeCompare(b.name)));
        },
        async add(studentOrName: Student | string, group?: string) {
            await ready;
            const student = typeof studentOrName === 'string'
                ? { id: randomId(), name: studentOrName, group: group ?? '' }
                : studentOrName;
            run('INSERT INTO students (id, name, [group]) VALUES (?, ?, ?)', [student.id, student.name, student.group]);
            emitChange();
            return student;
        },
        async update(student: Student) {
            await ready;
            run('UPDATE students SET name = ?, [group] = ? WHERE id = ?', [student.name, student.group, student.id]);
            emitChange();
        },
        async remove(id) {
            await ready;
            run('DELETE FROM students WHERE id = ?', [id]);
            emitChange();
        },
        async clear() {
            await ready;
            run('DELETE FROM students');
            emitChange();
        },
    },
    subject: {
        async list() {
            await ready;
            const rows = allRows<SubjectRow>('SELECT * FROM subjects');
            return rows.map(mapSubjectRow).sort((a, b) => a.id.localeCompare(b.id));
        },
        async add(subject) {
            await ready;
            run('INSERT INTO subjects (id, name, color, config) VALUES (?, ?, ?, ?)', [subject.id, subject.name, subject.color, JSON.stringify(subject.config)]);
            emitChange();
        },
        async update(subject) {
            await ready;
            run('UPDATE subjects SET name = ?, color = ?, config = ? WHERE id = ?', [subject.name, subject.color, JSON.stringify(subject.config), subject.id]);
            emitChange();
        },
        async remove(id) {
            await ready;
            run('DELETE FROM subjects WHERE id = ?', [id]);
            emitChange();
        },
    },
    identity: {
        async get(id) {
            await ready;
            const row = getRow<Identity>('SELECT * FROM identities WHERE id = ?', [id]);
            if (!row) {
                throw new Error('Identity not found');
            }
            return row;
        },
        async list() {
            await ready;
            const rows = allRows<Identity>('SELECT * FROM identities');
            return rows.sort((a, b) => a.id.localeCompare(b.id));
        },
        async add(identity) {
            await ready;
            run('INSERT INTO identities (id, name, role) VALUES (?, ?, ?)', [identity.id, identity.name, identity.role]);
            emitChange();
            return identity;
        },
        async update(identity) {
            await ready;
            run('UPDATE identities SET name = ?, role = ? WHERE id = ?', [identity.name, identity.role, identity.id]);
            emitChange();
        },
        async remove(id) {
            await ready;
            run('DELETE FROM identities WHERE id = ?', [id]);
            emitChange();
        },
    },
    tag: {
        async list() {
            await ready;
            const rows = allRows<AssignmentTag>('SELECT * FROM assignment_tags');
            return rows.sort((a, b) => a.id.localeCompare(b.id));
        },
        async add(tag) {
            await ready;
            run('INSERT INTO assignment_tags (id, name, color) VALUES (?, ?, ?)', [tag.id, tag.name, tag.color]);
            emitChange();
        },
        async update(tag) {
            await ready;
            run('UPDATE assignment_tags SET name = ?, color = ? WHERE id = ?', [tag.name, tag.color, tag.id]);
            emitChange();
        },
        async remove(id) {
            await ready;
            run('DELETE FROM assignment_tags WHERE id = ?', [id]);
            emitChange();
        },
    },
    submission: {
        create: op2func(createSubmissionOp),
        async list(student) {
            await ready;
            return fetchSubmissionsForStudent(student);
        },
    },
    progress: {
        update: op2func(updateProgressOp),
    },
    operation: {
        async list(limit: number, offset: number, date?: Date, filter?: string) {
            await ready;
            const wheres: string[] = [];
            const params: unknown[] = [];
            if (date) {
                wheres.push('created >= ?');
                params.push(date.getTime());
            }
            if (filter) {
                wheres.push('description LIKE ?');
                params.push('%' + filter + '%');
            }
            params.push(limit);
            params.push(offset);
            const rows = allRows<OperationLogRow>(`SELECT * FROM operation_logs `
                + (wheres.length > 0 ? 'WHERE ' + wheres.join(' AND ') : '')
                + 'ORDER BY created DESC LIMIT ? OFFSET ?', params);
            return rows.map(mapOperationLogRow);
        },
        undo: undoOperation,
        redo: redoOperation,
    },
    component: {
        async list() {
            await ready;
            const rows = allRows<ComponentRow>('SELECT * FROM components');
            return rows.map(mapComponentRow);
        },
        async get(id) {
            await ready;
            const row = getRow<ComponentRow>('SELECT * FROM components WHERE id = ?', [id]);
            if (!row) {
                throw new Error('Component not found');
            }
            return mapComponentRow(row);
        },
        async add(config) {
            await ready;
            run('INSERT INTO components (id, x, y, width, height, type, config) VALUES (?, ?, ?, ?, ?, ?, ?)', [
                config.id,
                config.x,
                config.y,
                config.width,
                config.height,
                config.type,
                JSON.stringify(config.config),
            ]);
            emitChange();
            return config;
        },
        async update(config) {
            await ready;
            run('UPDATE components SET x = ?, y = ?, width = ?, height = ?, type = ?, config = ? WHERE id = ?', [
                config.x,
                config.y,
                config.width,
                config.height,
                config.type,
                JSON.stringify(config.config),
                config.id,
            ]);
            emitChange();
        },
        async remove(id) {
            await ready;
            run('DELETE FROM components WHERE id = ?', [id]);
            emitChange();
        },
    },
    day: {
        async get(begin, end) {
            await ready;
            const beginKey = formatDayDate(begin);
            const endKey = formatDayDate(end);
            const rows = allRows<DayRow>('SELECT * FROM day_record WHERE date BETWEEN ? AND ? ORDER BY date', [beginKey, endKey]);
            const result: Record<string, DayRecord[]> = {};
            for (const row of rows) {
                const day = mapDayRow(row);
                result[day.date] ??= [];
                result[day.date].push(day);
            }
            return result;
        },
        async recompute(assignment) {
            recomputeDayRecordForAssignment(assignment)
        }
    },
    database: {
        async execute(sql, params) {
            await ready;
            run(sql, params);
        },
        async all<T>(sql: string, params?: unknown[]) {
            await ready;
            return allRows<T>(sql, params);
        },
    },
    onChanged(handler) {
        onChangedHandlers.push(handler);
        return () => {
            onChangedHandlers.splice(onChangedHandlers.indexOf(handler), 1);
        };
    },
};

export default data;
