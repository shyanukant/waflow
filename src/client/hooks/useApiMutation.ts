import { useState } from 'react';

type MutationStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseApiMutationOptions<T> {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
}

export const useApiMutation = <T, U>(
    mutationFn: (data: U) => Promise<T>,
    options?: UseApiMutationOptions<T>
) => {
    const [status, setStatus] = useState<MutationStatus>('idle');
    const [error, setError] = useState<Error | null>(null);

    const mutate = async (data: U) => {
        setStatus('loading');
        setError(null);
        try {
            const result = await mutationFn(data);
            setStatus('success');
            if (options?.onSuccess) {
                options.onSuccess(result);
            }
            return result;
        } catch (err: any) {
            const apiError = new Error(err.response?.data?.error || err.message || 'An unknown error occurred');
            setError(apiError);
            setStatus('error');
            if (options?.onError) {
                options.onError(apiError);
            } else {
                // Default error handling
                console.error('API Mutation Error:', apiError);
                alert(apiError.message);
            }
        }
    };

    return {
        mutate,
        isLoading: status === 'loading',
        isSuccess: status === 'success',
        isError: status === 'error',
        error,
    };
};
