import React, { createContext, useContext, useState, useEffect } from 'react';

interface CategoryContextType {
    hiddenCategories: string[];
    customCategories: string[];
    hideCategory: (name: string) => void;
    unhideCategory: (name: string) => void;
    addCustomCategory: (name: string) => void;
    removeCustomCategory: (name: string) => void;
    resetCategories: () => void;
}

const CategoryContext = createContext<CategoryContextType>({
    hiddenCategories: [],
    customCategories: [],
    hideCategory: () => { },
    unhideCategory: () => { },
    addCustomCategory: () => { },
    removeCustomCategory: () => { },
    resetCategories: () => { },
});

export const useCategories = () => useContext(CategoryContext);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hiddenCategories, setHiddenCategories] = useState<string[]>(() => {
        const saved = localStorage.getItem('hiddenCategories');
        return saved ? JSON.parse(saved) : [];
    });

    const [customCategories, setCustomCategories] = useState<string[]>(() => {
        const saved = localStorage.getItem('customCategories');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('hiddenCategories', JSON.stringify(hiddenCategories));
    }, [hiddenCategories]);

    useEffect(() => {
        localStorage.setItem('customCategories', JSON.stringify(customCategories));
    }, [customCategories]);

    const hideCategory = (name: string) => {
        if (!hiddenCategories.includes(name)) {
            setHiddenCategories(prev => [...prev, name]);
        }
    };

    const unhideCategory = (name: string) => {
        setHiddenCategories(prev => prev.filter(c => c !== name));
    };

    const addCustomCategory = (name: string) => {
        if (!customCategories.includes(name)) {
            setCustomCategories(prev => [...prev, name]);
        }
    };

    const removeCustomCategory = (name: string) => {
        setCustomCategories(prev => prev.filter(c => c !== name));
    };

    const resetCategories = () => {
        setHiddenCategories([]);
        // We don't necessarily want to delete custom categories when resetting hidden ones
    };

    return (
        <CategoryContext.Provider value={{ 
            hiddenCategories, 
            customCategories, 
            hideCategory, 
            unhideCategory, 
            addCustomCategory, 
            removeCustomCategory, 
            resetCategories 
        }}>
            {children}
        </CategoryContext.Provider>
    );
};

