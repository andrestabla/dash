
import React from 'react';
import { ArrowDownAZ, ArrowUpAZ, Calendar, Clock, LayoutGrid, ListFilter } from 'lucide-react';

export type SortOption = 'name_asc' | 'name_desc' | 'date_new' | 'date_old' | 'custom';

interface SortControlProps {
    value: SortOption;
    onChange: (value: SortOption) => void;
}

export default function SortControl({ value, onChange }: SortControlProps) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: 8, border: '1px solid var(--border-dim)' }}>
            <button
                className={`btn-ghost ${value === 'date_new' ? 'active' : ''}`}
                onClick={() => onChange('date_new')}
                title="Más Recientes"
                style={{ padding: 6, color: value === 'date_new' ? 'var(--primary)' : 'inherit' }}
            >
                <Clock size={16} />
            </button>
            <button
                className={`btn-ghost ${value === 'date_old' ? 'active' : ''}`}
                onClick={() => onChange('date_old')}
                title="Más Antiguos"
                style={{ padding: 6, color: value === 'date_old' ? 'var(--primary)' : 'inherit' }}
            >
                <Calendar size={16} />
            </button>
            <div style={{ width: 1, height: 16, background: 'var(--border-dim)' }} />
            <button
                className={`btn-ghost ${value === 'name_asc' ? 'active' : ''}`}
                onClick={() => onChange('name_asc')}
                title="A-Z"
                style={{ padding: 6, color: value === 'name_asc' ? 'var(--primary)' : 'inherit' }}
            >
                <ArrowDownAZ size={16} />
            </button>
            <button
                className={`btn-ghost ${value === 'name_desc' ? 'active' : ''}`}
                onClick={() => onChange('name_desc')}
                title="Z-A"
                style={{ padding: 6, color: value === 'name_desc' ? 'var(--primary)' : 'inherit' }}
            >
                <ArrowUpAZ size={16} />
            </button>
            <div style={{ width: 1, height: 16, background: 'var(--border-dim)' }} />
            <button
                className={`btn-ghost ${value === 'custom' ? 'active' : ''}`}
                onClick={() => onChange('custom')}
                title="Personalizado"
                style={{ padding: 6, color: value === 'custom' ? 'var(--primary)' : 'inherit' }}
            >
                <LayoutGrid size={16} />
            </button>
        </div>
    );
}
