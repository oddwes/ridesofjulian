"use client"

import ReactSelect from 'react-select'

const selectStyles = {
  control: (base) => ({
    ...base,
    backgroundColor: '#020617',
    borderRadius: 12,
    borderColor: '#1f2937',
    minHeight: 40,
    boxShadow: 'none',
    cursor: 'pointer',
    '&:hover': {
      borderColor: '#1f2937',
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 8px',
  }),
  singleValue: (base) => ({
    ...base,
    color: '#f9fafb',
    fontWeight: 600,
  }),
  placeholder: (base) => ({
    ...base,
    color: '#9ca3af',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: '#9ca3af',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: '#020617',
    borderRadius: 12,
    border: '1px solid #1f2937',
    overflow: 'hidden',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#1e3a5f'
      : state.isFocused
      ? '#0f172a'
      : 'transparent',
    color: state.isSelected ? '#3b82f6' : '#f9fafb',
    cursor: 'pointer',
  }),
};

export const DateRangeDropdown = ({ value, options, onChange, className = 'w-30' }) => {
  return (
    <ReactSelect
      value={value}
      onChange={(option) => {
        if (option) {
          onChange(option);
        }
      }}
      options={options}
      className={className}
      styles={selectStyles}
    />
  );
};


