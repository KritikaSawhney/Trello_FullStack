'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { searchCards } from '@/lib/api';
import { Search, X, Filter, ChevronDown } from 'lucide-react';

export default function SearchFilter({ boardId, labels, members, onResults }) {
  const [q, setQ] = useState('');
  const [labelId, setLabelId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [dueFilter, setDueFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const debounceRef = useRef(null);

  const hasActiveFilter = q || labelId || memberId || dueFilter;

  const runSearch = useCallback(async (params) => {
    const { q, labelId, memberId, dueFilter } = params;
    if (!q && !labelId && !memberId && !dueFilter) {
      onResults(null);
      setIsFiltering(false);
      return;
    }
    setIsFiltering(true);
    try {
      const results = await searchCards(boardId, {
        q: q || undefined,
        label_id: labelId || undefined,
        member_id: memberId || undefined,
        due_filter: dueFilter || undefined,
      });
      onResults(results);
    } catch (err) {
      console.error(err);
    }
  }, [boardId, onResults]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch({ q, labelId, memberId, dueFilter });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [q, labelId, memberId, dueFilter, runSearch]);

  function clearAll() {
    setQ('');
    setLabelId('');
    setMemberId('');
    setDueFilter('');
    onResults(null);
    setIsFiltering(false);
  }

  return (
    <div style={{
      background: 'rgba(0,0,0,0.2)',
      backdropFilter: 'blur(4px)',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
      borderBottom: '1px solid rgba(255,255,255,0.08)'
    }}>
      {/* Search input */}
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.7)', pointerEvents: 'none' }} />
        <input
          className="search-bar"
          style={{ paddingLeft: 30 }}
          placeholder="Search cards..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      {/* Filter toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: showFilters ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)',
          border: 'none', borderRadius: 6, padding: '5px 12px',
          color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          transition: 'background 0.15s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
        onMouseLeave={e => e.currentTarget.style.background = showFilters ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)'}
      >
        <Filter size={14} />
        Filters
        {hasActiveFilter && !q && (
          <span style={{ background: '#eb5a46', borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {[labelId, memberId, dueFilter].filter(Boolean).length}
          </span>
        )}
      </button>

      {/* Filter panels */}
      {showFilters && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Label filter */}
          <select
            style={{
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 6, padding: '4px 8px', color: 'white', fontSize: 12,
              cursor: 'pointer', outline: 'none'
            }}
            value={labelId}
            onChange={e => setLabelId(e.target.value)}
          >
            <option value="" style={{ color: '#172b4d' }}>All Labels</option>
            {labels.map(l => (
              <option key={l.id} value={l.id} style={{ color: '#172b4d' }}>{l.name}</option>
            ))}
          </select>

          {/* Member filter */}
          <select
            style={{
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 6, padding: '4px 8px', color: 'white', fontSize: 12,
              cursor: 'pointer', outline: 'none'
            }}
            value={memberId}
            onChange={e => setMemberId(e.target.value)}
          >
            <option value="" style={{ color: '#172b4d' }}>All Members</option>
            {members.map(m => (
              <option key={m.id} value={m.id} style={{ color: '#172b4d' }}>{m.name}</option>
            ))}
          </select>

          {/* Due date filter */}
          <select
            style={{
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 6, padding: '4px 8px', color: 'white', fontSize: 12,
              cursor: 'pointer', outline: 'none'
            }}
            value={dueFilter}
            onChange={e => setDueFilter(e.target.value)}
          >
            <option value="" style={{ color: '#172b4d' }}>All Dates</option>
            <option value="overdue" style={{ color: '#172b4d' }}>Overdue</option>
            <option value="due_soon" style={{ color: '#172b4d' }}>Due soon (48h)</option>
            <option value="no_due" style={{ color: '#172b4d' }}>No due date</option>
          </select>
        </div>
      )}

      {/* Clear filters */}
      {hasActiveFilter && (
        <button
          onClick={clearAll}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(235,90,70,0.25)', border: '1px solid rgba(235,90,70,0.4)',
            borderRadius: 6, padding: '4px 10px', color: 'white',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(235,90,70,0.4)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(235,90,70,0.25)'}
        >
          <X size={12} /> Clear filters
        </button>
      )}

      {/* Filter indicator */}
      {isFiltering && (
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>
          Filtering active — some cards hidden
        </span>
      )}
    </div>
  );
}
