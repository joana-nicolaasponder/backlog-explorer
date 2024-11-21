import { useState } from 'react';

const tagsOptions = [
  { value: 'Relaxing', label: 'Relaxing' },
  { value: 'Adventurous', label: 'Adventurous' },
  { value: 'Story-Driven', label: 'Story-Driven' },
  { value: 'Short Sessions', label: 'Short Sessions' },
];

const TagsInput = ({ selectedTags, setSelectedTags }) => {
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text">Tags</span>
      </label>
      <select
        multiple
        className="select select-bordered"
        value={selectedTags}
        onChange={(e) =>
          setSelectedTags(
            Array.from(e.target.selectedOptions, (option) => option.value)
          )
        }
      >
        {tagsOptions.map((tag) => (
          <option key={tag.value} value={tag.value}>
            {tag.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TagsInput;