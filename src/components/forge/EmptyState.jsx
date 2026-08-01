import { Button } from './Button';

/**
 * An empty state is an instrument. It names the missing thing and offers the
 * one or two actions that create it. No shrugging icons, no "No data found".
 */
export function EmptyState({ title, body, primary, secondary, art = true }) {
  return (
    <div className="f-empty">
      {art && <div className="f-empty__art" aria-hidden><i/><i/><i/><i/></div>}
      <h4>{title}</h4>
      {body && <p>{body}</p>}
      {(primary || secondary) && (
        <div className="mt-2 flex items-center gap-2">
          {primary   && <Button variant="primary" size="sm" {...primary} />}
          {secondary && <Button size="sm" {...secondary} />}
        </div>
      )}
    </div>
  );
}
export const Empty = EmptyState;
