export function isSubjectAccessible(identity: Identity, subject: Subject): boolean {
    if (identity.role === "admin") {
        return true;
    }
    return identity.role.split(",").includes(subject.id);
}

export function randomId() {
    return Math.random().toString(36).slice(2);
}