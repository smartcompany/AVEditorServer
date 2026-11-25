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
  edge: "before" | "after" = "before",
): T[] {
  if (fromId === toId && edge === "before") return items;
  const from = items.findIndex((i) => i.id === fromId);
  const target = items.findIndex((i) => i.id === toId);
  if (from < 0 || target < 0) return items;

  let insertAt = edge === "after" ? target + 1 : target;
  if (from < insertAt) insertAt -= 1;
  if (insertAt === from) return items;

  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(insertAt, 0, moved!);
  return next;
}

type InsertEdge = "before" | "after";

type Props<T extends { id: string }> = {
  items: T[];
  onReorder: (fromId: string, toId: string, edge: InsertEdge) => void;
  renderItem: (item: T, opts: { dragging: boolean }) => ReactNode;
  /** Optional hint under the list. */
  hint?: string;
};

/**
 * HTML5 drag-and-drop reorder for dashboard sidebars.
 * Shows a gap line for where the item will land; selection chrome stays in renderItem.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  hint,
}: Props<T>) {
  const dragId = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [insert, setInsert] = useState<{
    id: string;
    edge: InsertEdge;
  } | null>(null);

  const clearDrag = () => {
    dragId.current = null;
    setDraggingId(null);
    setInsert(null);
  };

  const onDragStart = (id: string) => (e: DragEvent) => {
    dragId.current = id;
    setDraggingId(id);
    setInsert(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const onDragOver = (id: string) => (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragId.current === id) {
      setInsert(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const edge: InsertEdge =
      e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    if (insert?.id !== id || insert.edge !== edge) {
      setInsert({ id, edge });
    }
  };

  const onDrop = (id: string) => (e: DragEvent) => {
    e.preventDefault();
    const from = dragId.current ?? e.dataTransfer.getData("text/plain");
    const edge =
      insert?.id === id
        ? insert.edge
        : e.clientY <
            (e.currentTarget as HTMLElement).getBoundingClientRect().top +
              (e.currentTarget as HTMLElement).getBoundingClientRect().height /
                2
          ? "before"
          : "after";
    clearDrag();
    if (!from || from === id) return;
    onReorder(from, id, edge);
  };

  const onDragEnd = () => {
    clearDrag();
  };

  return (
    <div>
      <ul style={styles.list}>
        {items.map((item) => {
          const showBefore =
            insert?.id === item.id &&
            insert.edge === "before" &&
            draggingId !== item.id;
          const showAfter =
            insert?.id === item.id &&
            insert.edge === "after" &&
            draggingId !== item.id;
          return (
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
              }}
            >
              {showBefore ? <span style={styles.insertLineTop} /> : null}
              {showAfter ? <span style={styles.insertLineBottom} /> : null}
              <span style={styles.handle} title="드래그해서 순서 변경" aria-hidden>
                ⋮⋮
              </span>
              <div style={styles.body}>
                {renderItem(item, { dragging: draggingId === item.id })}
              </div>
            </li>
          );
        })}
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
    position: "relative",
    display: "flex",
    alignItems: "stretch",
    gap: 4,
    borderRadius: 8,
    background: "transparent",
    cursor: "grab",
  },
  rowDragging: {
    opacity: 0.45,
    cursor: "grabbing",
  },
  insertLineTop: {
    position: "absolute",
    left: 18,
    right: 0,
    top: -3,
    height: 2,
    borderRadius: 1,
    background: "#4cc9f0",
    boxShadow: "0 0 0 1px rgba(76, 201, 240, 0.25)",
    pointerEvents: "none",
    zIndex: 2,
  },
  insertLineBottom: {
    position: "absolute",
    left: 18,
    right: 0,
    bottom: -3,
    height: 2,
    borderRadius: 1,
    background: "#4cc9f0",
    boxShadow: "0 0 0 1px rgba(76, 201, 240, 0.25)",
    pointerEvents: "none",
    zIndex: 2,
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
