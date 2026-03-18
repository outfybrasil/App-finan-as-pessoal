import { useState, useEffect } from 'react';
import { account } from '../lib/appwrite';
import { Models } from 'appwrite';

export const useAuth = () => {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const session = await account.get();
            setUser(session);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async () => {
        // Implement redirect to OAuth or logic here if needed,
        // usually handled by Auth component calling account.createOAuth2Session
    };

    const logout = async () => {
        try {
            await account.deleteSession('current');
            setUser(null);
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return { user, loading, logout, checkUser };
};
