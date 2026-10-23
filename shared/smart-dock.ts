export interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
export function overlaps(a: Rect, b: Rect, margin = 8) {
  return (
    a.left < b.right + margin &&
    a.right > b.left - margin &&
    a.top < b.bottom + margin &&
    a.bottom > b.top - margin
  );
}
export function dockVisible(input: {
  width: number;
  modal: boolean;
  editing: boolean;
  keyboard: boolean;
  obstacles: Rect[];
  dock: Rect;
}) {
  return (
    input.width <= 768 &&
    !input.modal &&
    !input.editing &&
    !input.keyboard &&
    !input.obstacles.some((rect) => overlaps(rect, input.dock))
  );
}
