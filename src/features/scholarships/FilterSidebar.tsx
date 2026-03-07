'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { Dispatch, SetStateAction } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

type Filters = {
  search: string;
  fieldOfStudy: string[];
  eligibilityLevel: string[];
  scholarshipType: string[];
  gender: string;
  religion: string;
  location: string;
};

interface FilterSidebarProps {
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
  "Law & Legal Studies",
  "Social Sciences",
  "Computer Science & IT",
  "Vocational & Skill Development",
  "Architecture & Design",
  "Agriculture & Allied Sciences",
  "General / Open to All"
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
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

const religions = [
  "Buddhism",
  "Christian",
  "Hindu",
  "Jain",
  "Muslim",
  "Parsi",
  "Sikh"
];

export const FilterSidebar = ({
  filters,
  setFilters,
  scholarshipTypes = [],
  fieldsOfStudy = [],
  eligibilityLevels = []
}: FilterSidebarProps) => {

  // Use dynamically calculated lists from database, or fallback to the standard static arrays
  const displayCategories = fieldsOfStudy.length > 0 ? fieldsOfStudy : STANDARD_CATEGORIES;
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

  return (
    <div className="h-full flex flex-col">
      <div className="p-4">
        <h3 className="font-headline text-xl font-semibold">Filters</h3>
      </div>
      <ScrollArea className="flex-grow">
        <Accordion type="multiple" defaultValue={['class', 'gender', 'religion', 'location', 'categories']} className="w-full px-4">
          <AccordionItem value="categories">
            <AccordionTrigger className="font-semibold">Categories</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pr-4">
                {displayCategories.map(field => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox
                      id={`field-${field}`}
                      onCheckedChange={() => handleCheckboxChange('fieldOfStudy', field)}
                      checked={filters.fieldOfStudy.includes(field)}
                    />
                    <Label htmlFor={`field-${field}`} className="font-normal">{field}</Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="class">
            <AccordionTrigger className="font-semibold">Level of Study (Class)</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pr-4">
                {displayLevels.map(level => (
                  <div key={level} className="flex items-center space-x-2">
                    <Checkbox
                      id={`level-${level}`}
                      onCheckedChange={() => handleCheckboxChange('eligibilityLevel', level)}
                      checked={filters.eligibilityLevel.includes(level)}
                    />
                    <Label htmlFor={`level-${level}`} className="font-normal">{level}</Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="type">
            <AccordionTrigger className="font-semibold">Scholarship Type</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pr-4">
                {displayTypes.map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      onCheckedChange={() => handleCheckboxChange('scholarshipType', type)}
                      checked={filters.scholarshipType.includes(type)}
                    />
                    <Label htmlFor={`type-${type}`} className="font-normal">{type}</Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="gender">
            <AccordionTrigger className="font-semibold">Gender</AccordionTrigger>
            <AccordionContent>
              <RadioGroup value={filters.gender} onValueChange={(value) => handleRadioChange('gender', value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="gender-all" />
                  <Label htmlFor="gender-all" className="font-normal">All</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="gender-female" />
                  <Label htmlFor="gender-female" className="font-normal">Female</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="gender-male" />
                  <Label htmlFor="gender-male" className="font-normal">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="gender-other" />
                  <Label htmlFor="gender-other" className="font-normal">Other</Label>
                </div>
              </RadioGroup>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="religion">
            <AccordionTrigger className="font-semibold">Religion</AccordionTrigger>
            <AccordionContent>
              <RadioGroup value={filters.religion} onValueChange={(value) => handleRadioChange('religion', value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="religion-all" />
                  <Label htmlFor="religion-all" className="font-normal">Any Religion</Label>
                </div>
                {religions.map(r => (
                  <div key={r} className="flex items-center space-x-2">
                    <RadioGroupItem value={r.toLowerCase()} id={`religion-${r.toLowerCase()}`} />
                    <Label htmlFor={`religion-${r.toLowerCase()}`} className="font-normal">{r}</Label>
                  </div>
                ))}
              </RadioGroup>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="location">
            <AccordionTrigger className="font-semibold">Location</AccordionTrigger>
            <AccordionContent>
              <Select value={filters.location} onValueChange={(value) => handleRadioChange('location', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-64">
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="india">All India</SelectItem>
                    <SelectItem value="abroad">Abroad</SelectItem>
                    {indianStates.map(state => (
                      <SelectItem key={state} value={state.toLowerCase()}>{state}</SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </ScrollArea>
    </div>
  );
};
