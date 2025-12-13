import { useEffect, useRef, useState } from "react";

export type Range = {
    begin: string;
    end: string;
};

export const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export const percentFormatter = new Intl.NumberFormat("zh-CN", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
});

const minuteFormatter = new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
});

export const formatMinutes = (value: number) => `${minuteFormatter.format(value)} 分钟`;

export const formatInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export const toUTCDate = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
};

export const parseDateKey = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
};

export const getDefaultRange = (): Range => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    return {
        begin: formatInputDate(lastWeek),
        end: formatInputDate(nextWeek),
    };
};

export const useMeasuredWidth = <T extends HTMLElement>() => {
    const ref = useRef<T | null>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }
        const updateWidth = () => {
            setWidth(element.getBoundingClientRect().width);
        };
        updateWidth();
        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", updateWidth);
            return () => {
                window.removeEventListener("resize", updateWidth);
            };
        }
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setWidth(entry.contentRect.width);
            }
        });
        observer.observe(element);
        return () => {
            observer.disconnect();
        };
    }, []);

    return { ref, width };
};

