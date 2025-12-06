import "./SubjectBadge.css"

export const SubjectBadge = ({subject, onClick}: {subject: Subject, onClick?: () => void}) => {
    return <div className="subject-badge" style={{backgroundColor: subject.color}} onClick={onClick}>
        <div className="subject-name">{subject.name}</div>
    </div>
}