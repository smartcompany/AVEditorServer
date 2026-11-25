"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from "react";

export function reorderById<T extends { id: string }>(
  items: T[],
  fromId: string,
  toId: string,
): T[] {
  if (fromId === toId) return items;
  const from = items.findIndex((i) => i.id === fromId);
  const to = items.findIndex((i) => i.id === toId);
  if (from < 0 || to < 0) return items;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

type Props<T extends { id: string }> = {
  items: T[];
  onReorder: (fromId: string, toId: string) => void;
  renderItem: (item: T, opts: { dragging: boolean; over: boolean }) => ReactNode;
  /** Optional hint under the list. */
  hint?: string;
};

/**
 * HTML5 drag-and-drop reorder for dashboard sidebars.
 * Dropping item A onto item B inserts A at B's index.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  hint,
}: Props<T>) {
  const dragId = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const onDragStart = (id: string) => (e: DragEvent) => {
    dragId.current = id;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const onDragOver = (id: string) => (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overId !== id) setOverId(id);
  };

  const onDrop = (id: string) => (e: DragEvent) => {
    e.preventDefault();
    const from = dragId.current ?? e.dataTransfer.getData("text/plain");
    dragId.current = null;
    setDraggingId(null);
    setOverId(null);
    if (!from || from === id) return;
    onReorder(from, id);
  };

  const onDragEnd = () => {
    dragId.current = null;
    setDraggingId(null);
    setOverId(null);
  };

  return (
    <div>
      <ul style={styles.list}>
        {items.map((item) => (
          <li
            key={item.id}
            draggable
            onDragStart={onDragStart(item.id)}
            onDragOver={onDragOver(item.id)}
            onDrop={onDrop(item.id)}
            onDragEnd={onDragEnd}
            style={{
              ...styles.row,
              ...(draggingId === item.id ? styles.rowDragging : null),
              ...(overId === item.id && draggingId !== item.id
                ? styles.rowOver
                : null),
            }}
          >
            <span style={styles.handle} title="드래그해서 순서 변경" aria-hidden>
              ⋮⋮
            </span>
            <div style={styles.body}>
              {renderItem(item, {
                dragging: draggingId === item.id,
                over: overId === item.id && draggingId !== item.id,
              })}
            </div>
          </li>
        ))}
      </ul>
      {hint ? <p style={styles.hint}>{hint}</p> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  row: {
    display: "flex",
    alignItems: "stretch",
    gap: 4,
    borderRadius: 8,
    border: "1px solid transparent",
    background: "transparent",
    cursor: "grab",
  },
  rowDragging: {
    opacity: 0.45,
    cursor: "grabbing",
  },
  rowOver: {
    borderColor: "#4cc9f0",
    background: "#1a2233",
  },
  handle: {
    flex: "0 0 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#5c657a",
    fontSize: 12,
    letterSpacing: -2,
    userSelect: "none",
    paddingLeft: 2,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  hint: {
    margin: "8px 4px 0",
    fontSize: 11,
    color: "#8b93a7",
  },
};
