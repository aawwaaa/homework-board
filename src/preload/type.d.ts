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
    totalRequiredSubmissions: number;
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

type AssignmentPreset = {
    name: string;
    description: string;
    duration: number;
    estimated: number;
    priority: number;
}

type SubjectConfig = {
    assignmentPresets: AssignmentPreset[];
};

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
        list: (begin: Date?, end: Date?) => Promise<AssignmentData[]>;
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
        list: (student: Student) => Promise<Submission[]>;
    },
    progress: {
        update: (progress: [number, string][], description: string) => Promise<void>;
    },
    operation: {
        list: (limit: number, offset: number, date?: Date, filter?: string) => Promise<OperationLog[]>;
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
        add: (identity: Identity) => Promise<Identity>;
        update: (identity: Identity) => Promise<void>;
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
        recompute: (assignment: Assignment) => Promise<void>
    },
    database: {
        execute: (sql: string, params?: unknown[]) => Promise<void>;
        all: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
    },
    onChanged: (handler: () => void) => () => void;
};

type API = {
    login: (identity: string) => void;
    showDetail: (assignment: string) => void;
    showStudentPage: (student: string) => void;
    showConfigWindow: (id: string) => void;
    showSignWindow: () => void;

    openDataDirectory: () => void;

    getConfig: () => Promise<Config>;
    setConfig: (config: Config) => Promise<void>;

    cutoffAllUselessInfoInOperationLogs: () => void;
}

type Config = {
    autoStartup: boolean;

    hideAll: boolean;
}
