type ActionDialogAction = {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  onClick: () => void;
};

export function ActionDialog({
  title,
  lines,
  actions,
}: {
  title: string;
  lines: React.ReactNode[];
  actions: ActionDialogAction[];
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="card modal-card" role="dialog" aria-modal="true" aria-labelledby="action-dialog-title">
        <h3 id="action-dialog-title">{title}</h3>
        {lines.map((line, index) => (
          <p key={index} className={index > 0 ? 'text-sm m-0' : undefined}>
            {line}
          </p>
        ))}
        <div className="row mt-1">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={`btn btn-${action.variant ?? 'secondary'}`}
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
