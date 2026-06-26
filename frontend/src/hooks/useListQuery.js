import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';
import { PAGE_SIZE } from '../lib/constants';

export function useListQuery(key, fetcher, { extraParams } = {}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const params = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(ordering ? { ordering } : {}),
      ...(extraParams || {}),
    }),
    [page, debouncedSearch, ordering, extraParams],
  );

  const query = useQuery({
    queryKey: [...key, params],
    queryFn: () => fetcher(params),
    placeholderData: (prev) => prev,
  });

  return {
    rows: query.data?.results || [],
    total: query.data?.count || 0,
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.error,
    page,
    setPage,
    search,
    setSearch: (v) => {
      setSearch(v);
      setPage(1);
    },
    ordering,
    setOrdering: (v) => {
      setOrdering(v);
      setPage(1);
    },
    refetch: query.refetch,
  };
}
