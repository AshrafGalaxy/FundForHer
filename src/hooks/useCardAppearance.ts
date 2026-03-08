import { useState, useEffect } from 'react';

export type CardAppearance = 'mega_plan' | 'classic';

export function useCardAppearance() {
    const [appearance, setAppearance] = useState<CardAppearance>('mega_plan');

    useEffect(() => {
        const sync = () => {
            const stored = localStorage.getItem('scholarship_card_appearance');
            if (stored === 'classic' || stored === 'mega_plan') {
                setAppearance(stored as CardAppearance);
            }
        };
        sync();
        window.addEventListener('card-appearance-changed', sync);
        return () => window.removeEventListener('card-appearance-changed', sync);
    }, []);

    const toggleAppearance = (newApp: CardAppearance) => {
        setAppearance(newApp);
        localStorage.setItem('scholarship_card_appearance', newApp);
        window.dispatchEvent(new Event('card-appearance-changed'));
    };

    return { appearance, toggleAppearance };
}
