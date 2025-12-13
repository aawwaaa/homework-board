import React, { useCallback, useEffect, useRef, useState } from "react";
import { Identity } from "..";
import { AssignmentPage } from "../user/assignment/Assignment";

import "./UserPage.css";
import { ManagePage } from "../user/manage/Manage";
import { DataPage } from "@renderer/user/data/Data";

export type UserPageProps = {
  identity: Identity;
  updatePage: (name: string, element: React.ReactNode) => void;
  popPage: () => void;
};

const pages: Record<
  string,
  [(identity: Identity) => boolean, (props: UserPageProps) => React.JSX.Element]
> = {
  作业: [
    () => true,
    (props) => <AssignmentPage key={Math.random()} props={props} />,
  ],
  数据: [
    (i) => i.role == "admin",
    (props) => <DataPage key={Math.random()} props={props} />,
  ],
  管理: [
    (i) => i.role == "admin",
    (props) => <ManagePage key={Math.random()} props={props} />,
  ],
};

export const UserPage: React.FC<{ left: string }> = ({ left }) => {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [page, setPage] = useState<string>("");
  const stack = useRef<[string, React.ReactNode][]>([]);
  const [contentElement, setContentElement] = useState<React.ReactNode>(null);
  const pageRef = useRef(page);
  const contentRef = useRef<React.ReactNode>(contentElement);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    contentRef.current = contentElement;
  }, [contentElement]);

  useEffect(() => {
    const id = left.substring(1);
    window.data.identity.get(id).then(setIdentity);
  }, [left]);

  const updatePage = (name: string, element: React.ReactNode) => {
    setPage(name);
    setContentElement(element);
  };

  const pushStack = useCallback(
    (name: string, element: React.ReactNode) => {
      stack.current.push([pageRef.current, contentRef.current]);
      updatePage(name, element);
    },
    [updatePage],
  );

  const popStack = useCallback(() => {
    if (stack.current.length > 0) {
      const [name, element] = stack.current.pop()!;
      updatePage(name, element);
    }
  }, [updatePage]);

  const turnPage = useCallback(
    (name: string) => {
      const [guard, element] = pages[name];
      if (!guard || !element) {
        return;
      }
      const elem = element({
        identity: identity!,
        updatePage(name, element) {
          pushStack(name, element);
        },
        popPage() {
          popStack();
        },
      });
      updatePage(name, elem);
      stack.current = [];
    },
    [pages, identity, updatePage, pushStack, popStack],
  );

  useEffect(() => {
    if (page != "") return;
    if (identity == null) return;
    turnPage(Object.keys(pages)[0]);
  }, [identity]);

  return (
    <div className="user-page">
      <div
        className={page in pages ? "sidebar pages" : "sidebar pages minimized"}
      >
        {/* <h3>{page}</h3> */}
        <button onClick={popStack}>返回</button>
        <ul>
          {Object.entries(pages)
            .filter(([_, [guard]]) => identity && guard(identity!))
            .map(([name, [_1, _2]]) => (
              <li
                key={name}
                className={name === page ? "active" : ""}
                onClick={() => turnPage(name)}
              >
                {name}
              </li>
            ))}
        </ul>
      </div>
      <div className="content">
        {[...stack.current.map((a) => a[1]), contentElement].map((a, i) => (
          <div
            key={i}
            style={{ display: i != stack.current.length ? "none" : "block" }}
          >
            {a}
          </div>
        ))}
      </div>
    </div>
  );
};
