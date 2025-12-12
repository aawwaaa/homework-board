export function isSubjectAccessible(identity: Identity, subject: Subject): boolean {
    if (identity.role === "admin") {
        return true;
    }
    return identity.role.split(",").includes(subject.id);
}

export function randomId() {
    return Math.random().toString(36).slice(2);
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function formatTime(date: Date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();

    return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export function toRelativeTime(date: Date) {
    const deltaSec = Math.floor((date.getTime() - Date.now()) / 1000);

    if (deltaSec < -DAY) return formatTime(date);
    if (deltaSec < -HOUR) {
        return Math.floor(deltaSec / -HOUR) + "小时 前"
    }
    if (deltaSec < -MINUTE) {
        return Math.floor(deltaSec / -MINUTE) + "分钟 前"
    }
    if (deltaSec < MINUTE) {
        return "现在"
    }
    if (deltaSec < HOUR) {
        return Math.floor(deltaSec / MINUTE) + "分钟 后"
    }
    if (deltaSec < DAY) {
        return Math.floor(deltaSec / HOUR) + "小时 后"
    }
    if (deltaSec < DAY * 3) {
        const week = ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
        const hour = date.getHours();
        const minute = date.getMinutes();
        return "周" + week + " " + hour.toString().padStart(2, '0') + ":" + minute.toString().padStart(2, '0')
    }
    return formatTime(date);
}