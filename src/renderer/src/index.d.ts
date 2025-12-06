import { IpcRenderer } from "electron";
type AssignmentConfig = {}

type Assignment = {
    id: string;
    subject: Subject;

    created: Date;
    deadline: Date;

    estimated: number; // minutes
    spent: number; // minutes

    title: string;
    description: string;
    priority: number;

    config: AssignmentConfig;
}
type AssignmentData = Assignment & {
    submissions: Submission[];
}

type Student = {
    id: string;
    name: string;
    group: string;
}

type Submission = {
    id: string;
    assignment: Assignment;
    student: Student;

    created: Date;

    spent: number?;
    feedback: string?
}

type OperationLog = {
    id: string;
    description: string;

    created: Date;

    type: string;
    changes: string; // json
    reverted: boolean;
}

type SubjectConfig = {};

type Subject = {
    id: string;
    name: string;
    color: string;
    config: SubjectConfig;
}

type Identity = {
    id: string;
    name: string;
    role: string; // "admin" / <subject-id>,<...>
}

type ComponentConfig = {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: string;
    config: unknown;
}

type DayRecord = {
    date: string;
    assignment: Assignment;
    subject: Subject;
    taken: number;
}

type DataAPI = {
    assignment: {
        get: (id: string) => Promise<AssignmentData>;
        list: (begin: Date?, end: Date?) => Promise<Assignment[]>;
        create: (assignment: Assignment, description: string) => Promise<void>;
        modify: (assignment: Assignment, description: string) => Promise<void>;
        remove: (id: string, description: string) => Promise<void>;
    },
    student: {
        list: () => Promise<Student[]>;
        add: (student: Student) => Promise<Student>;
        update: (student: Student) => Promise<void>;
        remove: (id: string) => Promise<void>;
        clear: () => Promise<void>;
    },
    submission: {
        create: (submission: Submission, description: string) => Promise<void>;
    },
    progress: {
        update: (progress: [number, string][], description: string) => Promise<void>;
    },
    operation: {
        list: () => Promise<OperationLog[]>;
        undo: (id: string) => Promise<void>;
        redo: (id: string) => Promise<void>;
    },
    subject: {
        list: () => Promise<Subject[]>;
        add: (subject: Subject) => Promise<void>;
        update: (subject: Subject) => Promise<void>;
        remove: (id: string) => Promise<void>;
    },
    identity: {
        get: (id: string) => Promise<Identity>;
        list: () => Promise<Identity[]>;
        add: (name: string, role: string) => Promise<Identity>;
        remove: (id: string) => Promise<void>;
    },
    component: {
        list: () => Promise<ComponentConfig[]>;
        get: (id: string) => Promise<ComponentConfig>;
        add: (config: ComponentConfig) => Promise<ComponentConfig>;
        update: (config: ComponentConfig) => Promise<void>;
        remove: (id: string) => Promise<void>;
    },
    day: {
        get: (begin: Date, end: Date) => Promise<Record<string, DayRecord[]>>;
    },
    database: {
        execute: (sql: string, params?: unknown[]) => Promise<void>;
        all: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
    },
    onChanged: (handler: () => void) => () => void;
};

type API = {
    login: (identity: string) => void;
}
