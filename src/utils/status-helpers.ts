/**
 * Maps a status string to a Tailwind CSS color class.
 * Supports various status formats (uppercase, lowercase, etc.)
 */
export function getStatusColor(status?: string, darkMode: boolean = false): string {
    if (!status) return darkMode ? 'text-gray-400' : 'text-gray-500';

    const normalized = status.toLowerCase();

    if (normalized.includes('high') || normalized.includes('critical') || normalized.includes('abnormal') || normalized === 'failed') {
        return darkMode ? 'text-red-400' : 'text-red-600';
    }

    if (normalized.includes('low') || normalized.includes('moderate') || normalized === 'pending') {
        return darkMode ? 'text-amber-400' : 'text-amber-600';
    }

    if (normalized.includes('normal') || normalized === 'completed' || normalized === 'validated') {
        return darkMode ? 'text-emerald-400' : 'text-emerald-600';
    }

    if (normalized === 'processing') {
        return darkMode ? 'text-blue-400' : 'text-blue-600';
    }

    return darkMode ? 'text-gray-400' : 'text-gray-600';
}

/**
 * Maps a status string to a background color class (badge style).
 */
export function getStatusBadgeClass(status?: string, darkMode: boolean = false): string {
    if (!status) return darkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-800 border-gray-200';

    const normalized = status.toLowerCase();

    if (normalized.includes('high') || normalized.includes('critical') || normalized.includes('abnormal') || normalized === 'failed') {
        return darkMode
            ? 'bg-red-950/50 text-red-300 border-red-800'
            : 'bg-red-100 text-red-800 border-red-200';
    }

    if (normalized.includes('low') || normalized.includes('moderate') || normalized === 'pending') {
        return darkMode
            ? 'bg-amber-950/50 text-amber-300 border-amber-800'
            : 'bg-amber-100 text-amber-800 border-amber-200';
    }

    if (normalized.includes('normal') || normalized === 'completed' || normalized === 'validated') {
        return darkMode
            ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800'
            : 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }

    if (normalized === 'processing') {
        return darkMode
            ? 'bg-blue-950/50 text-blue-300 border-blue-800'
            : 'bg-blue-100 text-blue-800 border-blue-200';
    }

    return darkMode
        ? 'bg-gray-800 text-gray-300 border-gray-700'
        : 'bg-gray-100 text-gray-800 border-gray-200';
}

/**
 * Returns a human-readable label for a status.
 */
export function getStatusLabel(status?: string): string {
    if (!status) return 'Unknown';

    // Capitalize first letter
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}
