import React, { createContext, useContext, useState, useEffect } from 'react';

interface TravelContextType {
    isTravelModeActive: boolean;
    toggleTravelMode: () => void;
    travelEventName: string;
    setTravelEventName: (name: string) => void;
}

const TravelContext = createContext<TravelContextType>({
    isTravelModeActive: false,
    toggleTravelMode: () => { },
    travelEventName: '',
    setTravelEventName: () => { },
});

export const useTravelMode = () => useContext(TravelContext);

export const TravelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isTravelModeActive, setIsTravelModeActive] = useState(() => {
        const saved = localStorage.getItem('travelModeActive');
        return saved === 'true';
    });

    const [travelEventName, setTravelEventName] = useState(() => {
        return localStorage.getItem('travelEventName') || 'Viagem';
    });

    useEffect(() => {
        localStorage.setItem('travelModeActive', String(isTravelModeActive));
    }, [isTravelModeActive]);

    useEffect(() => {
        localStorage.setItem('travelEventName', travelEventName);
    }, [travelEventName]);

    const toggleTravelMode = () => {
        setIsTravelModeActive(prev => !prev);
    };

    return (
        <TravelContext.Provider value={{ isTravelModeActive, toggleTravelMode, travelEventName, setTravelEventName }}>
            {children}
        </TravelContext.Provider>
    );
};
