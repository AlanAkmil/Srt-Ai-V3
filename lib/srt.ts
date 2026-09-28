export type SubtitleSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
};

export function formatTimestamp(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = Math.floor(clamped % 60);
  const millis = Math.round((clamped - Math.floor(clamped)) * 1000);

  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const pad3 = (n: number) => n.toString().padStart(3, "0");

  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)},${pad3(millis)}`;
}

export function buildSrt(segments: SubtitleSegment[]): string {
  return segments
    .map((segment) => {
      const index = segment.id + 1;
      const time = `${formatTimestamp(segment.start)} --> ${formatTimestamp(segment.end)}`;
      return `${index}\n${time}\n${segment.text.trim()}\n`;
    })
    .join("\n");
}
