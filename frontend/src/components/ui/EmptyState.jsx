import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-slate-100 p-3 text-slate-500">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mt-1 text-xs text-slate-500 max-w-sm">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
