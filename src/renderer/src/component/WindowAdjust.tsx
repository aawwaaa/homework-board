/*

type WindowProps = {
  x: number
  y: number
  width: number
  height: number
}

<WindowAdjust value={props} set={(props: WindowProps) => void}>

样式:

/---------\ |h|
| [data]  | |e|
|move rect| |i|
|         | |g|
|         | |h|
\---------/ |t|

|width    | [R]

要求支持鼠标拖拽，触摸屏操作
move rect: 拖拽位移为窗口位移
width: 从左向右划增大宽度，反之减小
height: 从上到下增大，反之减小
[R]: 双击重置窗口大小和位置
[data]: 以覆盖层形式显示数据: x, y, width, height

*/
import { useCallback, useEffect, useRef } from "react";
import type { PointerEventHandler } from "react";

import "./WindowAdjust.css";

export type WindowProps = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type WindowAdjustProps = {
  value: WindowProps;
  set: (value: WindowProps) => void;
};

type PointerState = {
  pointerId: number | null;
  startX: number;
  startY: number;
};

const MIN_DIMENSION = 8;

const usePointerState = () => {
  return useRef<PointerState>({
    pointerId: null,
    startX: 0,
    startY: 0,
  });
};

export const WindowAdjust: React.FC<WindowAdjustProps> = ({ value, set }) => {
  const initialValueRef = useRef<WindowProps>(value);
  const actionSourceRef = useRef<"user" | null>(null);
  const moveStateRef = usePointerState();
  const widthStateRef = usePointerState();
  const heightStateRef = usePointerState();
  const moveStartRef = useRef({ x: value.x, y: value.y });
  const widthStartRef = useRef(value.width);
  const heightStartRef = useRef(value.height);

  useEffect(() => {
    if (actionSourceRef.current === "user") {
      actionSourceRef.current = null;
      return;
    }
    initialValueRef.current = value;
  }, [value]);

  const commitValue = useCallback(
    (next: WindowProps) => {
      next = {
        x: Math.round(next.x),
        y: Math.round(next.y),
        width: Math.round(next.width),
        height: Math.round(next.height),
      }
      actionSourceRef.current = "user";
      set(next);
    },
    [set],
  );

  const releasePointer: (
    target: Element | null | undefined,
    pointerId: number | null,
  ) => void = useCallback((target, pointerId) => {
    if (pointerId == null) {
      return;
    }
    if (target?.hasPointerCapture?.(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
  }, []);

  const handleMovePointerDown: PointerEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      moveStateRef.current.pointerId = event.pointerId;
      moveStateRef.current.startX = event.clientX;
      moveStateRef.current.startY = event.clientY;
      moveStartRef.current = { x: value.x, y: value.y };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    },
    [moveStateRef, value.x, value.y],
  );

  const handleMovePointerMove: PointerEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      const { pointerId, startX, startY } = moveStateRef.current;
      if (pointerId == null || pointerId !== event.pointerId) {
        return;
      }
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      commitValue({
        x: moveStartRef.current.x + deltaX,
        y: moveStartRef.current.y + deltaY,
        width: value.width,
        height: value.height,
      });
      if (event.pointerType !== "mouse") {
        event.preventDefault();
      }
    },
    [commitValue, moveStateRef, value.height, value.width],
  );

  const handleMovePointerEnd: PointerEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (moveStateRef.current.pointerId === event.pointerId) {
        releasePointer(event.currentTarget, moveStateRef.current.pointerId);
        moveStateRef.current.pointerId = null;
      }
    },
    [moveStateRef, releasePointer],
  );

  const handleWidthPointerDown: PointerEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      widthStateRef.current.pointerId = event.pointerId;
      widthStateRef.current.startX = event.clientX;
      widthStartRef.current = value.width;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    },
    [widthStateRef, value.width],
  );

  const handleWidthPointerMove: PointerEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      const { pointerId, startX } = widthStateRef.current;
      if (pointerId == null || pointerId !== event.pointerId) {
        return;
      }
      const deltaX = event.clientX - startX;
      const nextWidth = Math.max(MIN_DIMENSION, widthStartRef.current + deltaX);
      commitValue({
        ...value,
        width: nextWidth,
      });
      if (event.pointerType !== "mouse") {
        event.preventDefault();
      }
    },
    [commitValue, widthStateRef, value],
  );

  const handleWidthPointerEnd: PointerEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (widthStateRef.current.pointerId === event.pointerId) {
        releasePointer(event.currentTarget, widthStateRef.current.pointerId);
        widthStateRef.current.pointerId = null;
      }
    },
    [widthStateRef, releasePointer],
  );

  const handleHeightPointerDown: PointerEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      heightStateRef.current.pointerId = event.pointerId;
      heightStateRef.current.startY = event.clientY;
      heightStartRef.current = value.height;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    },
    [heightStateRef, value.height],
  );

  const handleHeightPointerMove: PointerEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      const { pointerId, startY } = heightStateRef.current;
      if (pointerId == null || pointerId !== event.pointerId) {
        return;
      }
      const deltaY = event.clientY - startY;
      const nextHeight = Math.max(
        MIN_DIMENSION,
        heightStartRef.current + deltaY,
      );
      commitValue({
        ...value,
        height: nextHeight,
      });
      if (event.pointerType !== "mouse") {
        event.preventDefault();
      }
    },
    [commitValue, heightStateRef, value],
  );

  const handleHeightPointerEnd: PointerEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (heightStateRef.current.pointerId === event.pointerId) {
        releasePointer(event.currentTarget, heightStateRef.current.pointerId);
        heightStateRef.current.pointerId = null;
      }
    },
    [heightStateRef, releasePointer],
  );

  // const handleResetDoubleClick = useCallback(() => {
  //   commitValue(initialValueRef.current);
  // }, [commitValue]);

  const overlayText = `x: ${Math.round(value.x)}\ny: ${Math.round(value.y)}\nwidth: ${Math.round(value.width)}\nheight: ${Math.round(value.height)}`;

  return (
    <div className="window-adjust">
      <div className="window-adjust-top">
        <div
          className="window-adjust-preview"
          onPointerDown={handleMovePointerDown}
          onPointerMove={handleMovePointerMove}
          onPointerUp={handleMovePointerEnd}
          onPointerLeave={handleMovePointerEnd}
          onPointerCancel={handleMovePointerEnd}
        >
          <div className="window-adjust-overlay">{overlayText}</div>
          {/* <span>move rect</span> */}
        </div>
        <div
          className="window-adjust-handle window-adjust-handle--vertical"
          onPointerDown={handleHeightPointerDown}
          onPointerMove={handleHeightPointerMove}
          onPointerUp={handleHeightPointerEnd}
          onPointerLeave={handleHeightPointerEnd}
          onPointerCancel={handleHeightPointerEnd}
        >
          {/* <span>height</span> */}
        </div>
      </div>
      <div className="window-adjust-bottom">
        <div
          className="window-adjust-handle window-adjust-handle--horizontal"
          onPointerDown={handleWidthPointerDown}
          onPointerMove={handleWidthPointerMove}
          onPointerUp={handleWidthPointerEnd}
          onPointerLeave={handleWidthPointerEnd}
          onPointerCancel={handleWidthPointerEnd}
        >
          {/* width */}
        </div>
        {/* <div
          className="window-adjust-reset"
          onDoubleClick={handleResetDoubleClick}
        >
          R
        </div> */}
      </div>
    </div>
  );
};

export default WindowAdjust;
