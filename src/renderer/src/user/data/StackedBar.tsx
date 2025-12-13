import type { CSSProperties, ReactNode } from "react";

import { useMeasuredWidth } from "./allocationCommon";

export type StackedBarSegment = {
    key: string;
    color: string;
    flex: number;
    title?: string;
    label?: ReactNode;
    legend?: ReactNode;
};

export const StackedBar: React.FC<{
    segments: StackedBarSegment[];
    barClassName: string;
    segmentClassName: string;
    legendClassName?: string;
    dotClassName?: string;
    minLabelWidthPx?: number;
    style?: CSSProperties;
}> = ({ segments, barClassName, segmentClassName, legendClassName, dotClassName, minLabelWidthPx, style }) => {
    const shouldMeasure = typeof minLabelWidthPx === "number" && minLabelWidthPx > 0;
    const { ref, width } = useMeasuredWidth<HTMLDivElement>();

    const total = segments.reduce((sum, segment) => sum + segment.flex, 0);
    const isMeasuringReady = !shouldMeasure || width > 0;

    const segmentVisibility = segments.map((segment) => {
        if (!shouldMeasure || !isMeasuringReady || total === 0) {
            return { ...segment, showLabel: Boolean(segment.label) && !shouldMeasure };
        }
        const ratio = total === 0 ? 0 : segment.flex / total;
        return { ...segment, showLabel: Boolean(segment.label) && width * ratio >= minLabelWidthPx! };
    });

    const hiddenLegend = legendClassName
        ? segmentVisibility.filter((segment) => !segment.showLabel && segment.legend != null)
        : [];

    return (
        <>
            <div className={barClassName} ref={shouldMeasure ? ref : undefined} style={style}>
                {segmentVisibility.map((segment) => (
                    <div
                        key={segment.key}
                        className={segmentClassName}
                        style={{ backgroundColor: segment.color, flex: segment.flex }}
                        title={segment.title}
                    >
                        {segment.showLabel && segment.label}
                    </div>
                ))}
            </div>
            {hiddenLegend.length > 0 && legendClassName && dotClassName && (
                <ul className={legendClassName}>
                    {hiddenLegend.map((segment) => (
                        <li key={segment.key}>
                            <span className={dotClassName} style={{ backgroundColor: segment.color }} />
                            {segment.legend}
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
};

