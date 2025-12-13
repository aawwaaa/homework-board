import { useEffect, useRef, useState } from "react";

import "./SchedulePage.css";
import { ScheduleEdit } from "./ScheduleEdit";

type ScheduleState = {
  state: "stop" | "running" | "pause";
  beginTime: number;
  pauseTime?: number;
};

const formatTimeInterval = (time: number) => {
  const minutes = Math.floor(time / 60000);
  const seconds = Math.floor((time % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const ScheduleRunner = ({
  schedule,
  children,
}: {
  schedule: Schedule;
  children?: React.ReactNode;
}) => {
  const state = useRef<ScheduleState>({
    state: "stop",
    beginTime: Date.now(),
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const start = () => {
    state.current = {
      state: "running",
      beginTime: Date.now(),
    };
    setNow(Date.now());
  };

  const pause = () => {
    if (state.current.state != "running") return;
    state.current = {
      state: "pause",
      beginTime: state.current.beginTime,
      pauseTime: Date.now(),
    };
    setNow(Date.now());
  };

  const resume = () => {
    if (state.current.state != "pause") return;
    state.current = {
      state: "running",
      beginTime:
        state.current.beginTime + (Date.now() - state.current.pauseTime!),
    };
    setNow(Date.now());
  };

  const stop = () => {
    state.current = {
      state: "stop",
      beginTime: Date.now(),
    };
    setNow(Date.now());
  };

  let time = state.current.beginTime;
  if (state.current.state == "pause") {
    time += now - state.current.pauseTime!;
  }

  const pendings: React.ReactNode[] = [];
  const runnings: React.ReactNode[] = [];
  const dones: React.ReactNode[] = [];
  for (let index = 0; index < schedule.entries.length; index++) {
    const entry = schedule.entries[index];
    const duration = entry.duration;
    const begin = time;
    time += duration;
    const end = time;
    const stateName =
      state.current.state == "stop"
        ? "pending"
        : now < begin
          ? "pending"
          : now > end
            ? "done"
            : "running";
    const element = (
      <div key={index} className={"element " + stateName}>
        <div className="time">
          {stateName != "running"
            ? formatTimeInterval(entry.duration)
            : formatTimeInterval(end - now)}
        </div>
        <div className="title">{entry.title}</div>
        <div className="description">{entry.description}</div>
      </div>
    );
    if (stateName == "pending") pendings.push(element);
    if (stateName == "running") runnings.push(element);
    if (stateName == "done") dones.push(element);
  }

  return (
    <div className="schedule-runner">
      <div className="list">
        <div className="done-list">{dones}</div>
        <div className="running-list">
          {runnings}
          <div className="pending-list">{pendings}</div>
        </div>
      </div>
      <div className="tool-bar">
        <div>
          {state.current.state == "stop" ? (
            <button onClick={start} className="outline">
              开始
            </button>
          ) : null}
          {state.current.state == "running" ? (
            <button onClick={pause} className="outline">
              暂停
            </button>
          ) : null}
          {state.current.state == "pause" ? (
            <button onClick={resume} className="outline">
              继续
            </button>
          ) : null}
          {state.current.state == "running" ||
          state.current.state == "pause" ? (
            <button onClick={stop} className="outline">
              停止
            </button>
          ) : null}
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

export const SchedulePage = () => {
  const [schedule, setSchedule] = useState<Schedule>({
    entries: [],
  });
  const [editorVisible, setEditorVisible] = useState(false);
  return (
    <div className="schedule-page">
      <ScheduleRunner schedule={schedule}>
        <button onClick={() => setEditorVisible(true)} className="outline">
          编辑
        </button>
      </ScheduleRunner>
      <div
        className="editor-wrapper"
        data-open={editorVisible ? "true" : "false"}
      >
        <div className="editor-card">
          <ScheduleEdit
            schedule={schedule}
            setSchedule={setSchedule}
            onClose={() => setEditorVisible(false)}
          />
        </div>
      </div>
    </div>
  );
};
