import React, { useState } from 'react';
import { Plus, Trash2, Save, X, AlertCircle, Edit2 } from 'lucide-react';
import { Pill, Ingredient } from '../types';
import { generateId } from '../services/storage';

interface PillCabinetProps {
  pills: Pill[];
  onUpdatePills: (pills: Pill[]) => void;
}

const COLORS = ['#14b8a6', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

export const PillCabinet: React.FC<PillCabinetProps> = ({ pills, onUpdatePills }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', dosageMg: 0 }]);

  const handleAddIngredient = () => {
    if (ingredients.length < 3) {
      setIngredients([...ingredients, { name: '', dosageMg: 0 }]);
    }
  };

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleEditStart = (pill: Pill) => {
    setEditingId(pill.id);
    setName(pill.name);
    setColor(pill.color);
    // Deep copy ingredients to avoid mutating the pill directly during edit
    setIngredients(pill.ingredients.map(i => ({...i})));
    setIsAdding(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const validIngredients = ingredients.filter(i => i.name.trim() && i.dosageMg > 0);
    
    if (validIngredients.length === 0) {
      alert("Please add at least one valid ingredient.");
      return;
    }

    if (editingId) {
        // Update existing pill
        const updatedPills = pills.map(p => {
            if (p.id === editingId) {
                return {
                    ...p,
                    name,
                    color,
                    ingredients: validIngredients
                };
            }
            return p;
        });
        onUpdatePills(updatedPills);
    } else {
        // Add new pill
        const newPill: Pill = {
            id: generateId(),
            name,
            color,
            ingredients: validIngredients
        };
        onUpdatePills([...pills, newPill]);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this pill definition? Existing logs will keep the ID but details may be lost in display.")) {
      onUpdatePills(pills.filter(p => p.id !== id));
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName('');
    setColor(COLORS[0]);
    setIngredients([{ name: '', dosageMg: 0 }]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Medicine Cabinet</h2>
        {!isAdding && (
          <button
            onClick={() => { resetForm(); setIsAdding(true); }}
            className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition shadow-sm"
          >
            <Plus size={20} />
            <span>Add Medication</span>
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 animate-fade-in">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-slate-700">{editingId ? 'Edit Medication' : 'New Medication'}</h3>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Medication Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                placeholder="e.g. Ibuprofen"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Label Color</label>
              <div className="flex space-x-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition ${color === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-600">Ingredients (Max 3)</label>
                {ingredients.length < 3 && (
                  <button onClick={handleAddIngredient} className="text-xs text-teal-600 font-medium hover:underline">
                    + Add Ingredient
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Name (e.g. Ibuprofen)"
                      value={ing.name}
                      onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Mg"
                      value={ing.dosageMg || ''}
                      onChange={(e) => handleIngredientChange(idx, 'dosageMg', parseFloat(e.target.value))}
                      className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                    <span className="text-xs text-slate-500">mg</span>
                    {ingredients.length > 1 && (
                      <button onClick={() => handleRemoveIngredient(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleSave}
                className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 transition flex items-center space-x-2"
              >
                <Save size={18} />
                <span>{editingId ? 'Update Medication' : 'Save Medication'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pills.length === 0 && !isAdding && (
          <div className="col-span-full text-center py-12 text-slate-400 flex flex-col items-center">
            <AlertCircle size={48} className="mb-4 opacity-50" />
            <p>Your cabinet is empty. Add your first medication to get started.</p>
          </div>
        )}
        {pills.map((pill) => (
          <div key={pill.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: pill.color }}></div>
                <h3 className="font-bold text-slate-800 text-lg">{pill.name}</h3>
              </div>
              <div className="flex space-x-1">
                 <button onClick={() => handleEditStart(pill)} className="text-slate-300 hover:text-teal-600 transition p-1">
                    <Edit2 size={18} />
                 </button>
                 <button onClick={() => handleDelete(pill.id)} className="text-slate-300 hover:text-red-500 transition p-1">
                    <Trash2 size={18} />
                 </button>
              </div>
            </div>
            <div className="space-y-1">
              {pill.ingredients.map((ing, i) => (
                <div key={i} className="text-sm text-slate-600 flex justify-between border-b border-slate-50 last:border-0 py-1">
                  <span>{ing.name}</span>
                  <span className="font-mono text-slate-500">{ing.dosageMg}mg</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
