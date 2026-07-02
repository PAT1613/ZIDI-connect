import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { ListParams, Paginated } from '../api/types';
import { PAGE_SIZE } from '../lib/constants';
import { useDebounce } from './useDebounce';

interface UseListQueryOptions {
  extraParams?: ListParams;
}

export function useListQuery<T>(
  key: QueryKey,
  fetcher: (params: ListParams) => Promise<Paginated<T>>,
  { extraParams }: UseListQueryOptions = {},
) {
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState<string>('');
  const debouncedSearch = useDebounce(search, 350);

  const baseParams = useMemo<ListParams>(
    () => ({
      page_size: PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(ordering ? { ordering } : {}),
      ...(extraParams || {}),
    }),
    [debouncedSearch, ordering, extraParams],
  );

  const query = useInfiniteQuery({
    queryKey: [...(key as unknown[]), baseParams],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetcher({ ...baseParams, page: pageParam as number }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.next) return undefined;
      return allPages.length + 1;
    },
  });

  const rows = useMemo<T[]>(
    () => query.data?.pages.flatMap((p) => p.results) ?? [],
    [query.data],
  );

  return {
    rows,
    total: query.data?.pages[0]?.count ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
    error: query.error,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: query.refetch,
    search,
    setSearch,
    ordering,
    setOrdering,
  };
}
