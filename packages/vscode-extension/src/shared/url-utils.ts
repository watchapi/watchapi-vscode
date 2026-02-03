export const buildFullUrl = (
    path: string,
    query: Record<string, string>,
): string => {
    const queryString = Object.entries(query)
        .map(
            ([key, value]) =>
                `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
        )
        .join("&");
    return queryString ? `${path}?${queryString}` : path;
};
