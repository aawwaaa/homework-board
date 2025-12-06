import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

const PX_PER_SWIPE_STEP = 28;

const noop = () => {
    // Intentionally empty
};

type SwipeAdjustState = {
    active: boolean;
    pointerId: number | null;
    startX: number;
    lastStep: number;
    adjusted: boolean;
    captured: boolean;
};

type SwipeAdjustOptions = {
    disabled: boolean;
    pxPerStep?: number;
    onAdjust: (steps: number) => void;
};

type SwipeAdjustHandlers<T extends HTMLElement> = Pick<
    React.HTMLAttributes<T>,
    "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerLeave" | "onPointerCancel"
>;

const useSwipeAdjust = <T extends HTMLElement>({
    disabled,
    onAdjust,
    pxPerStep = PX_PER_SWIPE_STEP,
}: SwipeAdjustOptions): SwipeAdjustHandlers<T> => {
    const stateRef = useRef<SwipeAdjustState>({
        active: false,
        pointerId: null,
        startX: 0,
        lastStep: 0,
        adjusted: false,
        captured: false,
    });

    const resetState = useCallback((target?: EventTarget & T) => {
        const state = stateRef.current;
        if (state.pointerId != null && target?.hasPointerCapture?.(state.pointerId)) {
            target.releasePointerCapture(state.pointerId);
        }
        state.active = false;
        state.pointerId = null;
        state.startX = 0;
        state.lastStep = 0;
        state.adjusted = false;
        state.captured = false;
    }, []);

    const handlePointerDown = useCallback((event: ReactPointerEvent<T>) => {
        if (disabled) {
            return;
        }
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }
        const state = stateRef.current;
        state.active = true;
        state.pointerId = event.pointerId;
        state.startX = event.clientX;
        state.lastStep = 0;
        state.adjusted = false;
        state.captured = false;
    }, [disabled]);

    const handlePointerMove = useCallback((event: ReactPointerEvent<T>) => {
        if (disabled) {
            return;
        }
        const state = stateRef.current;
        if (!state.active || state.pointerId !== event.pointerId) {
            return;
        }
        const delta = event.clientX - state.startX;
        const steps = Math.trunc(delta / pxPerStep);
        if (steps !== state.lastStep) {
            if (!state.captured) {
                event.currentTarget.setPointerCapture?.(event.pointerId);
                state.captured = true;
            }
            onAdjust(steps - state.lastStep);
            state.lastStep = steps;
            state.adjusted = true;
        }
        if (state.adjusted && event.pointerType !== "mouse") {
            event.preventDefault();
        }
    }, [disabled, onAdjust, pxPerStep]);

    const handlePointerEnd = useCallback((event: ReactPointerEvent<T>) => {
        if (!stateRef.current.active) {
            return;
        }
        resetState(event.currentTarget);
    }, [resetState]);

    useEffect(() => {
        if (disabled) {
            resetState();
        }
    }, [disabled, resetState]);

    return useMemo(() => ({
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerEnd,
        onPointerLeave: handlePointerEnd,
        onPointerCancel: handlePointerEnd,
    }), [handlePointerDown, handlePointerMove, handlePointerEnd]);
};

const combineClassName = (className?: string) => {
    if (!className) {
        return "swipe-adjust-input";
    }
    return className.includes("swipe-adjust-input")
        ? className
        : `${className} swipe-adjust-input`;
};

const chainHandlers = (
    swipeHandler?: (event: ReactPointerEvent<HTMLInputElement>) => void,
    originalHandler?: (event: ReactPointerEvent<HTMLInputElement>) => void,
) => {
    if (!swipeHandler && !originalHandler) {
        return undefined;
    }
    return (event: ReactPointerEvent<HTMLInputElement>) => {
        swipeHandler?.(event);
        originalHandler?.(event);
    };
};

export type SwipeAdjustInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
    type: "datetime-local" | "number";
    swipeDisabled?: boolean;
    swipePxPerStep?: number;
    onSwipeAdjust?: (steps: number) => void;
};

export const SwipeAdjustInput = forwardRef<HTMLInputElement, SwipeAdjustInputProps>((props, ref) => {
    const {
        type,
        className,
        onSwipeAdjust,
        swipeDisabled,
        swipePxPerStep,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerLeave,
        onPointerCancel,
        ...restProps
    } = props;

    const inputClassName = combineClassName(className);
    const isSwipeDisabled = Boolean(swipeDisabled ?? false) || Boolean(restProps.disabled) || !onSwipeAdjust;

    const swipeHandlers = useSwipeAdjust<HTMLInputElement>({
        disabled: isSwipeDisabled,
        pxPerStep: swipePxPerStep,
        onAdjust: onSwipeAdjust ?? noop,
    });

    const pointerHandlers = useMemo(() => ({
        onPointerDown: chainHandlers(swipeHandlers.onPointerDown, onPointerDown),
        onPointerMove: chainHandlers(swipeHandlers.onPointerMove, onPointerMove),
        onPointerUp: chainHandlers(swipeHandlers.onPointerUp, onPointerUp),
        onPointerLeave: chainHandlers(swipeHandlers.onPointerLeave, onPointerLeave),
        onPointerCancel: chainHandlers(swipeHandlers.onPointerCancel, onPointerCancel),
    }), [
        swipeHandlers.onPointerDown,
        swipeHandlers.onPointerMove,
        swipeHandlers.onPointerUp,
        swipeHandlers.onPointerLeave,
        swipeHandlers.onPointerCancel,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerLeave,
        onPointerCancel,
    ]);

    return (
        <input
            {...restProps}
            ref={ref}
            type={type}
            className={inputClassName}
            {...pointerHandlers}
        />
    );
});

SwipeAdjustInput.displayName = "SwipeAdjustInput";
