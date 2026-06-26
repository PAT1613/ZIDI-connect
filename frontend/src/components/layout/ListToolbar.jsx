import { Search } from 'lucide-react';
import Input from '../ui/Input';

export default function ListToolbar({ search, onSearchChange, placeholder = 'Search…', extras, right }) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-8"
            placeholder={placeholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {extras}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}
