import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavContextType {
    hideNav: boolean;
    setHideNav: (hide: boolean) => void;
}

const NavContext = createContext<NavContextType>({
    hideNav: false,
    setHideNav: () => { },
});

export const useNavVisibility = () => useContext(NavContext);

export function NavVisibilityProvider({ children }: { children: ReactNode }) {
    const [hideNav, setHideNav] = useState(false);

    return (
        <NavContext.Provider value={{ hideNav, setHideNav }}>
            {children}
        </NavContext.Provider>
    );
}
