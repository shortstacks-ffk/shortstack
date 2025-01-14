import React from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ placeholder = 'Search for...' }) => {
  return (
    <div className="flex items-center bg-gray-50 border border-gray-300 rounded-full px-4 py-2 w-full max-w-md shadow-md">
      {/* Left Search Icon */}
      <Search className="text-gray-500 w-5 h-5 mr-3" />

      {/* Input Field */}
      <input
        type="text"
        placeholder={placeholder}
        className="bg-transparent w-full outline-none text-gray-700 placeholder-gray-400"
      />

      {/* Right Dropdown Icon */}
      <ChevronDown className="text-gray-500 w-5 h-5 ml-3" />
    </div>
  );
};

export default SearchBar;
