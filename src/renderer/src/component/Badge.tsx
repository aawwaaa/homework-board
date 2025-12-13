import "./Badge.css";

export type BadgeSupported = {
  name: string;
  color: string;
};

export const Badge = ({
  data,
  onClick,
}: {
  data: BadgeSupported;
  onClick?: () => void;
}) => {
  return (
    <div
      className="badge"
      style={{ backgroundColor: data.color }}
      onClick={onClick}
    >
      <div className="badge-name">{data.name}</div>
    </div>
  );
};
