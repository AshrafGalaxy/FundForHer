import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SidebarState = 'expanded' | 'collapsed' | 'hidden';

interface NavigationStore {
    sidebarState: SidebarState;
    setSidebarState: (state: SidebarState) => void;
    cycleSidebarState: () => void;
}

export const useNavigationStore = create<NavigationStore>()(
    persist(
        (set, get) => ({
            sidebarState: 'expanded',
            setSidebarState: (state) => set({ sidebarState: state }),
            cycleSidebarState: () => {
                const current = get().sidebarState;
                if (current === 'expanded') set({ sidebarState: 'collapsed' });
                else if (current === 'collapsed') set({ sidebarState: 'hidden' });
                else set({ sidebarState: 'expanded' });
            },
        }),
        {
            name: 'fha-navigation-storage',
        }
    )
);
