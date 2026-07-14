import { useState, useMemo, useEffect, Dispatch, SetStateAction } from 'react';
import {
    useQuery,
    useMutation,
    useQueryClient,
    UseMutationResult,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface PaginationInfo {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface FetchResponse<T> {
    data: T[];
    pagination: PaginationInfo;
}

interface EntityListOptions<T> {
    entityKey: string;
    fetchFn: (params: Record<string, unknown>) => Promise<{ data: FetchResponse<T> }>;
    createFn: (data: unknown) => Promise<unknown>;
    deleteFn: (id: string | number) => Promise<unknown>;
    initialFilters?: Record<string, unknown>;
    perPage?: number;
}

interface EntityListReturn<T> {
    data: T[];
    pagination: PaginationInfo;
    isLoading: boolean;
    isError: boolean;
    search: string;
    setSearch: Dispatch<SetStateAction<string>>;
    filters: Record<string, unknown>;
    setFilters: Dispatch<SetStateAction<Record<string, unknown>>>;
    page: number;
    setPage: Dispatch<SetStateAction<number>>;
    createMutation: UseMutationResult<unknown, Error, unknown, unknown>;
    deleteMutation: UseMutationResult<unknown, Error, string | number, unknown>;
    refetch: () => void;
}

export function useEntityList<T>({
    entityKey,
    fetchFn,
    createFn,
    deleteFn,
    initialFilters = {},
    perPage = 20,
}: EntityListOptions<T>): EntityListReturn<T> {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState(initialFilters.search as string || '');
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [filters, setFilters] = useState<Record<string, unknown>>(initialFilters);
    const [page, setPage] = useState(1);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const queryParams = useMemo(() => {
        return {
            page,
            limit: perPage,
            search: debouncedSearch,
            ...filters,
        };
    }, [page, perPage, debouncedSearch, filters]);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [entityKey, queryParams],
        queryFn: () => fetchFn(queryParams).then((res) => res.data),
    });

    const createMutation = useMutation({
        mutationFn: createFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [entityKey] });
            toast.success(
                `${entityKey.charAt(0).toUpperCase() + entityKey.slice(1, -1)} created successfully`,
            );
        },
        onError: (err: Error) => {
            const error = err as { response?: { data?: { error?: string } } };
            toast.error(error.response?.data?.error || `Failed to create ${entityKey.slice(0, -1)}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [entityKey] });
            toast.success(`${entityKey.charAt(0).toUpperCase() + entityKey.slice(1, -1)} deleted`);
        },
        onError: (err: Error) => {
            const error = err as { response?: { data?: { error?: string } } };
            toast.error(error.response?.data?.error || `Failed to delete ${entityKey.slice(0, -1)}`);
        },
    });

    return {
        data: data?.data || ([] as T[]),
        pagination: data?.pagination || { total: 0, page: 1, limit: perPage, totalPages: 1 },
        isLoading,
        isError,
        search,
        setSearch,
        filters,
        setFilters,
        page,
        setPage,
        createMutation,
        deleteMutation,
        refetch,
    };
}
