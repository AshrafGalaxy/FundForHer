'use client';

import { Dispatch, SetStateAction, useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, ChevronRight, X, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type Filters = {
    search: string;
    fieldOfStudy: string[];
    eligibilityLevel: string[];
    scholarshipType: string[];
    gender: string;
    religion: string;
    location: string;
    sortBy: 'deadline_asc' | 'deadline_desc' | 'default';
};

interface TopFilterBarProps {
    filters: Filters;
    setFilters: Dispatch<SetStateAction<Filters>>;
    fieldsOfStudy?: string[];
    eligibilityLevels?: string[];
    scholarshipTypes?: string[];
}

const STANDARD_CATEGORIES = [
    "Engineering & Technology",
    "Medical & Healthcare",
    "Science & Mathematics",
    "Arts & Humanities",
    "Commerce & Business",
    "Computer Science & IT",
    "Vocational & Skill Development",
    "Agriculture & Allied Sciences",
    "Law & Legal Studies",
];

const STANDARD_LEVELS = [
    "Primary / Middle School (Class 1-8)",
    "Secondary School (Class 9-10)",
    "Higher Secondary (Class 11-12)",
    "Undergraduate (Bachelor's)",
    "Postgraduate (Master's)",
    "Ph.D. / Research",
    "Diploma / Polytechnic",
    "Any Level"
];

const STANDARD_TYPES = [
    "Merit-based",
    "Means-based",
    "Need-based",
    "Sports-based",
    "Special Needs"
];

const indianStates = [
    "Andhra Pradesh", "Assam", "Bihar", "Delhi", "Gujarat", "Haryana", "Karnataka", "Kerala", "Maharashtra", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"
];

const religions = [
    "Buddhism", "Christian", "Hindu", "Jain", "Muslim", "Parsi", "Sikh"
];

export function TopFilterBar({
    filters,
    setFilters,
    scholarshipTypes = [],
    fieldsOfStudy = [],
    eligibilityLevels = []
}: TopFilterBarProps) {

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const displayCategories = fieldsOfStudy.length > 0 ? fieldsOfStudy : STANDARD_CATEGORIES;
    const popularCategories = displayCategories.slice(0, 6); // First 6 categories as "most used"
    const displayLevels = eligibilityLevels.length > 0 ? eligibilityLevels : STANDARD_LEVELS;
    const displayTypes = scholarshipTypes.length > 0 ? scholarshipTypes : STANDARD_TYPES;

    const handleCheckboxChange = (category: keyof Omit<Filters, 'gender' | 'religion' | 'location' | 'search'>, value: string) => {
        setFilters(prev => {
            const list = prev[category] as string[];
            const newList = list.includes(value) ? list.filter(item => item !== value) : [...list, value];
            return { ...prev, [category]: newList };
        });
    };

    const handleRadioChange = (category: keyof Filters, value: string) => {
        setFilters(prev => ({ ...prev, [category]: value }));
    }

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 250;
            scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

    useEffect(() => {
        handleScroll(); // Check initial state
    }, [popularCategories]);

    // Count active advanced filters
    const activeAdvancedFilterCount =
        filters.fieldOfStudy.length +
        filters.eligibilityLevel.length +
        filters.scholarshipType.length +
        (filters.gender !== 'all' ? 1 : 0) +
        (filters.religion !== 'all' ? 1 : 0) +
        (filters.location !== 'all' ? 1 : 0);

    return (
        <>
            <div className="sticky top-16 z-20 bg-background/95 backdrop-blur-md py-4 px-4 sm:px-6 w-full border-b border-border shadow-sm">
                {/* Search and Advanced Filters Row */}
                {/* Added left padding to prevent overlap with the global sidebar toggle button */}
                <div className="flex items-center justify-center gap-3 w-full max-w-4xl mx-auto pl-10 md:pl-12 lg:pl-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search scholarships..."
                            className="w-full rounded-full bg-secondary/50 hover:bg-secondary pl-10 h-11 border-border transition-colors focus-visible:ring-primary/50"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                        {filters.search && (
                            <button onClick={() => setFilters(prev => ({ ...prev, search: '' }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="h-11 px-4 rounded-full border-border bg-card hover:bg-secondary transition-colors shrink-0 shadow-sm relative">
                                <SlidersHorizontal className="h-5 w-5 mr-2" />
                                <span className="hidden sm:inline-block font-medium">More Filters</span>
                                {activeAdvancedFilterCount > 0 && (
                                    <Badge variant="default" className="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 flex items-center justify-center flex-shrink-0 text-[10px] animate-in zoom-in">
                                        {activeAdvancedFilterCount}
                                    </Badge>
                                )}
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-full sm:w-[400px] flex flex-col h-full bg-card p-0 border-l border-border">
                            <div className="p-6 border-b bg-muted/20">
                                <SheetHeader>
                                    <SheetTitle className="font-headline text-2xl flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary" /> Advanced Filters</SheetTitle>
                                    <SheetDescription>Refine your search to find the perfect match.</SheetDescription>
                                </SheetHeader>
                            </div>

                            <ScrollArea className="flex-1 p-6">
                                <div className="space-y-8 pb-12">

                                    {/* Global Field of Study / Category */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Field of Study</h4>
                                        <div className="space-y-3">
                                            {displayCategories.map(field => (
                                                <div key={field} className="flex items-center space-x-3">
                                                    <Checkbox
                                                        id={`field-${field}`}
                                                        className="h-5 w-5 rounded-sm border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                                        onCheckedChange={() => handleCheckboxChange('fieldOfStudy', field)}
                                                        checked={filters.fieldOfStudy.includes(field)}
                                                    />
                                                    <Label htmlFor={`field-${field}`} className="font-medium text-sm cursor-pointer">{field}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Eligibility Level */}
                                    <div className="space-y-4 pt-4 border-t border-border/50">
                                        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Level of Study</h4>
                                        <div className="space-y-3">
                                            {displayLevels.map(level => (
                                                <div key={level} className="flex items-center space-x-3">
                                                    <Checkbox
                                                        id={`level-${level}`}
                                                        className="h-5 w-5 rounded-sm border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                                        onCheckedChange={() => handleCheckboxChange('eligibilityLevel', level)}
                                                        checked={filters.eligibilityLevel.includes(level)}
                                                    />
                                                    <Label htmlFor={`level-${level}`} className="font-medium text-sm cursor-pointer">{level}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Scholarship Type */}
                                    <div className="space-y-4 pt-4 border-t border-border/50">
                                        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Scholarship Type</h4>
                                        <div className="space-y-3">
                                            {displayTypes.map(type => (
                                                <div key={type} className="flex items-center space-x-3">
                                                    <Checkbox
                                                        id={`type-${type}`}
                                                        className="h-5 w-5 rounded-sm border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                                        onCheckedChange={() => handleCheckboxChange('scholarshipType', type)}
                                                        checked={filters.scholarshipType.includes(type)}
                                                    />
                                                    <Label htmlFor={`type-${type}`} className="font-medium text-sm cursor-pointer">{type}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div className="space-y-4 pt-4 border-t border-border/50">
                                        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Location</h4>
                                        <Select value={filters.location} onValueChange={(value) => handleRadioChange('location', value)}>
                                            <SelectTrigger className="w-full h-11 bg-secondary/30">
                                                <SelectValue placeholder="Select Location" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <ScrollArea className="h-[250px]">
                                                    <SelectItem value="all">All Locations</SelectItem>
                                                    <SelectItem value="india">All India</SelectItem>
                                                    <SelectItem value="abroad">Abroad</SelectItem>
                                                    {indianStates.map(state => (
                                                        <SelectItem key={state} value={state.toLowerCase()}>{state}</SelectItem>
                                                    ))}
                                                </ScrollArea>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Sort By */}
                                    <div className="space-y-4 pt-4 border-t border-border/50">
                                        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Sort By</h4>
                                        <RadioGroup value={filters.sortBy} onValueChange={(value) => handleRadioChange('sortBy', value)}>
                                            <div className="flex items-center space-x-3 mb-2">
                                                <RadioGroupItem value="default" id="sort-default" />
                                                <Label htmlFor="sort-default" className="cursor-pointer">Default (Recommended)</Label>
                                            </div>
                                            <div className="flex items-center space-x-3 mb-2">
                                                <RadioGroupItem value="deadline_asc" id="sort-deadline-asc" />
                                                <Label htmlFor="sort-deadline-asc" className="cursor-pointer">Deadline: Closing Soon</Label>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <RadioGroupItem value="deadline_desc" id="sort-deadline-desc" />
                                                <Label htmlFor="sort-deadline-desc" className="cursor-pointer">Deadline: Latest</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {/* Demographics (Gender & Religion) */}
                                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border/50">
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Gender</h4>
                                            <RadioGroup value={filters.gender} onValueChange={(value) => handleRadioChange('gender', value)} className="space-y-2">
                                                {['all', 'female', 'male', 'other'].map(g => (
                                                    <div key={g} className="flex items-center space-x-2">
                                                        <RadioGroupItem value={g} id={`gender-${g}`} />
                                                        <Label htmlFor={`gender-${g}`} className="font-normal capitalize">{g}</Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        </div>
                                        <div className="space-y-4 border-l pl-6 border-border/50">
                                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Religion</h4>
                                            <RadioGroup value={filters.religion} onValueChange={(value) => handleRadioChange('religion', value)} className="space-y-2">
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="all" id="religion-all" />
                                                    <Label htmlFor="religion-all" className="font-normal">Any</Label>
                                                </div>
                                                {religions.map(r => (
                                                    <div key={r} className="flex items-center space-x-2">
                                                        <RadioGroupItem value={r.toLowerCase()} id={`religion-${r.toLowerCase()}`} />
                                                        <Label htmlFor={`religion-${r.toLowerCase()}`} className="font-normal">{r}</Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        </div>
                                    </div>

                                </div>
                            </ScrollArea>
                            <div className="p-4 border-t bg-card mt-auto flex gap-3">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => setFilters(prev => ({ ...prev, eligibilityLevel: [], scholarshipType: [], gender: 'all', religion: 'all', location: 'all' }))}
                                >
                                    Clear All
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            {/* Horizontal Scrolling Popular Category Chips */}
            <div className="bg-background px-4 sm:px-6 py-3 border-b">
                <div className="relative group flex items-center">
                    {canScrollLeft && (
                        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none flex items-center justify-start">
                            <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-md pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity -ml-2" onClick={() => scroll('left')}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    <div
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 w-full"
                    >
                        {popularCategories.map(field => {
                            const isSelected = filters.fieldOfStudy.includes(field);
                            return (
                                <Button
                                    key={field}
                                    variant={isSelected ? "default" : "outline"}
                                    className={cn(
                                        "rounded-full h-8 shrink-0 px-4 text-xs font-semibold whitespace-nowrap transition-colors",
                                        isSelected ? "bg-theme-600 hover:bg-theme-700 text-white border-transparent" : "bg-card hover:bg-muted text-muted-foreground border-border"
                                    )}
                                    onClick={() => handleCheckboxChange('fieldOfStudy', field)}
                                >
                                    {field}
                                </Button>
                            );
                        })}
                    </div>

                    {canScrollRight && (
                        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none flex items-center justify-end">
                            <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-md pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity -mr-2" onClick={() => scroll('right')}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
