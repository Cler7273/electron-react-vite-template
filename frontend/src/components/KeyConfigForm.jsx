// frontend/src/components/KeyConfigForm.jsx
import React, { useState } from 'react';

// A simple reusable input component.
const FormInput = ({ label, value, onChange }) => (
  <label className="block">
    <span className="text-gray-700">{label}</span>
    <input type="text" value={value} onChange={onChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
  </label>
);

// A component for a list of values that can be added/removed.
const DynamicListInput = ({ label, items, setItems }) => {
  const handleItemChange = (index, value) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };
  const addItem = () => setItems([...items, '']);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  return (
    <div>
      <h3 className="text-lg font-medium">{label}</h3>
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2 mt-2">
          <input type="text" value={item} onChange={(e) => handleItemChange(index, e.target.value)} className="flex-grow rounded-md border-gray-300 shadow-sm" />
          <button onClick={() => removeItem(index)} className="px-2 py-1 bg-red-500 text-white rounded">-</button>
        </div>
      ))}
      <button onClick={addItem} className="mt-2 px-2 py-1 bg-green-500 text-white rounded">+</button>
    </div>
  );
};

function KeyConfigForm({ initialData, onSave, onCancel }) {
  const [key, setKey] = useState(initialData || {});

  const handleChange = (field) => (e) => {
    setKey({ ...key, [field]: e.target.value });
  };
  
  const handleListChange = (field) => (items) => {
    setKey({ ...key, [field]: items });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, perform validation here using a library like Zod.
    onSave(key);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-md space-y-4">
      <h2 className="text-xl font-bold">{key._id ? 'Edit Key' : 'Create New Key'}</h2>
      <FormInput label="Key Name" value={key.name || ''} onChange={handleChange('name')} />
      <FormInput label="Degree (d)" value={key.d || ''} onChange={handleChange('d')} />
      <FormInput label="Min Bound" value={key.minBound || '32'} onChange={handleChange('minBound')} />
      <FormInput label="Max Bound" value={key.maxBound || '126'} onChange={handleChange('maxBound')} />
      <DynamicListInput label="Start Values (starts)" items={key.starts || []} setItems={handleListChange('starts')} />
      <DynamicListInput label="Operations (I)" items={key.I || []} setItems={handleListChange('I')} />
      <DynamicListInput label="Transformation (TC)" items={key.TC || []} setItems={handleListChange('TC')} />
      <div className="flex justify-end space-x-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
      </div>
    </form>
  );
}

export default KeyConfigForm;    