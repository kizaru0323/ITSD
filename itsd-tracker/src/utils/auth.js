/**
 * Auth Utility for RBAC
 */

export const getCurrentUser = () => {
    const session = sessionStorage.getItem('itsd_user');
    return session ? JSON.parse(session) : null;
};

export const hasPermission = (permissionSlug) => {
    const user = getCurrentUser();
    if (!user) return false;

    // Super admin override
    if (user.role && user.role.toUpperCase() === 'ADMIN' && (!user.permissions || user.permissions.length === 0)) {
        return true;
    }

    return user.permissions?.includes(permissionSlug);
};

export const logout = () => {
    sessionStorage.removeItem('itsd_user');
    sessionStorage.removeItem('itsd_auth_token');
    window.location.href = '/login';
};
