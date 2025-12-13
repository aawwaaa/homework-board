type Schedule = {
    entries: ScheduleEntry[];
}

type ScheduleEntry = {
    duration: number; // ms
    title: string;
    description?: string;
}