import { Segmented } from './Segmented';
// Backward-compatible Tabs — delegates to Segmented
export function Tabs({ value, onValueChange, options, children }) {
  if (options) {
    return <Segmented value={value} onChange={onValueChange} options={options} />;
  }
  // For children-based tabs, render as simple segmented buttons
  return <div className="flex gap-1 border-b border-line">{children}</div>;
}
export { Tabs as default };
